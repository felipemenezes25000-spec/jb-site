/**
 * DADOS DE DEMONSTRAÇÃO — camada de operação.
 *
 * O `seed-demo.ts` monta a vitrine: marcas, produtos, um cliente, um
 * equipamento e um chamado. Este script monta o que vem depois da vitrine —
 * pedido, pagamento, ordem de serviço, orçamento, contrato de manutenção,
 * documentos, favoritos, leads e suporte — para que as telas de `/minha-jb` e
 * do backoffice apareçam com movimento em vez de estado vazio.
 *
 * Tudo o que este script cria é reconhecível: e-mails em `@jbteste.local`,
 * códigos com sufixo DEMO nas notas internas, planos com slug `demo-`.
 *
 *   pnpm db:demo            (primeiro — a vitrine)
 *   pnpm db:demo:operacao   (depois — a operação)
 *   pnpm db:demo:limpar     (remove os dois)
 *
 * Os valores são fictícios. O cadastro real é feito pela JB no painel.
 */
import fs from "node:fs";
import path from "node:path";

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import type { OrderStatus, PaymentStatus, QuoteStatus } from "@prisma/client";

const prisma = new PrismaClient();

const EMAIL_DEMO = "demo@jbteste.local";
const SENHA_DEMO = "demo12345";
const MARCA = "[DEMO] gerado por seed-demo-operacao";

if (process.env.NODE_ENV === "production" && !process.env.PERMITIR_DEMO) {
  console.error("Recusado: dados de demonstração não entram em produção.");
  process.exit(1);
}

/**
 * Mesma sequência atômica que a aplicação usa. `src/lib/codigos.ts` é
 * "server-only" e não pode ser importado de um script tsx.
 */
async function proximoCodigo(prefixo: string) {
  const linhas = await prisma.$queryRaw<{ current: number }[]>`
    INSERT INTO "DocumentSequence" ("prefix", "current", "updatedAt")
    VALUES (${prefixo}, 1, now())
    ON CONFLICT ("prefix")
    DO UPDATE SET "current" = "DocumentSequence"."current" + 1, "updatedAt" = now()
    RETURNING "current"
  `;
  return `${prefixo}-${String(linhas[0]?.current ?? 1).padStart(6, "0")}`;
}

/**
 * Alinha o contador ao que já existe na tabela.
 *
 * `proximoCodigo` confia que a sequência é a única fonte de números. Quando o
 * banco tem linhas que não vieram dela — importação, restauração, ou um seed
 * anterior a um `DocumentSequence` zerado — o próximo número colide com um já
 * gravado. Aqui empurramos o contador para o maior número existente antes de
 * pedir o primeiro código.
 */
async function sincronizarSequencia(prefixo: string, maiorNumero: string | null | undefined) {
  const atual = Number(maiorNumero?.split("-")[1] ?? 0);
  if (!Number.isFinite(atual) || atual <= 0) return;

  await prisma.$executeRaw`
    INSERT INTO "DocumentSequence" ("prefix", "current", "updatedAt")
    VALUES (${prefixo}, ${atual}, now())
    ON CONFLICT ("prefix")
    DO UPDATE SET
      "current" = GREATEST("DocumentSequence"."current", ${atual}),
      "updatedAt" = now()
  `;
}

/** Lê o maior número já gravado de cada tipo e alinha todos os contadores. */
async function sincronizarContadores() {
  const [pedido, chamado, ordem, orcamento, contrato, ticket] = await Promise.all([
    prisma.order.findFirst({ orderBy: { number: "desc" }, select: { number: true } }),
    prisma.serviceRequest.findFirst({ orderBy: { number: "desc" }, select: { number: true } }),
    prisma.workOrder.findFirst({ orderBy: { number: "desc" }, select: { number: true } }),
    prisma.quote.findFirst({ orderBy: { number: "desc" }, select: { number: true } }),
    prisma.maintenanceContract.findFirst({ orderBy: { number: "desc" }, select: { number: true } }),
    prisma.supportTicket.findFirst({ orderBy: { number: "desc" }, select: { number: true } }),
  ]);

  await sincronizarSequencia("JB", pedido?.number);
  await sincronizarSequencia("AT", chamado?.number);
  await sincronizarSequencia("OS", ordem?.number);
  await sincronizarSequencia("ORC", orcamento?.number);
  await sincronizarSequencia("CT", contrato?.number);
  await sincronizarSequencia("SUP", ticket?.number);
}

/** Data relativa a agora, em dias. Negativo é passado. */
function dias(n: number) {
  return new Date(Date.now() + n * 86_400_000);
}

/** Data relativa com hora cravada, para a agenda ficar legível. */
function diaHora(n: number, hora: number, minuto = 0) {
  const d = dias(n);
  d.setHours(hora, minuto, 0, 0);
  return d;
}

/* ============================================================================
   PDF mínimo de verdade

   Os documentos do cliente precisam abrir. Em vez de apontar para um arquivo
   que não existe, geramos um PDF válido de uma página — com xref e offsets
   corretos — em public/uploads/demo/. É feio e é o suficiente: o que está
   sendo demonstrado é o fluxo, não o layout do documento.
   ========================================================================== */

function escaparPdf(texto: string) {
  return texto.replace(/([\\()])/g, "\\$1");
}

function montarPdf(titulo: string, linhas: string[]) {
  const corpo = [
    "BT",
    "/F1 20 Tf",
    `60 770 Td (${escaparPdf(titulo)}) Tj`,
    "/F1 11 Tf",
    "0 -34 Td",
    ...linhas.map((linha) => `(${escaparPdf(linha)}) Tj 0 -18 Td`),
    "ET",
  ].join("\n");

  const objetos = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]" +
      "/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>",
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>",
    `<</Length ${Buffer.byteLength(corpo, "latin1")}>>\nstream\n${corpo}\nendstream`,
  ];

  let saida = "%PDF-1.4\n";
  const offsets: number[] = [];

  objetos.forEach((objeto, i) => {
    offsets.push(Buffer.byteLength(saida, "latin1"));
    saida += `${i + 1} 0 obj\n${objeto}\nendobj\n`;
  });

  const inicioXref = Buffer.byteLength(saida, "latin1");
  saida += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    saida += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  saida += `trailer\n<</Size ${objetos.length + 1}/Root 1 0 R>>\nstartxref\n${inicioXref}\n%%EOF\n`;

  return Buffer.from(saida, "latin1");
}

