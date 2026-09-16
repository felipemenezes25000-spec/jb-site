"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Order, PaymentMethod } from "@prisma/client";

import {
  autenticarCliente,
  bloqueadoPorTentativas,
  criarSessaoCliente,
  hashSenhaCliente,
  sessaoCliente,
} from "@/lib/auth-cliente";
import {
  calcularTotais,
  fundirCarrinhoNoLogin,
  lerCarrinho,
  type CarrinhoCompleto,
} from "@/lib/carrinho";
import {
  calcularFreteDePedido,
  freteDeRetirada,
  paraExibicao,
  type Frete,
  type FreteExibido,
} from "@/lib/frete";
import {
  calcularParcelas,
  cnpjValido,
  cpfValido,
  paraCentavos,
  somenteDigitos,
} from "@/lib/format";
import { chaveDeIp, checarLimite, segundosDeEspera } from "@/lib/limite";
import { liberarAcompanhamento, pedidosDoNavegador } from "@/lib/acompanhamento";
import { formatarTelefone } from "@/lib/format";
import { enfileirar } from "@/lib/notificacoes";
import { provedorPagamento } from "@/lib/pagamento";
import {
  confirmarPagamento,
  criarPedido,
  ErroDeEstoque,
  ErroDeItemIndisponivel,
} from "@/lib/pedido";
import { prisma } from "@/lib/prisma";
import { ipDoPedido } from "@/lib/seguranca";
import { getSettings } from "@/lib/settings";

export type EstadoCheckout = { erro?: string; campo?: string; ok?: boolean };

/** Resposta de `consultarFrete` — a tela mostra, o servidor decide. */
export type RespostaFrete = { erro?: string; frete?: FreteExibido };

/* ------------------------------------------- acompanhamento sem sessão */

/**
 * Sessão dona do pedido ou cookie assinado. Nada mais abre a porta.
 *
 * O cookie e a assinatura vivem em `@/lib/acompanhamento`, compartilhados com
 * a página do pedido — enquanto eram duas cópias do mesmo formato, manter as
 * duas de acordo dependia de um comentário pedindo cuidado.
 */
async function temAcessoAoPedido(pedido: Pick<Order, "number" | "customerId">) {
  const sessao = await sessaoCliente();
  if (sessao && pedido.customerId === sessao.id) return true;

  return (await pedidosDoNavegador()).includes(pedido.number);
}

const esquema = z
  .object({
    nome: z.string().trim().min(3, "Informe o nome completo."),
    email: z.email("E-mail inválido."),
    telefone: z.string().trim().min(10, "Informe o telefone com DDD."),
    tipoPessoa: z.enum(["fisica", "juridica"]),
    documento: z.string().trim().min(11, "Informe o CPF ou CNPJ."),
    razaoSocial: z.string().trim().default(""),

    entrega: z.enum(["retirada", "entrega"]),
    cep: z.string().trim().default(""),
    logradouro: z.string().trim().default(""),
    numero: z.string().trim().default(""),
    complemento: z.string().trim().default(""),
    bairro: z.string().trim().default(""),
    cidade: z.string().trim().default(""),
    uf: z.string().trim().default(""),
    referencia: z.string().trim().default(""),

    metodo: z.enum(["pix", "cartao", "boleto"]),
    parcelas: z.coerce.number().int().min(1).max(12).default(1),
    tokenCartao: z.string().trim().default(""),
    bandeira: z.string().trim().default(""),

    observacao: z.string().trim().max(1000).default(""),

    /*
     * Como esta pessoa se identifica.
     *
     * Só é lido quando NÃO existe sessão. Com sessão válida, a identidade é a
     * do cookie e este campo é ignorado — um campo de formulário não escolhe
     * o titular de um pedido.
     */
    modoAcesso: z.enum(["criar", "entrar"]).default("criar"),
    senha: z.string().default(""),
    novidades: z.coerce.boolean().default(false),
  })
  .superRefine((dados, ctx) => {
    const doc = somenteDigitos(dados.documento);
    const valido = dados.tipoPessoa === "fisica" ? cpfValido(doc) : cnpjValido(doc);
    if (!valido) {
      ctx.addIssue({
        code: "custom",
        path: ["documento"],
        message: dados.tipoPessoa === "fisica" ? "CPF inválido." : "CNPJ inválido.",
      });
    }

    if (dados.entrega === "entrega") {
      for (const campo of ["cep", "logradouro", "numero", "bairro", "cidade", "uf"] as const) {
        if (!dados[campo]) {
          ctx.addIssue({ code: "custom", path: [campo], message: "Campo obrigatório." });
        }
      }
    }

    /*
     * A senha é conferida aqui apenas no formato. Se ela é obrigatória depende
     * de haver sessão, e isso o esquema não sabe — quem decide é
     * `garantirCompradorAutenticado`, no servidor, onde a sessão existe.
     *
     * O mínimo de 8 vale só para senha NOVA. Ao entrar, senha curta é senha
     * errada, e a resposta a isso é a do login, não a da política de cadastro:
     * dizer "a senha precisa de 8 caracteres" a quem está entrando revelaria
     * que a senha guardada tem outro tamanho.
     */
    if (dados.modoAcesso === "criar" && dados.senha.length > 0 && dados.senha.length < 8) {
      ctx.addIssue({
        code: "custom",
        path: ["senha"],
        message: "A senha precisa de ao menos 8 caracteres.",
      });
    }
  });

