"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PersonType, Prisma } from "@prisma/client";
import { z } from "zod";

import { registrarAuditoria } from "@/lib/auditoria";
import { documentoValido, formatarDataHora, somenteDigitos } from "@/lib/format";
import { exigirEdicao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

/**
 * Cadastro de cliente e de unidade (clínica) feito pela equipe.
 *
 * Existe porque o painel só sabia atender quem tinha nascido no site: o
 * dentista ligava, e a única forma de registrar a pessoa era pedir que ela
 * mesma criasse conta. `salvarCliente` (em `admin-vendas.ts`) exige um
 * `clienteId` que ainda não existe, e os únicos `customer.create` do sistema
 * estão no cadastro público, no checkout e na conversão de lead.
 *
 * Duas decisões que valem explicar:
 *
 * 1. NENHUMA senha é definida aqui. `Customer.passwordHash` é nulo por projeto
 *    — é o mesmo estado do cliente que veio de um pedido de convidado. A pessoa
 *    define a senha dela pelo site, com o fluxo de recuperação, e a equipe
 *    nunca digita (nem enxerga) a senha de ninguém.
 *
 * 2. O e-mail é a chave única do cliente. Quando ele já existe, a ação não
 *    tenta adivinhar se é a mesma pessoa: devolve o erro com o id da ficha
 *    existente para a tela oferecer o link. Fundir cadastro é decisão humana.
 */

export type EstadoCliente = {
  erro?: string;
  /** Nome do campo que causou o erro, para o formulário destacar. */
  campo?: string;
  ok?: boolean;
  mensagem?: string;
  /** Ficha que já ocupa o e-mail digitado. A tela vira isso num link. */
  clienteExistente?: { id: string; nome: string };
};

/* ------------------------------------------------------------------ apoio */

function problemaZod(erro: z.ZodError): EstadoCliente {
  const primeiro = erro.issues[0];
  return {
    erro: primeiro?.message ?? "Confira os dados informados.",
    campo: primeiro ? String(primeiro.path[0] ?? "") : undefined,
  };
}

function mensagemDeErro(erro: unknown, padrao: string): EstadoCliente {
  console.error(padrao, erro);
  return { erro: padrao };
}

function comoObjeto(formData: FormData) {
  const dados: Record<string, unknown> = {};
  for (const [chave, valor] of formData.entries()) dados[chave] = valor;
  return dados;
}

const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
  "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
] as const;

const texto = (max: number) => z.string().trim().max(max).optional().default("");

/**
 * Endereço vindo do formulário.
 *
 * `CustomerAddress` não tem coluna opcional: CEP, logradouro, número, bairro,
 * cidade e UF são obrigatórios no schema. Por isso o bloco é tudo ou nada — ou
 * o endereço vem inteiro, ou não vem. Meio endereço no banco é o técnico
 * saindo para a rua com metade da informação.
 */
const esquemaEndereco = z.object({
  rotuloEndereco: texto(60),
  cep: texto(12),
  logradouro: texto(160),
  numero: texto(20),
  complemento: texto(80),
  bairro: texto(120),
  cidade: texto(120),
  uf: texto(2),
  referencia: texto(160),
});

type DadosEndereco = z.infer<typeof esquemaEndereco>;

type EnderecoPronto = {
  label: string;
  recipient: string;
  zip: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  reference: string;
};

/**
 * Confere o bloco de endereço.
 *
 * Devolve `null` quando ninguém tocou no bloco (cadastro sem endereço é
 * legítimo: o telefone toca antes de a pessoa saber o CEP da clínica nova),
 * o endereço montado quando está completo, e um erro de campo quando começou
 * e ficou pela metade.
 */