const PASTA_DOCS = path.join(process.cwd(), "public", "uploads", "demo");

function gravarPdf(nomeArquivo: string, titulo: string, linhas: string[]) {
  fs.mkdirSync(PASTA_DOCS, { recursive: true });
  const conteudo = montarPdf(titulo, linhas);
  fs.writeFileSync(path.join(PASTA_DOCS, nomeArquivo), conteudo);
  return { chave: `/uploads/demo/${nomeArquivo}`, tamanho: conteudo.byteLength };
}

/* ============================================================================
   Equipe
   ========================================================================== */

const EQUIPE = [
  {
    email: "demo.gestor@jbteste.local",
    name: "Ana Ribeiro",
    role: "gestor" as const,
    phone: "(11) 97000-0001",
  },
  {
    email: "demo.comercial@jbteste.local",
    name: "Carlos Menezes",
    role: "comercial" as const,
    phone: "(11) 97000-0002",
  },
  {
    email: "demo.tecnico@jbteste.local",
    name: "Rogério Santos",
    role: "tecnico" as const,
    phone: "(11) 97000-0003",
    tecnico: { especialidades: ["Autoclave", "Compressor", "Bomba a vácuo"], cor: "#e0141b" },
  },
  {
    email: "demo.tecnico2@jbteste.local",
    name: "Wesley Prado",
    role: "tecnico" as const,
    phone: "(11) 97000-0004",
    tecnico: { especialidades: ["Cadeira odontológica", "Fotopolimerizador"], cor: "#2563eb" },
  },
];

async function montarEquipe() {
  const senha = await bcrypt.hash(SENHA_DEMO, 12);
  const tecnicos: { id: string; nome: string }[] = [];

  for (const pessoa of EQUIPE) {
    const usuario = await prisma.user.upsert({
      where: { email: pessoa.email },
      update: { name: pessoa.name, role: pessoa.role, active: true },
      create: {
        email: pessoa.email,
        name: pessoa.name,
        role: pessoa.role,
        phone: pessoa.phone,
        passwordHash: senha,
      },
    });

    if (pessoa.tecnico) {
      const registro = await prisma.technician.upsert({
        where: { userId: usuario.id },
        update: { specialties: pessoa.tecnico.especialidades, active: true },
        create: {
          userId: usuario.id,
          specialties: pessoa.tecnico.especialidades,
          colorTag: pessoa.tecnico.cor,
        },
      });
      tecnicos.push({ id: registro.id, nome: pessoa.name });
    }
  }

  return tecnicos;
}

/* ============================================================================
   Clientes extras — uma lista com uma linha só não mostra nada
   ========================================================================== */

const CLIENTES_EXTRAS = [
  {
    email: "demo.sorriso@jbteste.local",
    name: "Juliana Prado",
    phone: "(11) 97777-4455",
    personType: "juridica" as const,
    document: "19283746000155",
    companyName: "Sorriso Integrado Odontologia Ltda",
    tradeName: "Sorriso Integrado",
    endereco: {
      zip: "02040030",
      street: "Avenida Demonstração",
      number: "1420",
      district: "Santana",
      city: "São Paulo",
      state: "SP",
    },
  },
  {
    email: "demo.paulo@jbteste.local",
    name: "Paulo Andrade",
    phone: "(11) 96666-2211",
    personType: "fisica" as const,
    document: "39053344705",
    companyName: "",
    tradeName: "",
    endereco: {
      zip: "09080510",
      street: "Rua de Teste",
      number: "77",
      district: "Vila Assunção",
      city: "Santo André",
      state: "SP",
    },
  },
];

async function montarClientesExtras() {
  const senha = await bcrypt.hash(SENHA_DEMO, 12);
  const criados: { id: string; nome: string; email: string; enderecoId: string }[] = [];

  for (const dados of CLIENTES_EXTRAS) {
    const cliente = await prisma.customer.upsert({
      where: { email: dados.email },
      update: { name: dados.name },
      create: {
        name: dados.name,
        email: dados.email,
        phone: dados.phone,
        personType: dados.personType,
        document: dados.document,
        companyName: dados.companyName,
        tradeName: dados.tradeName,
        passwordHash: senha,
      },
    });

    const existente = await prisma.customerAddress.findFirst({
      where: { customerId: cliente.id },
    });
    const endereco =
      existente ??
      (await prisma.customerAddress.create({
        data: {
          customerId: cliente.id,
          label: "Consultório",
          recipient: dados.name,
          isDefault: true,
          ...dados.endereco,
        },
      }));

    criados.push({
      id: cliente.id,
      nome: cliente.name,
      email: cliente.email,
      enderecoId: endereco.id,
    });
  }

  return criados;
}

/* ============================================================================
   Pedidos
   ========================================================================== */

type LinhaPedido = { produtoSlug: string; quantidade: number };

type ReceitaPedido = {
  chave: string;
  status: OrderStatus;
  clienteEmail: string;
  diasAtras: number;
  itens: LinhaPedido[];
  retirada: boolean;
  pago: boolean;
  metodo: "pix" | "cartao" | "boleto";
  statusPagamento: PaymentStatus;
  parcelas?: number;
  cancelado?: boolean;
  concluido?: boolean;
  instalacao?: boolean;
  observacao?: string;
};