/* ------------------------------------------------------------------ frete */

/**
 * Produtos do carrinho que exigem transporte.
 *
 * Serviço não viaja, adicional viaja junto do produto pai, e item despublicado
 * não entra no pedido — nenhum dos três pode puxar o frete para cima.
 */
function produtosParaFrete(carrinho: CarrinhoCompleto): string[] {
  return carrinho.items.flatMap((item) =>
    !item.parentId && item.productId && item.product?.status === "active" ? [item.productId] : [],
  );
}

/**
 * Frete deste carrinho para este CEP.
 *
 * O CEP é a única coisa que vem do formulário. Preço, prazo e faixa saem da
 * tabela cadastrada em /admin/frete; o navegador não tem como propor valor.
 */
async function freteDoCarrinho(carrinho: CarrinhoCompleto, cep: string): Promise<Frete> {
  const totais = calcularTotais(carrinho);
  return calcularFreteDePedido({
    cep,
    // o mínimo do frete grátis vale sobre o que a pessoa efetivamente paga
    // pelos itens: com cupom aplicado, é este o valor da compra
    subtotalCents: Math.max(0, totais.subtotalCents - totais.descontoCents),
    produtoIds: produtosParaFrete(carrinho),
  });
}

/**
 * Prévia do frete para a etapa de entrega.
 *
 * Existe para a tela poder mostrar valor e prazo assim que o CEP fica
 * completo. O que ela devolve é informativo: quem cobra é `finalizarCompra`,
 * que refaz esta mesma conta no fechamento.
 *
 * Só lê o carrinho deste navegador e a tabela de frete, que é pública na
 * página /entrega. Mesmo assim vai com freio por IP: sem ele, este endpoint
 * seria uma sonda barata para varrer a tabela de zonas CEP a CEP.
 */
export async function consultarFrete(cepBruto: string): Promise<RespostaFrete> {
  const cep = somenteDigitos(typeof cepBruto === "string" ? cepBruto : "");
  if (cep.length !== 8) return { erro: "Informe o CEP com 8 dígitos." };

  const { ok, esperaMs } = checarLimite(
    chaveDeIp(ipDoPedido(await headers()), "/checkout/frete"),
    { limite: 40, janelaMs: 60_000 },
  );
  if (!ok) {
    return {
      erro: `Muitas consultas de CEP seguidas. Tente de novo em ${segundosDeEspera(esperaMs)}s.`,
    };
  }

  const carrinho = await lerCarrinho();
  if (!carrinho || carrinho.items.length === 0) return { erro: "Seu carrinho está vazio." };

  return { frete: paraExibicao(await freteDoCarrinho(carrinho, cep)) };
}

/**
 * Fecha o pedido.
 *
 * O total é recalculado no servidor a partir do carrinho — o formulário não
 * envia preço nenhum. Só depois do pedido criado é que a cobrança é aberta no
 * provedor, e o estado do pagamento nunca vem do navegador.
 */
/* ------------------------------------------------- identidade do comprador */