function conferirEndereco(
  dados: DadosEndereco,
  rotuloPadrao: string,
  destinatario = "",
): { endereco: EnderecoPronto | null } | { erro: EstadoCliente } {
  const cep = somenteDigitos(dados.cep);
  const preencheu =
    Boolean(cep) ||
    Boolean(dados.logradouro) ||
    Boolean(dados.numero) ||
    Boolean(dados.bairro) ||
    Boolean(dados.cidade) ||
    Boolean(dados.uf) ||
    Boolean(dados.complemento) ||
    Boolean(dados.referencia);

  if (!preencheu) return { endereco: null };

  if (cep.length !== 8) {
    return { erro: { erro: "CEP incompleto — são 8 dígitos.", campo: "cep" } };
  }
  if (!dados.logradouro) {
    return { erro: { erro: "Informe o logradouro.", campo: "logradouro" } };
  }
  if (!dados.numero) {
    return { erro: { erro: 'Informe o número. Use "s/n" quando não houver.', campo: "numero" } };
  }
  if (!dados.bairro) {
    return { erro: { erro: "Informe o bairro.", campo: "bairro" } };
  }
  if (!dados.cidade) {
    return { erro: { erro: "Informe a cidade.", campo: "cidade" } };
  }

  const uf = dados.uf.toUpperCase();
  if (!(UFS as readonly string[]).includes(uf)) {
    return { erro: { erro: "UF inválida. Use a sigla de duas letras.", campo: "uf" } };
  }

  return {
    endereco: {
      label: dados.rotuloEndereco || rotuloPadrao,
      recipient: destinatario,
      zip: cep,
      street: dados.logradouro,
      number: dados.numero,
      complement: dados.complemento,
      district: dados.bairro,
      city: dados.cidade,
      state: uf,
      reference: dados.referencia,
    },
  };
}

/* ==========================================================================
   CLIENTE — cadastro pelo painel
   ========================================================================== */

const esquemaNovoCliente = esquemaEndereco.extend({
  nome: z.string().trim().min(2, "Informe o nome do cliente.").max(160),
  email: z.email("Informe um e-mail válido."),
  telefone: texto(30),
  tipoPessoa: z.enum(PersonType),
  documento: texto(20),
  razaoSocial: texto(160),
  nomeFantasia: texto(160),
  inscricaoEstadual: texto(40),
  notas: texto(2000),
});

/**
 * Cria o cliente e, quando o endereço vem junto, o primeiro endereço dele.
 *
 * As duas escritas rodam na mesma transação: um cliente gravado com o endereço
 * perdido no meio do caminho é pior do que nenhum cliente gravado, porque
 * ninguém percebe a falta até o técnico precisar do CEP.
 */
export async function criarCliente(
  _anterior: EstadoCliente,
  formData: FormData,
): Promise<EstadoCliente> {
  const usuario = await exigirEdicao("clientes");
  const dados = esquemaNovoCliente.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  const email = dados.data.email.trim().toLowerCase();
  const documento = somenteDigitos(dados.data.documento);

  if (documento && !documentoValido(documento, dados.data.tipoPessoa)) {
    return {
      erro: dados.data.tipoPessoa === "fisica" ? "CPF inválido." : "CNPJ inválido.",
      campo: "documento",
    };
  }
  if (dados.data.tipoPessoa === "juridica" && !dados.data.razaoSocial) {
    return { erro: "Informe a razão social da empresa.", campo: "razaoSocial" };
  }

  const conferido = conferirEndereco(dados.data, "Principal", dados.data.nome);
  if ("erro" in conferido) return conferido.erro;

  const jaExiste = await prisma.customer.findUnique({
    where: { email },
    select: { id: true, name: true, companyName: true },
  });
  if (jaExiste) {
    return {
      erro: "Já existe um cliente com este e-mail.",
      campo: "email",
      clienteExistente: {
        id: jaExiste.id,
        nome: jaExiste.companyName || jaExiste.name,
      },
    };
  }

  /*
   * A nota interna entra no mesmo formato de `adicionarNotaDoCliente`: bloco
   * datado e assinado. `Customer.notes` é um campo de texto único no schema —
   * não existe tabela de notas —, então o formato precisa ser o mesmo nos dois
   * caminhos, ou a ficha vira uma colcha de retalhos.
   */
  const notaInicial = dados.data.notas.trim()
    ? `[${formatarDataHora(new Date())} · ${usuario.name}]\n${dados.data.notas.trim()}`
    : "";

  let destino = "";
  try {
    const cliente = await prisma.$transaction(async (tx) => {
      const criado = await tx.customer.create({
        data: {
          name: dados.data.nome,
          email,
          // sem senha: quem define é a pessoa, pelo site
          passwordHash: null,
          phone: somenteDigitos(dados.data.telefone),
          personType: dados.data.tipoPessoa,
          document: documento,
          companyName: dados.data.razaoSocial,
          tradeName: dados.data.nomeFantasia,
          stateRegistry: dados.data.inscricaoEstadual,
          notes: notaInicial,
        },
        select: { id: true, name: true },
      });

      if (conferido.endereco) {
        await tx.customerAddress.create({
          data: { customerId: criado.id, ...conferido.endereco, isDefault: true },
        });
      }

      return criado;
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "criar",
      entidade: "Customer",
      entidadeId: cliente.id,
      resumo: `Cliente ${cliente.name} cadastrado pelo painel${
        conferido.endereco ? " com endereço" : " sem endereço"
      }`,
    });

    revalidatePath("/admin/clientes");
    revalidatePath(`/admin/clientes/${cliente.id}`);
    destino = `/admin/clientes/${cliente.id}`;
  } catch (erro) {
    // corrida entre dois atendentes cadastrando o mesmo e-mail no mesmo minuto
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      const dono = await prisma.customer.findUnique({
        where: { email },
        select: { id: true, name: true, companyName: true },
      });
      return {
        erro: "Já existe um cliente com este e-mail.",
        campo: "email",
        clienteExistente: dono
          ? { id: dono.id, nome: dono.companyName || dono.name }
          : undefined,
      };
    }
    return mensagemDeErro(erro, "Não foi possível cadastrar o cliente.");
  }

  redirect(destino);
}