const RECEITAS: ReceitaPedido[] = [
  {
    chave: "pago-instalacao",
    status: "instalacao_agendada",
    clienteEmail: EMAIL_DEMO,
    diasAtras: 9,
    itens: [{ produtoSlug: "demo-autoclave-horizontal-21l", quantidade: 1 }],
    retirada: false,
    pago: true,
    metodo: "pix",
    statusPagamento: "aprovado",
    instalacao: true,
    observacao: "Entregar pela manhã. Portaria pede aviso na véspera.",
  },
  {
    chave: "aguardando-pix",
    status: "aguardando_pagamento",
    clienteEmail: EMAIL_DEMO,
    diasAtras: 0,
    itens: [{ produtoSlug: "demo-autoclave-horizontal-21l", quantidade: 1 }],
    retirada: true,
    pago: false,
    metodo: "pix",
    statusPagamento: "pendente",
  },
  {
    chave: "separacao",
    status: "separacao",
    clienteEmail: "demo.sorriso@jbteste.local",
    diasAtras: 3,
    itens: [{ produtoSlug: "demo-autoclave-horizontal-21l", quantidade: 2 }],
    retirada: false,
    pago: true,
    metodo: "cartao",
    statusPagamento: "aprovado",
    parcelas: 6,
  },
  {
    chave: "concluido",
    status: "concluido",
    clienteEmail: "demo.sorriso@jbteste.local",
    diasAtras: 190,
    itens: [{ produtoSlug: "demo-autoclave-horizontal-21l", quantidade: 1 }],
    retirada: false,
    pago: true,
    metodo: "cartao",
    statusPagamento: "aprovado",
    parcelas: 10,
    concluido: true,
  },
  {
    chave: "cancelado",
    status: "cancelado",
    clienteEmail: "demo.paulo@jbteste.local",
    diasAtras: 27,
    itens: [{ produtoSlug: "demo-autoclave-horizontal-21l", quantidade: 1 }],
    retirada: true,
    pago: false,
    metodo: "boleto",
    statusPagamento: "expirado",
    cancelado: true,
  },
];

async function montarPedidos(tecnicos: { id: string; nome: string }[]) {
  const criados: { chave: string; id: string; numero: string; clienteId: string | null }[] = [];

  for (const receita of RECEITAS) {
    const cliente = await prisma.customer.findUnique({
      where: { email: receita.clienteEmail },
      include: { addresses: { take: 1, orderBy: { createdAt: "asc" } } },
    });
    if (!cliente) continue;

    const jaExiste = await prisma.order.findFirst({
      where: { customerId: cliente.id, internalNote: { contains: receita.chave } },
    });
    if (jaExiste) {
      criados.push({
        chave: receita.chave,
        id: jaExiste.id,
        numero: jaExiste.number,
        clienteId: jaExiste.customerId,
      });
      continue;
    }

    const produtos = await Promise.all(
      receita.itens.map(async (item) => ({
        linha: item,
        produto: await prisma.product.findUnique({
          where: { slug: item.produtoSlug },
          include: { brand: true, media: { include: { media: true }, take: 1 } },
        }),
      })),
    );

    const itens = produtos.filter((p) => p.produto !== null);
    if (itens.length === 0) continue;

    const subtotal = itens.reduce(
      (soma, item) => soma + item.produto!.priceCents * item.linha.quantidade,
      0,
    );
    const frete = receita.retirada ? 0 : 0; // frete de equipamento grande é orçado depois
    const total = subtotal + frete;
    const endereco = cliente.addresses[0];
    const quando = dias(-receita.diasAtras);

    const pedido = await prisma.order.create({
      data: {
        number: await proximoCodigo("JB"),
        status: receita.status,
        customerId: cliente.id,
        buyerName: cliente.name,
        buyerEmail: cliente.email,
        buyerPhone: cliente.phone ?? "",
        buyerDocument: cliente.document ?? "",
        personType: cliente.personType,
        companyName: cliente.companyName ?? "",
        shippingKind: receita.retirada ? "retirada" : "sob_orcamento",
        shippingLabel: receita.retirada
          ? "Retirada na JB"
          : "Entrega — frete calculado após análise",
        shipZip: receita.retirada ? "" : (endereco?.zip ?? ""),
        shipStreet: receita.retirada ? "" : (endereco?.street ?? ""),
        shipNumber: receita.retirada ? "" : (endereco?.number ?? ""),
        shipDistrict: receita.retirada ? "" : (endereco?.district ?? ""),
        shipCity: receita.retirada ? "" : (endereco?.city ?? ""),
        shipState: receita.retirada ? "" : (endereco?.state ?? ""),
        subtotalCents: subtotal,
        shippingCents: frete,
        totalCents: total,
        customerNote: receita.observacao ?? "",
        internalNote: `${MARCA} · ${receita.chave}`,
        placedAt: quando,
        createdAt: quando,
        paidAt: receita.pago ? dias(-receita.diasAtras + 0.02) : null,
        deliveredAt: receita.concluido ? dias(-receita.diasAtras + 6) : null,
        closedAt: receita.concluido ? dias(-receita.diasAtras + 8) : null,
        canceledAt: receita.cancelado ? dias(-receita.diasAtras + 4) : null,
        items: {
          create: itens.map((item) => ({
            kind: "produto" as const,
            productId: item.produto!.id,
            name: item.produto!.name,
            sku: item.produto!.sku ?? "",
            brandName: item.produto!.brand?.name ?? "",
            modelName: item.produto!.model ?? "",
            condition: item.produto!.condition,
            imageUrl: item.produto!.media[0]?.media.url ?? "",
            unitPriceCents: item.produto!.priceCents,
            quantity: item.linha.quantidade,
            totalCents: item.produto!.priceCents * item.linha.quantidade,
          })),
        },
      },
    });

    /* histórico — o que o cliente vê na linha do tempo */
    const historico: { status: OrderStatus; titulo: string; dia: number }[] = [
      { status: "aguardando_pagamento", titulo: "Pedido recebido", dia: 0 },
    ];

    if (receita.pago) historico.push({ status: "pago", titulo: "Pagamento confirmado", dia: 0.05 });
    if (receita.status === "separacao" || receita.concluido || receita.instalacao) {
      historico.push({ status: "separacao", titulo: "Em separação", dia: 1 });
    }
    if (receita.instalacao) {
      historico.push({ status: "instalacao_agendada", titulo: "Instalação agendada", dia: 3 });
    }
    if (receita.concluido) {
      historico.push({ status: "entregue", titulo: "Entregue", dia: 6 });
      historico.push({ status: "concluido", titulo: "Pedido concluído", dia: 8 });
    }
    if (receita.cancelado) {
      historico.push({ status: "cancelado", titulo: "Pedido cancelado", dia: 4 });
    }

    await prisma.orderStatusEvent.createMany({
      data: historico.map((passo) => ({
        orderId: pedido.id,
        status: passo.status,
        note: passo.titulo,
        createdAt: dias(-receita.diasAtras + passo.dia),
      })),
    });

    /* pagamento */
    const pagamento = await prisma.payment.create({
      data: {
        orderId: pedido.id,
        provider: "mock",
        method: receita.metodo,
        status: receita.statusPagamento,
        amountCents: total,
        installments: receita.parcelas ?? 1,
        externalId: `mock_demo_${pedido.number.toLowerCase()}`,
        approvedAt: receita.pago ? dias(-receita.diasAtras + 0.02) : null,
        expiresAt: receita.statusPagamento === "pendente" ? dias(0.02) : null,
        pixCopyPaste:
          receita.metodo === "pix"
            ? `00020126580014BR.GOV.BCB.PIX0136demo${pedido.number}5204000053039865802BR5913JB SOLUCOES6009SAO PAULO`
            : null,
        cardBrand: receita.metodo === "cartao" ? "visa" : null,
        cardLast4: receita.metodo === "cartao" ? "4321" : null,
        failReason: receita.statusPagamento === "expirado" ? "Boleto vencido sem pagamento." : "",
        createdAt: quando,
      },
    });

    await prisma.paymentEvent.create({
      data: {
        paymentId: pagamento.id,
        eventKey: `demo:${pedido.number}:${receita.statusPagamento}`,
        kind: "simulado",
        payload: { origem: "seed-demo-operacao", status: receita.statusPagamento },
        createdAt: quando,
      },
    });

    /* instalação agendada — alimenta a agenda do backoffice */
    if (receita.instalacao) {
      const tarefa = await prisma.installationTask.create({
        data: {
          orderId: pedido.id,
          status: "agendada",
          scheduledAt: diaHora(4, 9),
          notes: "Instalação e orientação de uso para a equipe da clínica.",
        },
      });

      await prisma.serviceAppointment.create({
        data: {
          installTaskId: tarefa.id,
          technicianId: tecnicos[0]?.id ?? null,
          title: `Instalação — pedido ${pedido.number}`,
          startsAt: diaHora(4, 9),
          endsAt: diaHora(4, 12),
          status: "agendado",
          addressSummary: endereco
            ? `${endereco.street}, ${endereco.number} — ${endereco.district}, ${endereco.city}`
            : "",
        },
      });
    }

    criados.push({
      chave: receita.chave,
      id: pedido.id,
      numero: pedido.number,
      clienteId: pedido.customerId,
    });
  }

  return criados;
}