/** Mesma frase para e-mail já cadastrado e para colisão na gravação. */
const CONTA_NAO_CRIADA =
  "Não foi possível criar a conta com este e-mail. Se você já tem cadastro na JB, entre com " +
  "sua senha nesta mesma tela ou peça a redefinição.";

function ehChaveDuplicada(erro: unknown) {
  return (
    typeof erro === "object" &&
    erro !== null &&
    "code" in erro &&
    (erro as { code?: unknown }).code === "P2002"
  );
}

type Identidade =
  | { ok: true; customerId: string; entrou: boolean }
  | { ok: false; estado: EstadoCheckout };

/**
 * Quem está comprando — e a garantia de que existe alguém.
 *
 * Esta é a fronteira onde a exigência de conta vale. Ela fica aqui, e não
 * dentro de `criarPedido`, porque `criarPedido` também serve à conversão de
 * orçamento comercial pela equipe e a pedidos que nascem no painel: exigir
 * sessão de cliente lá dentro quebraria fluxos legítimos que nunca tiveram
 * uma. O checkout público é que precisa de titular autenticado.
 *
 * Três caminhos, e só três:
 *
 *   sessão válida  →  a identidade é a do cookie. O formulário não escolhe
 *                     titular; `modoAcesso` e `senha` são ignorados.
 *   entrar         →  autentica com a senha, pelo mesmo caminho de /entrar,
 *                     com o mesmo freio de tentativas.
 *   criar          →  cria a conta com prova de posse da senha nova. E-mail já
 *                     cadastrado é recusado sem confirmar que existe.
 *
 * Não existe quarto caminho. Digitar um e-mail alheio não vincula pedido a
 * conta nenhuma, e um cadastro legado sem senha continua exigindo a
 * recuperação por e-mail para virar acesso — `autenticarCliente` recusa
 * `passwordHash` nulo, e criar por cima esbarra na unicidade.
 */
async function garantirCompradorAutenticado(
  dados: z.infer<typeof esquema>,
): Promise<Identidade> {
  const sessao = await sessaoCliente();

  if (sessao) {
    /*
     * O cookie prova quem assinou, não que a conta continua valendo. Entre a
     * emissão do token (30 dias) e este clique a conta pode ter sido
     * desativada ou removida — e um pedido preso a um cliente inativo é um
     * pedido que ninguém consegue atender.
     */
    const atual = await prisma.customer.findUnique({
      where: { id: sessao.id },
      select: { id: true, active: true },
    });

    if (!atual || !atual.active) {
      return {
        ok: false,
        estado: {
          erro:
            "Sua sessão não está mais válida. Entre de novo para concluir a compra — o " +
            "carrinho continua aqui.",
          campo: "email",
        },
      };
    }

    return { ok: true, customerId: atual.id, entrou: false };
  }

  const email = dados.email.toLowerCase().trim();

  if (dados.senha.length === 0) {
    return {
      ok: false,
      estado: {
        erro:
          dados.modoAcesso === "entrar"
            ? "Informe a senha da sua conta."
            : "Crie uma senha para a conta da clínica.",
        campo: "senha",
      },
    };
  }

  /* --------------------------------------------------------- entrar */
  if (dados.modoAcesso === "entrar") {
    if (await bloqueadoPorTentativas(email)) {
      return {
        ok: false,
        estado: {
          erro:
            "Muitas tentativas seguidas. Aguarde 15 minutos e tente de novo, ou redefina sua senha.",
          campo: "senha",
        },
      };
    }

    const cliente = await autenticarCliente(email, dados.senha);
    // mensagem única: conta inexistente, senha errada e conta inativa soam igual
    if (!cliente) {
      return { ok: false, estado: { erro: "E-mail ou senha inválidos.", campo: "senha" } };
    }

    await criarSessaoCliente(cliente);
    await fundirCarrinhoNoLogin(cliente.id);
    return { ok: true, customerId: cliente.id, entrou: true };
  }

  /* ---------------------------------------------------------- criar */
  if (dados.senha.length < 8) {
    return {
      ok: false,
      estado: { erro: "A senha precisa de ao menos 8 caracteres.", campo: "senha" },
    };
  }

  const jaExiste = await prisma.customer.findUnique({
    where: { email },
    select: { id: true },
  });
  if (jaExiste) {
    return { ok: false, estado: { erro: CONTA_NAO_CRIADA, campo: "senha" } };
  }

  let novo: { id: string; name: string; email: string };
  try {
    novo = await prisma.customer.create({
      data: {
        name: dados.nome,
        email,
        phone: formatarTelefone(dados.telefone),
        personType: dados.tipoPessoa,
        document: somenteDigitos(dados.documento),
        companyName: dados.tipoPessoa === "juridica" ? dados.razaoSocial : "",
        passwordHash: await hashSenhaCliente(dados.senha),
        /* Opt-in de marketing é decisão à parte: criar conta para comprar não
           é consentimento para receber publicidade. */
        marketingOptInAt: dados.novidades ? new Date() : null,
      },
      select: { id: true, name: true, email: true },
    });
  } catch (erro) {
    /* Corrida entre dois cadastros com o mesmo e-mail: o segundo chega aqui.
       A resposta é a mesma do e-mail já cadastrado — não um erro genérico de
       servidor, que faria a pessoa tentar de novo no mesmo caminho fechado. */
    if (ehChaveDuplicada(erro)) {
      return { ok: false, estado: { erro: CONTA_NAO_CRIADA, campo: "senha" } };
    }
    console.error("[checkout/conta]", erro);
    return {
      ok: false,
      estado: { erro: "Não foi possível criar a conta agora. Tente novamente em instantes." },
    };
  }

  await criarSessaoCliente(novo);
  await fundirCarrinhoNoLogin(novo.id);
  return { ok: true, customerId: novo.id, entrou: true };
}