/* ==========================================================================
   UNIDADES — clínicas do cliente
   ========================================================================== */

function revalidarUnidades(clienteId: string) {
  revalidatePath(`/admin/clientes/${clienteId}/unidades`);
  revalidatePath(`/admin/clientes/${clienteId}`);
  revalidatePath("/admin/equipamentos");
}

const esquemaUnidade = esquemaEndereco.extend({
  clienteId: z.string().trim().min(1, "Cliente não informado."),
  unidadeId: texto(40),
  nome: z.string().trim().min(2, "Dê um nome à unidade.").max(120),
  /** "" = sem endereço, "nova" = usar o bloco abaixo, ou o id de um endereço. */
  enderecoId: texto(40),
  notas: texto(2000),
});

/**
 * Cria ou edita a unidade (clínica) do cliente.
 *
 * O endereço da unidade é um `CustomerAddress` do próprio cliente — não uma
 * cópia solta. Assim a clínica que também é endereço de entrega aparece uma
 * vez só, e corrigir a rua conserta pedido e visita técnica de uma vez.
 */
export async function salvarUnidade(
  _anterior: EstadoCliente,
  formData: FormData,
): Promise<EstadoCliente> {
  const usuario = await exigirEdicao("clientes");
  const dados = esquemaUnidade.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  const { clienteId, unidadeId, nome, enderecoId, notas } = dados.data;

  const cliente = await prisma.customer.findUnique({
    where: { id: clienteId },
    select: { id: true, name: true },
  });
  if (!cliente) return { erro: "Cliente não encontrado." };

  const criarEndereco = enderecoId === "nova";

  const conferido = conferirEndereco(dados.data, nome, cliente.name);
  if ("erro" in conferido) return conferido.erro;
  if (criarEndereco && !conferido.endereco) {
    return { erro: "Preencha o endereço da unidade.", campo: "cep" };
  }

  try {
    const unidade = await prisma.$transaction(async (tx) => {
      if (unidadeId) {
        // a unidade precisa ser deste cliente: id em URL não é autorização
        const atual = await tx.customerLocation.findFirst({
          where: { id: unidadeId, customerId: clienteId },
          select: { id: true, addressId: true },
        });
        if (!atual) throw new Error("UNIDADE_INEXISTENTE");

        let novoEnderecoId = atual.addressId;
        if (criarEndereco && conferido.endereco) {
          const endereco = await tx.customerAddress.create({
            data: { customerId: clienteId, ...conferido.endereco },
            select: { id: true },
          });
          novoEnderecoId = endereco.id;
        } else if (enderecoId === "") {
          novoEnderecoId = null;
        } else if (enderecoId) {
          const escolhido = await tx.customerAddress.findFirst({
            where: { id: enderecoId, customerId: clienteId },
            select: { id: true },
          });
          if (!escolhido) throw new Error("ENDERECO_INEXISTENTE");
          novoEnderecoId = escolhido.id;
        }

        return tx.customerLocation.update({
          where: { id: atual.id },
          data: { name: nome, addressId: novoEnderecoId, notes: notas },
          select: { id: true, name: true },
        });
      }

      let novoEnderecoId: string | null = null;
      if (criarEndereco && conferido.endereco) {
        const endereco = await tx.customerAddress.create({
          data: { customerId: clienteId, ...conferido.endereco },
          select: { id: true },
        });
        novoEnderecoId = endereco.id;
      } else if (enderecoId) {
        const escolhido = await tx.customerAddress.findFirst({
          where: { id: enderecoId, customerId: clienteId },
          select: { id: true },
        });
        if (!escolhido) throw new Error("ENDERECO_INEXISTENTE");
        novoEnderecoId = escolhido.id;
      }

      return tx.customerLocation.create({
        data: {
          customerId: clienteId,
          name: nome,
          addressId: novoEnderecoId,
          notes: notas,
        },
        select: { id: true, name: true },
      });
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: unidadeId ? "editar" : "criar",
      entidade: "CustomerLocation",
      entidadeId: unidade.id,
      resumo: `Unidade "${unidade.name}" de ${cliente.name}`,
    });

    revalidarUnidades(clienteId);
    return {
      ok: true,
      mensagem: unidadeId ? "Unidade atualizada." : `Unidade "${unidade.name}" cadastrada.`,
    };
  } catch (erro) {
    if (erro instanceof Error && erro.message === "UNIDADE_INEXISTENTE") {
      return { erro: "Unidade não encontrada para este cliente." };
    }
    if (erro instanceof Error && erro.message === "ENDERECO_INEXISTENTE") {
      return { erro: "O endereço escolhido não é deste cliente.", campo: "enderecoId" };
    }
    return mensagemDeErro(erro, "Não foi possível salvar a unidade.");
  }
}