/* ============================================================================
   Chamados extras — a fila do técnico precisa ter fila
   ========================================================================== */

const CHAMADOS = [
  {
    chave: "compressor",
    status: "triagem" as const,
    urgencia: "parado" as const,
    clienteEmail: "demo.sorriso@jbteste.local",
    marca: "Schuster",
    modelo: "CSI 10",
    problema: "nao_liga",
    descricao:
      "O compressor não liga desde ontem. A clínica está com dois consultórios parados.",
    diasAtras: 1,
  },
  {
    chave: "cadeira",
    status: "aprovado" as const,
    urgencia: "alta" as const,
    clienteEmail: "demo.paulo@jbteste.local",
    marca: "Suctron",
    modelo: "Linha Clínica",
    problema: "ruido_anormal",
    descricao: "A cadeira faz um estalo ao subir e trava na posição mais alta.",
    diasAtras: 6,
  },
  {
    chave: "sugador",
    status: "concluido" as const,
    urgencia: "normal" as const,
    clienteEmail: "demo.sorriso@jbteste.local",
    marca: "Sugmaster",
    modelo: "Bomba a vácuo",
    problema: "perda_de_succao",
    descricao: "Perda de sucção em um dos terminais depois da limpeza semanal.",
    diasAtras: 34,
  },
  {
    chave: "visita",
    status: "visita_agendada" as const,
    urgencia: "normal" as const,
    clienteEmail: EMAIL_DEMO,
    marca: "ALT",
    modelo: "Linha 21L",
    problema: "revisao",
    descricao: "Revisão programada antes do vencimento da garantia.",
    diasAtras: 2,
  },
];