/**
 * Fecha o pedido.
 *
 * O total é recalculado no servidor a partir do carrinho — o formulário não
 * envia preço nenhum. Só depois do pedido criado é que a cobrança é aberta no
 * provedor, e o estado do pagamento nunca vem do navegador.
 *
 * Desde a exigência de conta, a ordem das etapas importa: a identidade é
 * resolvida ANTES da leitura definitiva do carrinho, porque entrar ou criar
 * conta funde carrinhos e pode mudar o que está lá dentro.
 */
export async function finalizarCompra(
  _anterior: EstadoCheckout,
  formData: FormData,
): Promise<EstadoCheckout> {
  const dados = esquema.safeParse(Object.fromEntries(formData));

  if (!dados.success) {
    const problema = dados.error.issues[0];
    return {
      erro: problema?.message ?? "Confira os dados.",
      campo: String(problema?.path[0] ?? ""),
    };
  }

  /* Carrinho vazio é recusado antes da identidade: não faz sentido criar conta
     para uma compra que não existe. */
  const carrinhoInicial = await lerCarrinho();
  if (!carrinhoInicial || carrinhoInicial.items.length === 0) {
    return { erro: "Seu carrinho está vazio." };
  }

  const provedor = provedorPagamento();
  if (!provedor.metodos.includes(dados.data.metodo)) {
    return { erro: "Esta forma de pagamento não está disponível.", campo: "metodo" };
  }

  const identidade = await garantirCompradorAutenticado(dados.data);
  if (!identidade.ok) return identidade.estado;
  const customerId = identidade.customerId;

  /*
   * Reler o carrinho depois da identificação.
   *
   * Entrar ou criar conta chama `fundirCarrinhoNoLogin`, que pode acrescentar
   * itens de um carrinho anterior daquela conta e apagar o outro registro.
   * Fechar a compra com a referência lida antes disso cobraria por uma lista
   * que já não é a que está no banco — e, no pior caso, por um carrinho que
   * acabou de ser removido.
   */
  const carrinho = identidade.entrou ? await lerCarrinho() : carrinhoInicial;
  if (!carrinho || carrinho.items.length === 0) {
    return { erro: "Seu carrinho está vazio." };
  }

  /*
   * O carrinho tem de ser desta conta.
   *
   * `fundirCarrinhoNoLogin` já carimba o dono, mas a conferência é barata e
   * fecha a janela em que um carrinho de outra pessoa ainda estivesse amarrado
   * a este navegador — computador compartilhado, sessão trocada, fusão que não
   * rodou.
   */
  if (carrinho.customerId !== null && carrinho.customerId !== customerId) {
    return {
      erro: "Este carrinho é de outra conta. Abra o carrinho de novo para continuar.",
    };
  }

  const retirada = dados.data.entrega === "retirada";

  /**
   * O frete é decidido aqui, no servidor, no momento do fechamento.
   *
   * O formulário mandou o CEP e mais nada: valor, prazo e faixa saem da tabela
   * de /admin/frete. Quando nenhuma faixa cobre o CEP, `calcularFrete` devolve
   * `sob_orcamento` com valor zero — que é exatamente o que a loja fazia para
   * todo mundo antes de existir cálculo.
   *
   * `criarPedido` refaz o subtotal dentro da transação; o mínimo do frete
   * grátis é conferido com o subtotal lido um instante antes. A diferença só
   * aparece se um preço mudar entre as duas leituras, e nesse caso quem vale é
   * o valor de frete calculado aqui — o mesmo que a pessoa acabou de ver.
   */
  const frete = retirada ? freteDeRetirada() : await freteDoCarrinho(carrinho, dados.data.cep);

  let pedido;
  try {
    pedido = await criarPedido({
      carrinhoId: carrinho.id,
      customerId,
      comprador: {
        nome: dados.data.nome,
        email: dados.data.email.toLowerCase(),
        telefone: dados.data.telefone,
        documento: somenteDigitos(dados.data.documento),
        tipoPessoa: dados.data.tipoPessoa,
        razaoSocial: dados.data.razaoSocial,
      },
      entrega: {
        tipo: frete.tipo,
        rotulo: frete.rotulo,
        valorCents: frete.valorCents,
        cep: dados.data.cep,
        logradouro: dados.data.logradouro,
        numero: dados.data.numero,
        complemento: dados.data.complemento,
        bairro: dados.data.bairro,
        cidade: dados.data.cidade,
        uf: dados.data.uf.toUpperCase(),
        referencia: dados.data.referencia,
      },
      observacao: dados.data.observacao,
    });
  } catch (erro) {
    if (erro instanceof ErroDeItemIndisponivel) {
      return {
        erro: `${erro.produto} saiu do catálogo enquanto você comprava. Remova o item do carrinho para continuar.`,
      };
    }
    if (erro instanceof ErroDeEstoque) {
      return {
        erro: `${erro.produto} acabou de sair de estoque. Ajuste o carrinho e tente de novo.`,
      };
    }
    console.error("[checkout]", erro);
    return { erro: "Não foi possível fechar o pedido. Tente novamente em instantes." };
  }

  // guarda o endereço para as próximas compras
  if (!retirada) {
    const jaTem = await prisma.customerAddress.findFirst({ where: { customerId } });
    if (!jaTem) {
      await prisma.customerAddress.create({
        data: {
          customerId,
          recipient: dados.data.nome,
          zip: dados.data.cep,
          street: dados.data.logradouro,
          number: dados.data.numero,
          complement: dados.data.complemento,
          district: dados.data.bairro,
          city: dados.data.cidade,
          state: dados.data.uf.toUpperCase(),
          reference: dados.data.referencia,
          isDefault: true,
        },
      });
    }
  }

  /*
   * Confirmação por e-mail.
   *
   * Fica AQUI, e não dentro de `criarPedido`, porque lá tudo roda numa
   * transação: uma mensagem enfileirada de dentro dela sobreviveria a um
   * rollback e o cliente receberia "recebemos seu pedido" de um pedido que
   * não existe. Neste ponto a transação já foi confirmada.
   *
   * A fila é idempotente pela chave (canal|template|pedido|id), então um
   * duplo envio do formulário não gera dois e-mails. Falha aqui não derruba
   * a compra: `enfileirar` devolve o motivo em vez de lançar, e o pedido
   * está fechado de qualquer jeito.
   */
  const naFila = await enfileirar({
    canal: "email",
    para: pedido.buyerEmail,
    assunto: `Recebemos seu pedido ${pedido.number}`,
    corpo: "",
    refTipo: "pedido",
    refId: pedido.id,
    template: "pedido_recebido",
  });
  if (!naFila.ok) {
    console.error("[checkout] confirmação não entrou na fila:", naFila.motivo);
  }

  await abrirCobranca(pedido.id, dados.data.metodo, dados.data.parcelas, {
    token: dados.data.tokenCartao,
    bandeira: dados.data.bandeira,
  });

  /*
   * Acompanhamento por cookie.
   *
   * Desde a exigência de conta, todo pedido novo tem titular, e a sessão já é
   * porta suficiente para `/pedido/[numero]`. O cookie continua sendo gravado
   * mesmo assim porque ele cobre a janela em que a sessão some — expiração,
   * navegação anônima fechada e reaberta, logout logo depois da compra — sem
   * abrir acesso a mais nada: ele é assinado e lista só os números fechados
   * neste navegador.
   *
   * Ele é apagado no logout, junto do carrinho: em computador compartilhado,
   * quem entra depois não pode encontrar o pedido de quem saiu.
   */
  await liberarAcompanhamento(pedido.number);

  revalidatePath("/carrinho");
  revalidatePath("/checkout");
  revalidatePath(`/pedido/${pedido.number}`);

  redirect(`/pedido/${pedido.number}`);
}