const esquemaExcluirUnidade = z.object({
  clienteId: z.string().trim().min(1, "Cliente não informado."),
  unidadeId: z.string().trim().min(1, "Unidade não informada."),
});

/**
 * Exclui a unidade.
 *
 * Equipamento aponta para a unidade com `onDelete: SetNull` — apagar não
 * derrubaria o prontuário, mas deixaria os equipamentos sem lugar no mundo, em
 * silêncio. Por isso a exclusão só passa com a unidade vazia: quem manda é a
 * contagem no banco, não o botão que a tela escondeu.
 */
export async function excluirUnidade(
  _anterior: EstadoCliente,
  formData: FormData,
): Promise<EstadoCliente> {
  const usuario = await exigirEdicao("clientes");
  const dados = esquemaExcluirUnidade.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  const unidade = await prisma.customerLocation.findFirst({
    where: { id: dados.data.unidadeId, customerId: dados.data.clienteId },
    select: { id: true, name: true, _count: { select: { equipments: true } } },
  });
  if (!unidade) return { erro: "Unidade não encontrada para este cliente." };

  if (unidade._count.equipments > 0) {
    return {
      erro: `Esta unidade tem ${unidade._count.equipments} equipamento(s) no prontuário. Transfira-os antes de excluir.`,
    };
  }

  try {
    // a contagem acima é uma leitura; a condição do delete é a guarda de verdade
    const removidas = await prisma.customerLocation.deleteMany({
      where: { id: unidade.id, customerId: dados.data.clienteId, equipments: { none: {} } },
    });
    if (removidas.count === 0) {
      return { erro: "A unidade recebeu um equipamento agora há pouco e não foi excluída." };
    }

    await registrarAuditoria({
      userId: usuario.id,
      acao: "excluir",
      entidade: "CustomerLocation",
      entidadeId: unidade.id,
      resumo: `Unidade "${unidade.name}" excluída`,
    });

    revalidarUnidades(dados.data.clienteId);
    return { ok: true, mensagem: "Unidade excluída." };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível excluir a unidade.");
  }
}