async function montarChamados(tecnicos: { id: string; nome: string }[]) {
  const criados: { chave: string; id: string; numero: string; clienteId: string }[] = [];

  for (const receita of CHAMADOS) {
    const cliente = await prisma.customer.findUnique({
      where: { email: receita.clienteEmail },
      include: { addresses: { take: 1, orderBy: { createdAt: "asc" } } },
    });
    if (!cliente) continue;

    const jaExiste = await prisma.serviceRequest.findFirst({
      where: { customerId: cliente.id, internalNote: { contains: receita.chave } },
    });
    if (jaExiste) {
      criados.push({
        chave: receita.chave,
        id: jaExiste.id,
        numero: jaExiste.number,
        clienteId: cliente.id,
      });
      continue;
    }

    const endereco = cliente.addresses[0];
    const quando = dias(-receita.diasAtras);

    const chamado = await prisma.serviceRequest.create({
      data: {
        number: await proximoCodigo("AT"),
        status: receita.status,
        customerId: cliente.id,
        contactName: cliente.name,
        contactEmail: cliente.email,
        contactPhone: cliente.phone ?? "",
        brandName: receita.marca,
        modelName: receita.modelo,
        problemKind: receita.problema,
        description: receita.descricao,
        urgency: receita.urgencia,
        internalNote: `${MARCA} · ${receita.chave}`,
        addressZip: endereco?.zip ?? "",
        addressStreet: endereco?.street ?? "",
        addressNumber: endereco?.number ?? "",
        addressDistrict: endereco?.district ?? "",
        addressCity: endereco?.city ?? "",
        addressState: endereco?.state ?? "",
        availability: "Manhãs, de segunda a sexta",
        createdAt: quando,
      },
    });

    await prisma.serviceRequestEvent.create({
      data: {
        requestId: chamado.id,
        status: "solicitacao_recebida",
        title: "Chamado recebido",
        message: "Recebemos sua solicitação e ela entrou na fila de triagem.",
        createdAt: quando,
      },
    });

    if (receita.status !== "triagem") {
      await prisma.serviceRequestEvent.create({
        data: {
          requestId: chamado.id,
          status: receita.status,
          title: "Status atualizado",
          message: "A equipe técnica avançou o atendimento.",
          createdAt: dias(-receita.diasAtras + 1),
        },
      });
    }

    if (receita.status === "visita_agendada") {
      await prisma.serviceAppointment.create({
        data: {
          requestId: chamado.id,
          technicianId: tecnicos[1]?.id ?? tecnicos[0]?.id ?? null,
          title: `Visita técnica — ${chamado.number}`,
          startsAt: diaHora(2, 14),
          endsAt: diaHora(2, 16),
          status: "agendado",
          addressSummary: endereco
            ? `${endereco.street}, ${endereco.number} — ${endereco.district}, ${endereco.city}`
            : "",
        },
      });
    }

    criados.push({
      chave: receita.chave,
      id: chamado.id,
      numero: chamado.number,
      clienteId: cliente.id,
    });
  }

  return criados;
}

/* ============================================================================
   Ordens de serviço
   ========================================================================== */

async function montarOrdens(
  chamados: { chave: string; id: string; numero: string; clienteId: string }[],
  tecnicos: { id: string; nome: string }[],
) {
  const criadas: { chave: string; id: string; numero: string }[] = [];

  const receitas = [
    {
      chave: "os-em-execucao",
      chamado: "cadeira",
      status: "em_execucao" as const,
      tecnico: 1,
      diasAtras: 4,
      diagnostico:
        "Folga no fuso do pistão de elevação e desgaste no anel de vedação superior.",
      executado: "",
      itens: [
        { kind: "peca", description: "Anel de vedação do pistão", quantity: 2, unit: 8900 },
        { kind: "servico", description: "Mão de obra — troca de vedação", quantity: 1, unit: 32000 },
        { kind: "deslocamento", description: "Deslocamento até Santo André", quantity: 1, unit: 12000 },
      ],
      checklist: [
        { label: "Pressão hidráulica conferida", done: true },
        { label: "Curso de elevação testado", done: true },
        { label: "Vedação substituída", done: false },
        { label: "Teste final com carga", done: false },
      ],
    },
    {
      chave: "os-concluida",
      chamado: "sugador",
      status: "concluida" as const,
      tecnico: 0,
      diasAtras: 32,
      diagnostico: "Mangueira do terminal 2 com microfuro e filtro saturado.",
      executado: "Substituída a mangueira do terminal 2 e trocado o filtro. Sucção normalizada.",
      itens: [
        { kind: "peca", description: "Mangueira de sucção 3/8", quantity: 1, unit: 14500 },
        { kind: "peca", description: "Filtro da bomba a vácuo", quantity: 1, unit: 7800 },
        { kind: "servico", description: "Mão de obra — manutenção corretiva", quantity: 1, unit: 28000 },
      ],
      checklist: [
        { label: "Vazão medida nos quatro terminais", done: true },
        { label: "Mangueira substituída", done: true },
        { label: "Filtro trocado", done: true },
        { label: "Teste de estanqueidade", done: true },
      ],
    },
  ];

  for (const receita of receitas) {
    const chamado = chamados.find((c) => c.chave === receita.chamado);
    if (!chamado) continue;

    const jaExiste = await prisma.workOrder.findFirst({
      where: { requestId: chamado.id, notes: { contains: receita.chave } },
    });
    if (jaExiste) {
      criadas.push({ chave: receita.chave, id: jaExiste.id, numero: jaExiste.number });
      continue;
    }

    const pecas = receita.itens
      .filter((i) => i.kind === "peca")
      .reduce((s, i) => s + i.unit * i.quantity, 0);
    const maoDeObra = receita.itens
      .filter((i) => i.kind === "servico")
      .reduce((s, i) => s + i.unit * i.quantity, 0);
    const deslocamento = receita.itens
      .filter((i) => i.kind === "deslocamento")
      .reduce((s, i) => s + i.unit * i.quantity, 0);

    const cliente = await prisma.customer.findUnique({ where: { id: chamado.clienteId } });
    const quando = dias(-receita.diasAtras);
    const concluida = receita.status === "concluida";

    const ordem = await prisma.workOrder.create({
      data: {
        number: await proximoCodigo("OS"),
        status: receita.status,
        requestId: chamado.id,
        technicianId: tecnicos[receita.tecnico]?.id ?? null,
        customerName: cliente?.name ?? "",
        reportedIssue: `Chamado ${chamado.numero}`,
        diagnosis: receita.diagnostico,
        workDone: receita.executado,
        finalTest: concluida ? "Ciclo completo testado, sem ocorrência." : "",
        notes: `${MARCA} · ${receita.chave}`,
        partsCents: pecas,
        laborCents: maoDeObra,
        travelCents: deslocamento,
        totalCents: pecas + maoDeObra + deslocamento,
        serviceWarrantyDays: concluida ? 90 : null,
        openedAt: quando,
        closedAt: concluida ? dias(-receita.diasAtras + 2) : null,
        acceptedAt: concluida ? dias(-receita.diasAtras + 2) : null,
        acceptedByName: concluida ? (cliente?.name ?? "") : "",
        items: {
          create: receita.itens.map((item, i) => ({
            kind: item.kind,
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unit,
            totalCents: item.unit * item.quantity,
            order: i,
          })),
        },
        checklist: {
          create: receita.checklist.map((item, i) => ({
            label: item.label,
            done: item.done,
            order: i,
          })),
        },
      },
    });

    await prisma.workOrderEvent.createMany({
      data: [
        {
          workOrderId: ordem.id,
          title: "Ordem de serviço aberta",
          message: `Aberta a partir do chamado ${chamado.numero}.`,
          createdAt: quando,
        },
        ...(concluida
          ? [
              {
                workOrderId: ordem.id,
                title: "Serviço concluído",
                message: "Equipamento testado e liberado para uso.",
                createdAt: dias(-receita.diasAtras + 2),
              },
            ]
          : []),
      ],
    });

    criadas.push({ chave: receita.chave, id: ordem.id, numero: ordem.number });
  }

  return criadas;
}