/**
 * Abre a cobrança no provedor e registra o pagamento.
 *
 * NÃO é exportada de propósito: todo export de um arquivo "use server" vira
 * um endpoint público. Exposta, esta função deixaria qualquer um criar
 * cobrança para um pedido alheio — e, com o provedor de teste, marcar o
 * pedido como pago. Quem precisar dela de fora chama por uma ação que
 * confere autorização antes.
 */
async function abrirCobranca(
  pedidoId: string,
  metodo: PaymentMethod,
  parcelas: number,
  cartao?: { token?: string; bandeira?: string },
) {
  const pedido = await prisma.order.findUnique({ where: { id: pedidoId } });
  if (!pedido) return;

  const provedor = provedorPagamento();

  // o número de parcelas vem do formulário; o limite vem das configurações da
  // loja e do total real do pedido — nunca do que o navegador mandou
  const s = await getSettings();
  const maximoConfigurado = Math.min(12, Math.max(1, Number(s.parcelas_max) || 1));
  const permitido =
    metodo === "cartao"
      ? (calcularParcelas(pedido.totalCents, maximoConfigurado, paraCentavos(s.parcela_minima))
          ?.parcelas ?? 1)
      : 1;
  const parcelasFinais = Math.min(Math.max(1, Math.trunc(parcelas) || 1), permitido);

  const pagamento = await prisma.payment.create({
    data: {
      orderId: pedido.id,
      provider: provedor.nome,
      method: metodo,
      status: "criado",
      amountCents: pedido.totalCents,
      installments: parcelasFinais,
    },
  });

  // A chave carrega o id desta tentativa. Amarrada só ao pedido e ao método,
  // uma segunda tentativa após recusa receberia de volta a mesma cobrança
  // recusada — que é justamente o que a idempotência do provedor garante.
  const chave = `pedido:${pedido.id}:${metodo}:${pagamento.id}`;

  try {
    const resultado = await provedor.criarCobranca({
      pedidoId: pedido.id,
      pedidoNumero: pedido.number,
      valorCents: pedido.totalCents,
      metodo,
      parcelas: parcelasFinais,
      pagador: {
        nome: pedido.buyerName,
        email: pedido.buyerEmail,
        documento: pedido.buyerDocument,
        telefone: pedido.buyerPhone,
      },
      tokenCartao: cartao?.token || undefined,
      bandeira: cartao?.bandeira || undefined,
      chaveIdempotencia: chave,
    });

    await prisma.payment.update({
      where: { id: pagamento.id },
      data: {
        externalId: resultado.externalId,
        status: resultado.status,
        pixQrCode: resultado.qrCode,
        pixCopyPaste: resultado.copiaECola,
        expiresAt: resultado.expiraEm,
        cardBrand: resultado.bandeira,
        cardLast4: resultado.ultimos4,
        failReason: resultado.motivoFalha ?? "",
        approvedAt: resultado.status === "aprovado" ? new Date() : null,
      },
    });

    if (resultado.status === "aprovado") {
      await confirmarPagamento(pedido.id);
    } else if (resultado.status === "em_analise") {
      await prisma.order.update({
        where: { id: pedido.id },
        data: { status: "pagamento_em_analise" },
      });
    }
  } catch (erro) {
    console.error("[cobranca]", erro);

    /**
     * Não afirme o que não se sabe.
     *
     * A exceção pode ser recusa do provedor, mas pode ser a resposta que se
     * perdeu no caminho depois de a cobrança já existir do outro lado. Marcar
     * "recusado" convidava a pessoa a tentar de novo e pagar duas vezes.
     * `pendente` é a verdade: o estado é desconhecido até alguém conferir — o
     * webhook, ou a reconsulta em `tentarPagamentoNovamente`.
     */
    await prisma.payment.update({
      where: { id: pagamento.id },
      data: {
        status: "pendente",
        failReason:
          "A resposta do provedor não chegou. O estado desta cobrança precisa ser conferido " +
          "antes de gerar outra.",
      },
    });
  }
}

/**
 * Gera uma nova tentativa quando a anterior expirou ou foi recusada.
 *
 * A cobrança anterior não é cancelada de propósito: se a pessoa acabou de
 * pagar o Pix antigo, o webhook daquele pagamento ainda precisa valer.
 */
export async function tentarPagamentoNovamente(
  _anterior: EstadoCheckout,
  formData: FormData,
): Promise<EstadoCheckout> {
  const numero = String(formData.get("numero") ?? "")
    .trim()
    .toUpperCase();
  const metodoPedido = String(formData.get("metodo") ?? "pix");

  const pedido = numero ? await prisma.order.findUnique({ where: { number: numero } }) : null;

  // mensagem única: quem não tem acesso não descobre se o pedido existe
  if (!pedido || !(await temAcessoAoPedido(pedido))) {
    return { erro: "Pedido não encontrado." };
  }
  if (pedido.paidAt) return { erro: "Este pedido já está pago." };
  if (pedido.status === "cancelado" || pedido.status === "reembolsado") {
    return { erro: "Este pedido foi encerrado e não aceita um novo pagamento." };
  }

  const provedor = provedorPagamento();
  const metodo = provedor.metodos.find((m) => m === metodoPedido);
  if (!metodo) return { erro: "Esta forma de pagamento não está disponível.", campo: "metodo" };

  /**
   * Uma cobrança aberta por vez.
   *
   * Sem isto, cada clique em "tentar de novo" criava mais um Pix do valor
   * cheio. Com dois QR vivos ao mesmo tempo, a pessoa podia pagar os dois — e
   * só um seria reconhecido como o pagamento do pedido.
   *
   * Antes de barrar, o estado é reconferido no provedor: uma cobrança que
   * ficou `pendente` porque a resposta se perdeu pode já estar aprovada, ou já
   * ter morrido lá. Quem manda é o provedor, nunca o nosso registro.
   */
  const aberta = await prisma.payment.findFirst({
    where: { orderId: pedido.id, status: { in: ["criado", "pendente", "em_analise"] } },
    orderBy: { createdAt: "desc" },
  });

  if (aberta) {
    let status = aberta.status;

    if (aberta.externalId) {
      const atual = await provedor.consultar(aberta.externalId).catch(() => null);
      if (atual && atual.status !== status) {
        status = atual.status;
        await prisma.payment.update({ where: { id: aberta.id }, data: { status } });
        if (status === "aprovado") {
          await confirmarPagamento(pedido.id);
          revalidatePath(`/pedido/${pedido.number}`);
          redirect(`/pedido/${pedido.number}`);
        }
      }
    }

    const expirou = aberta.expiresAt !== null && aberta.expiresAt <= new Date();
    const aindaVale = ["criado", "pendente", "em_analise"].includes(status) && !expirou;

    if (aindaVale) {
      return {
        erro:
          "Já existe uma cobrança aberta para este pedido. Use a que está nesta página, " +
          "ou aguarde ela expirar antes de gerar outra.",
      };
    }

    if (expirou && (status === "criado" || status === "pendente")) {
      await prisma.payment.update({ where: { id: aberta.id }, data: { status: "expirado" } });
    }
  }

  await abrirCobranca(pedido.id, metodo, 1);
  revalidatePath(`/pedido/${pedido.number}`);
  redirect(`/pedido/${pedido.number}`);
}