/* ============================================================================
   Orçamentos
   ========================================================================== */

async function montarOrcamentos(
  chamados: { chave: string; id: string; numero: string; clienteId: string }[],
) {
  const cliente = await prisma.customer.findUnique({ where: { email: EMAIL_DEMO } });
  const outro = await prisma.customer.findUnique({
    where: { email: "demo.paulo@jbteste.local" },
  });
  if (!cliente) return [];

  const criados: { chave: string; numero: string }[] = [];

  const receitas: {
    chave: string;
    kind: "comercial" | "assistencia";
    status: QuoteStatus;
    clienteId: string;
    requestId: string | null;
    mensagem: string;
    condicoes: string;
    diasAtras: number;
    itens: { description: string; quantity: number; unit: number }[];
    desconto: number;
  }[] = [
    {
      chave: "orc-comercial",
      kind: "comercial" as const,
      status: "enviado" as const,
      clienteId: cliente.id,
      requestId: null as string | null,
      mensagem:
        "Proposta para renovação da esterilização da clínica, com instalação e treinamento inclusos.",
      condicoes:
        "Validade de 15 dias. Entrega em até 20 dias úteis após a confirmação. Garantia de 12 meses.",
      diasAtras: 5,
      itens: [
        { description: "Autoclave horizontal 21 litros", quantity: 2, unit: 1_190_000 },
        { description: "Instalação e testes (por equipamento)", quantity: 2, unit: 45_000 },
        { description: "Treinamento da equipe", quantity: 1, unit: 38_000 },
      ],
      desconto: 120_000,
    },
    {
      chave: "orc-assistencia",
      kind: "assistencia" as const,
      status: "aprovado" as const,
      clienteId: outro?.id ?? cliente.id,
      requestId: chamados.find((c) => c.chave === "cadeira")?.id ?? null,
      mensagem: "Orçamento do reparo diagnosticado na visita técnica.",
      condicoes: "Peça com prazo de 5 dias úteis. Garantia de 90 dias sobre o serviço.",
      diasAtras: 3,
      itens: [
        { description: "Anel de vedação do pistão", quantity: 2, unit: 8_900 },
        { description: "Mão de obra — troca de vedação", quantity: 1, unit: 32_000 },
        { description: "Deslocamento", quantity: 1, unit: 12_000 },
      ],
      desconto: 0,
    },
  ];

  for (const receita of receitas) {
    const jaExiste = await prisma.quote.findFirst({
      where: { customerId: receita.clienteId, internalNote: { contains: receita.chave } },
    });
    if (jaExiste) {
      criados.push({ chave: receita.chave, numero: jaExiste.number });
      continue;
    }

    const dono = await prisma.customer.findUnique({ where: { id: receita.clienteId } });
    const subtotal = receita.itens.reduce((s, i) => s + i.unit * i.quantity, 0);
    const quando = dias(-receita.diasAtras);

    const orcamento = await prisma.quote.create({
      data: {
        number: await proximoCodigo("ORC"),
        kind: receita.kind,
        status: receita.status,
        customerId: receita.clienteId,
        requestId: receita.requestId,
        contactName: dono?.name ?? "",
        contactEmail: dono?.email ?? "",
        contactPhone: dono?.phone ?? "",
        message: receita.mensagem,
        conditions: receita.condicoes,
        internalNote: `${MARCA} · ${receita.chave}`,
        subtotalCents: subtotal,
        discountCents: receita.desconto,
        totalCents: subtotal - receita.desconto,
        validUntil: dias(15 - receita.diasAtras),
        sentAt: quando,
        createdAt: quando,
        items: {
          create: receita.itens.map((item, i) => ({
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unit,
            totalCents: item.unit * item.quantity,
            order: i,
          })),
        },
      },
    });

    await prisma.quoteEvent.createMany({
      data: [
        {
          quoteId: orcamento.id,
          title: "Orçamento criado",
          message: "Proposta montada pela equipe comercial.",
          visibleToCustomer: false,
          createdAt: quando,
        },
        {
          quoteId: orcamento.id,
          title: "Orçamento enviado",
          message: "Proposta enviada para aprovação do cliente.",
          createdAt: quando,
        },
      ],
    });

    criados.push({ chave: receita.chave, numero: orcamento.number });
  }

  return criados;
}

/* ============================================================================
   Planos e contratos de manutenção
   ========================================================================== */

const PLANOS = [
  {
    slug: "demo-plano-essencial",
    name: "Essencial",
    description:
      "Uma visita preventiva por ano no equipamento crítico da clínica, com relatório e prioridade na fila de atendimento.",
    benefits: [
      "1 visita preventiva por ano",
      "Relatório técnico após cada visita",
      "Prioridade na fila de chamados",
      "5% de desconto em peças",
    ],
    priceCents: 89_000,
    periodMonths: 12,
    visitsIncluded: 1,
    partsDiscountPercent: 5,
    order: 0,
  },
  {
    slug: "demo-plano-avancado",
    name: "Avançado",
    description:
      "Duas visitas preventivas por ano, deslocamento incluso e desconto maior em peças. Para clínicas com agenda cheia.",
    benefits: [
      "2 visitas preventivas por ano",
      "Deslocamento incluso na região metropolitana",
      "Relatório técnico e checklist assinado",
      "10% de desconto em peças",
      "Atendimento corretivo em até 48h úteis",
    ],
    priceCents: 159_000,
    periodMonths: 12,
    visitsIncluded: 2,
    partsDiscountPercent: 10,
    order: 1,
  },
  {
    slug: "demo-plano-total",
    name: "Total",
    description:
      "Quatro visitas por ano, mão de obra corretiva inclusa e atendimento prioritário. Para quem não pode parar.",
    benefits: [
      "4 visitas preventivas por ano",
      "Mão de obra corretiva inclusa",
      "Atendimento prioritário em até 24h úteis",
      "15% de desconto em peças",
      "Equipamento reserva quando disponível",
    ],
    priceCents: 289_000,
    periodMonths: 12,
    visitsIncluded: 4,
    partsDiscountPercent: 15,
    order: 2,
  },
];

async function montarManutencao(tecnicos: { id: string; nome: string }[]) {
  for (const plano of PLANOS) {
    await prisma.maintenancePlan.upsert({
      where: { slug: plano.slug },
      update: { ...plano, published: true },
      create: { ...plano, published: true },
    });
  }

  const cliente = await prisma.customer.findUnique({ where: { email: EMAIL_DEMO } });
  if (!cliente) return null;

  const equipamento = await prisma.equipment.findFirst({ where: { customerId: cliente.id } });
  if (!equipamento) return null;

  const jaExiste = await prisma.maintenanceContract.findFirst({
    where: { customerId: cliente.id, notes: { contains: MARCA } },
  });
  if (jaExiste) return jaExiste;

  const plano = await prisma.maintenancePlan.findUnique({
    where: { slug: "demo-plano-avancado" },
  });

  const contrato = await prisma.maintenanceContract.create({
    data: {
      number: await proximoCodigo("CT"),
      status: "ativo",
      customerId: cliente.id,
      planId: plano?.id ?? null,
      startsAt: dias(-150),
      endsAt: dias(215),
      priceCents: plano?.priceCents ?? 0,
      notes: MARCA,
      items: { create: [{ equipmentId: equipamento.id }] },
    },
  });

  await prisma.maintenanceVisit.createMany({
    data: [
      {
        contractId: contrato.id,
        equipmentId: equipamento.id,
        technicianId: tecnicos[0]?.id ?? null,
        status: "concluida",
        dueAt: dias(-150),
        scheduledAt: dias(-148),
        doneAt: dias(-148),
        notes: "Troca de vedação e teste de ciclo completo. Equipamento liberado.",
      },
      {
        contractId: contrato.id,
        equipmentId: equipamento.id,
        technicianId: tecnicos[0]?.id ?? null,
        status: "agendada",
        dueAt: dias(22),
        scheduledAt: diaHora(22, 10),
        notes: "Preventiva semestral.",
      },
      {
        contractId: contrato.id,
        equipmentId: equipamento.id,
        status: "prevista",
        dueAt: dias(205),
        notes: "Última preventiva da vigência.",
      },
    ],
  });

  return contrato;
}

/* ============================================================================
   Documentos, favoritos, avisos, leads e suporte
   ========================================================================== */

async function montarAcessorios(
  pedidos: { chave: string; id: string; numero: string; clienteId: string | null }[],
  ordens: { chave: string; id: string; numero: string }[],
) {
  const cliente = await prisma.customer.findUnique({ where: { email: EMAIL_DEMO } });
  if (!cliente) return;

  const equipamento = await prisma.equipment.findFirst({ where: { customerId: cliente.id } });
  const pedidoPago = pedidos.find((p) => p.chave === "pago-instalacao");
  const osConcluida = ordens.find((o) => o.chave === "os-concluida");

  /* documentos com PDF que abre de verdade */
  const documentos = [
    {
      kind: "nota_fiscal" as const,
      title: `Nota fiscal — pedido ${pedidoPago?.numero ?? "JB"}`,
      arquivo: "nota-fiscal-demo.pdf",
      linhas: [
        "Documento de demonstracao gerado pelo seed.",
        `Pedido: ${pedidoPago?.numero ?? "-"}`,
        "JB Solucoes Odontologicas",
        "Este arquivo nao tem valor fiscal.",
      ],
      orderId: pedidoPago?.id ?? null,
      equipmentId: null as string | null,
      workOrderId: null as string | null,
    },
    {
      kind: "garantia" as const,
      title: "Certificado de garantia — autoclave 21L",
      arquivo: "garantia-demo.pdf",
      linhas: [
        "Documento de demonstracao gerado pelo seed.",
        "Equipamento: Autoclave horizontal 21 litros",
        "Garantia: 12 meses a partir da instalacao.",
      ],
      orderId: null,
      equipmentId: equipamento?.id ?? null,
      workOrderId: null,
    },
    {
      kind: "laudo" as const,
      title: `Laudo técnico — OS ${osConcluida?.numero ?? "OS"}`,
      arquivo: "laudo-demo.pdf",
      linhas: [
        "Documento de demonstracao gerado pelo seed.",
        `Ordem de servico: ${osConcluida?.numero ?? "-"}`,
        "Servico executado e equipamento liberado para uso.",
      ],
      orderId: null,
      equipmentId: null,
      workOrderId: osConcluida?.id ?? null,
    },
  ];

  for (const documento of documentos) {
    const jaExiste = await prisma.document.findFirst({
      where: { customerId: cliente.id, title: documento.title },
    });
    if (jaExiste) continue;

    const arquivo = gravarPdf(documento.arquivo, documento.title, documento.linhas);
    await prisma.document.create({
      data: {
        kind: documento.kind,
        title: documento.title,
        storageKey: arquivo.chave,
        mime: "application/pdf",
        size: arquivo.tamanho,
        customerId: cliente.id,
        orderId: documento.orderId,
        equipmentId: documento.equipmentId,
        workOrderId: documento.workOrderId,
      },
    });
  }

  /* favoritos */
  const produtos = await prisma.product.findMany({
    where: { slug: { startsWith: "demo-" } },
    take: 3,
    select: { id: true },
  });
  for (const produto of produtos) {
    await prisma.favorite.upsert({
      where: { customerId_productId: { customerId: cliente.id, productId: produto.id } },
      update: {},
      create: { customerId: cliente.id, productId: produto.id },
    });
  }

  /* avisos na área do cliente */
  const avisos = [
    {
      kind: "pedido",
      title: "Instalação agendada",
      body: "Nosso técnico vai até a clínica na próxima semana, às 9h.",
      href: pedidoPago ? `/minha-jb/pedidos/${pedidoPago.numero}` : "/minha-jb/pedidos",
    },
    {
      kind: "manutencao",
      title: "Preventiva chegando",
      body: "A próxima visita preventiva do contrato vence em 22 dias.",
      href: "/minha-jb/manutencoes",
    },
    {
      kind: "orcamento",
      title: "Orçamento aguardando sua resposta",
      body: "Enviamos uma proposta para a renovação da esterilização.",
      href: "/minha-jb/orcamentos",
    },
  ];

  for (const aviso of avisos) {
    const jaExiste = await prisma.notification.findFirst({
      where: { customerId: cliente.id, title: aviso.title },
    });
    if (!jaExiste) {
      await prisma.notification.create({ data: { customerId: cliente.id, ...aviso } });
    }
  }

  /* leads vindos do site */
  const leads = [
    {
      nome: "Consultório Vila Mariana",
      email: "demo.lead1@jbteste.local",
      telefone: "(11) 95555-1010",
      cidade: "São Paulo",
      estado: "SP",
      obs: "Quero orçamento de autoclave para dois consultórios.",
      status: "novo",
    },
    {
      nome: "Dra. Renata Lopes",
      email: "demo.lead2@jbteste.local",
      telefone: "(11) 95555-2020",
      cidade: "Guarulhos",
      estado: "SP",
      obs: "Tenho interesse no plano de manutenção Avançado.",
      status: "em_contato",
    },
    {
      nome: "Odonto Center ABC",
      email: "demo.lead3@jbteste.local",
      telefone: "(11) 95555-3030",
      cidade: "Santo André",
      estado: "SP",
      obs: "Compressor com ruído. Preciso de visita técnica.",
      status: "atendido",
    },
  ];

  for (const lead of leads) {
    const jaExiste = await prisma.lead.findFirst({ where: { email: lead.email } });
    if (!jaExiste) await prisma.lead.create({ data: { ...lead, notas: MARCA } });
  }

  /* suporte */
  const ticketExiste = await prisma.supportTicket.findFirst({
    where: { customerId: cliente.id },
  });
  if (!ticketExiste) {
    const ticket = await prisma.supportTicket.create({
      data: {
        number: await proximoCodigo("SUP"),
        subject: "Dúvida sobre a nota fiscal do pedido",
        status: "respondido",
        customerId: cliente.id,
        contactName: cliente.name,
        contactEmail: cliente.email,
        contactPhone: cliente.phone ?? "",
      },
    });

    await prisma.supportMessage.createMany({
      data: [
        {
          ticketId: ticket.id,
          body: "Consigo a nota fiscal em nome do CNPJ da clínica?",
          fromStaff: false,
          createdAt: dias(-2),
        },
        {
          ticketId: ticket.id,
          body: "Sim. A nota já saiu no CNPJ cadastrado e está em Documentos, na sua área.",
          fromStaff: true,
          createdAt: dias(-1),
        },
      ],
    });
  }

  /* cupons — o checkout precisa de algo para testar */
  await prisma.coupon.upsert({
    where: { code: "DEMO10" },
    update: { active: true },
    create: {
      code: "DEMO10",
      kind: "percentual",
      value: 10,
      minSubtotalCents: 100_000,
      maxUses: 100,
      endsAt: dias(90),
    },
  });

  await prisma.coupon.upsert({
    where: { code: "DEMO500" },
    update: { active: true },
    create: {
      code: "DEMO500",
      kind: "valor_fixo",
      value: 50_000,
      minSubtotalCents: 500_000,
      maxUses: 50,
      endsAt: dias(90),
    },
  });
}

/* ========================================================================== */

async function main() {
  const base = await prisma.customer.findUnique({ where: { email: EMAIL_DEMO } });
  if (!base) {
    console.error("Rode `pnpm db:demo` antes: este script complementa a vitrine.");
    process.exit(1);
  }

  await sincronizarContadores();

  console.log("→ equipe");
  const tecnicos = await montarEquipe();

  console.log("→ clientes");
  await montarClientesExtras();

  console.log("→ pedidos e pagamentos");
  const pedidos = await montarPedidos(tecnicos);

  console.log("→ chamados");
  const chamados = await montarChamados(tecnicos);

  console.log("→ ordens de serviço");
  const ordens = await montarOrdens(chamados, tecnicos);

  console.log("→ orçamentos");
  await montarOrcamentos(chamados);

  console.log("→ planos e contrato de manutenção");
  await montarManutencao(tecnicos);

  console.log("→ documentos, favoritos, leads e suporte");
  await montarAcessorios(pedidos, ordens);

  console.log("\n   ┌──────────────────────────────────────────────");
  console.log("   │ ACESSOS DE DEMONSTRAÇÃO");
  console.log(`   │ cliente:   ${EMAIL_DEMO} / ${SENHA_DEMO}`);
  for (const pessoa of EQUIPE) {
    console.log(`   │ ${pessoa.role.padEnd(9)} ${pessoa.email} / ${SENHA_DEMO}`);
  }
  console.log("   ├──────────────────────────────────────────────");
  console.log(`   │ ${pedidos.length} pedidos, ${chamados.length} chamados, ${ordens.length} OS`);
  console.log("   │ cupons: DEMO10 (10%) e DEMO500 (R$ 500)");
  console.log("   └─ remova tudo com: pnpm db:demo:limpar\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
