/**
 * DADOS DE DEMONSTRAÇÃO — nunca rode isto em produção.
 *
 * Serve para exercitar catálogo, carrinho, pedido, equipamento e assistência
 * sem depender do cadastro real da JB. Tudo que este script cria carrega a
 * marca `DEMO`:
 *   · produtos e marcas com SKU/slug prefixados por `demo-`
 *   · cliente demo@jbteste.local
 *
 * Remover:  pnpm db:demo:limpar
 *
 * Os preços aqui são fictícios e existem só para o fluxo funcionar. O cadastro
 * real de preço é feito pela JB no painel.
 *
 *   pnpm db:demo
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Mesma sequência atômica que a aplicação usa. Não dá para importar
 * src/lib/codigos.ts aqui: ele é marcado "server-only" e só roda dentro do Next.
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

const EMAIL_DEMO = "demo@jbteste.local";
const SENHA_DEMO = "demo12345";

if (process.env.NODE_ENV === "production" && !process.env.PERMITIR_DEMO) {
  console.error("Recusado: dados de demonstração não entram em produção.");
  process.exit(1);
}

const MARCAS = [
  { slug: "demo-alt", name: "ALT" },
  { slug: "demo-schuster", name: "Schuster" },
  { slug: "demo-suctron", name: "Suctron" },
  { slug: "demo-sugmaster", name: "Sugmaster" },
];

type ProdutoDemo = {
  slug: string;
  sku: string;
  name: string;
  model: string;
  marca: string;
  categoria: string;
  condicao: "novo" | "seminovo" | "usado" | "recondicionado";
  precoCents: number;
  compareAtCents?: number;
  imagem: string;
  resumo: string;
  descricao: string;
  garantiaMeses?: number;
  voltagem?: string;
  destaque?: boolean;
  unico?: boolean;
  estoque: number;
  specs: [string, string][];
  checklist?: [string, string][];
};

const PRODUTOS: ProdutoDemo[] = [
  {
    slug: "demo-autoclave-horizontal-21l",
    sku: "DEMO-AUT-21",
    name: "Autoclave horizontal 21 litros",
    model: "Linha 21L",
    marca: "demo-alt",
    categoria: "bioseguranca",
    condicao: "novo",
    precoCents: 849000,
    compareAtCents: 929000,
    imagem: "/demo/autoclave.webp",
    resumo:
      "Autoclave de bancada para esterilização de instrumental, com ciclos programados e secagem.",
    descricao:
      "<p>Autoclave horizontal de bancada para consultório odontológico. Ciclos programados para instrumental embalado e não embalado, com etapa de secagem ao final.</p><p>A instalação e a orientação de uso podem ser contratadas junto com o equipamento.</p>",
    garantiaMeses: 12,
    voltagem: "220",
    destaque: true,
    estoque: 4,
    specs: [
      ["Capacidade", "21 litros"],
      ["Câmara", "Aço inoxidável"],
      ["Ciclos", "Instrumental embalado, não embalado e secagem"],
      ["Alimentação", "220 V"],
    ],
  },
  {
    slug: "demo-autoclave-12l-seminovo",
    sku: "DEMO-AUT-12-SN",
    name: "Autoclave 12 litros — revisada",
    model: "Linha 12L",
    marca: "demo-alt",
    categoria: "bioseguranca",
    condicao: "seminovo",
    precoCents: 419000,
    compareAtCents: 560000,
    imagem: "/demo/autoclave.webp",
    resumo:
      "Unidade única revisada na bancada da JB, com checklist de inspeção e garantia registrada.",
    descricao:
      "<p>Autoclave seminova que passou pela bancada da JB. O checklist abaixo mostra exatamente o que foi verificado e o que foi substituído nesta unidade.</p>",
    garantiaMeses: 6,
    voltagem: "220",
    destaque: true,
    unico: true,
    estoque: 1,
    specs: [
      ["Capacidade", "12 litros"],
      ["Ano de fabricação", "2021"],
      ["Ciclos registrados", "1.480"],
    ],
    checklist: [
      ["Resistência", "verificado"],
      ["Válvula de segurança", "substituido"],
      ["Vedação da porta", "substituido"],
      ["Sensor de temperatura", "verificado"],
      ["Teste de ciclo completo", "verificado"],
      ["Pintura e gabinete", "reparado"],
    ],
  },
  {
    slug: "demo-compressor-isento-de-oleo",
    sku: "DEMO-CMP-40",
    name: "Compressor odontológico isento de óleo",
    model: "2 cabeçotes",
    marca: "demo-schuster",
    categoria: "unidade-basica-de-tratamento",
    condicao: "novo",
    precoCents: 1149000,
    imagem: "/demo/compressor.webp",
    resumo: "Compressor silencioso isento de óleo, para dois consultórios.",
    descricao:
      "<p>Compressor isento de óleo, indicado para consultórios que precisam de ar limpo e seco. Reservatório com tratamento anticorrosivo.</p>",
    garantiaMeses: 12,
    voltagem: "bivolt",
    destaque: true,
    estoque: 2,
    specs: [
      ["Cabeçotes", "2"],
      ["Reservatório", "40 litros"],
      ["Consultórios atendidos", "Até 2"],
      ["Alimentação", "Bivolt"],
    ],
  },
  {
    slug: "demo-bomba-de-vacuo",
    sku: "DEMO-BMV-01",
    name: "Bomba de vácuo para sucção",
    model: "Eletrônica Plus",
    marca: "demo-suctron",
    categoria: "cirurgia",
    condicao: "novo",
    precoCents: 689000,
    imagem: "/demo/bomba-vacuo.webp",
    resumo: "Sistema de sucção com acionamento eletrônico.",
    descricao:
      "<p>Bomba de vácuo para sucção de alta potência, com acionamento eletrônico e separador de resíduos.</p>",
    garantiaMeses: 12,
    voltagem: "220",
    estoque: 3,
    specs: [
      ["Acionamento", "Eletrônico"],
      ["Consultórios atendidos", "Até 2"],
      ["Alimentação", "220 V"],
    ],
  },
  {
    slug: "demo-ultrassom-e-jato-de-bicarbonato",
    sku: "DEMO-ULT-JT",
    name: "Ultrassom com jato de bicarbonato",
    model: "Profilaxia",
    marca: "demo-schuster",
    categoria: "profilaxia",
    condicao: "novo",
    precoCents: 529000,
    imagem: "/demo/ultrassom.webp",
    resumo: "Aparelho combinado de ultrassom e jato para profilaxia.",
    descricao:
      "<p>Equipamento combinado para raspagem ultrassônica e profilaxia com jato de bicarbonato, com reservatório removível.</p>",
    garantiaMeses: 12,
    voltagem: "bivolt",
    destaque: true,
    estoque: 5,
    specs: [
      ["Funções", "Ultrassom e jato de bicarbonato"],
      ["Reservatório", "Removível"],
      ["Alimentação", "Bivolt"],
    ],
  },
  {
    slug: "demo-aspirador-cirurgico",
    sku: "DEMO-ASP-01",
    name: "Aspirador cirúrgico móvel",
    model: "Móvel",
    marca: "demo-sugmaster",
    categoria: "cirurgia",
    condicao: "novo",
    precoCents: 389000,
    imagem: "/demo/aspirador.webp",
    resumo: "Aspirador cirúrgico com frasco coletor e suporte móvel.",
    descricao:
      "<p>Aspirador cirúrgico com frasco coletor autoclavável e estrutura móvel, para procedimentos que exigem sucção contínua.</p>",
    garantiaMeses: 12,
    voltagem: "220",
    estoque: 2,
    specs: [
      ["Frasco coletor", "Autoclavável"],
      ["Estrutura", "Móvel, com rodízios"],
      ["Alimentação", "220 V"],
    ],
  },
];

async function main() {
  console.log("→ marcas");
  for (const [i, marca] of MARCAS.entries()) {
    await prisma.brand.upsert({
      where: { slug: marca.slug },
      update: { name: marca.name },
      create: { ...marca, order: i, published: true },
    });
  }

  console.log("→ produtos");
  const servicos = await prisma.service.findMany({
    where: { slug: { in: ["instalacao-jb", "manutencao-preventiva", "orientacao-de-uso"] } },
  });

  for (const produto of PRODUTOS) {
    const marca = await prisma.brand.findUnique({ where: { slug: produto.marca } });
    const categoria = await prisma.category.findUnique({ where: { slug: produto.categoria } });

    const midia = await prisma.media.upsert({
      where: { id: `demo-${produto.sku}` },
      update: { url: produto.imagem, alt: produto.name },
      create: {
        id: `demo-${produto.sku}`,
        filename: produto.imagem.split("/").pop() ?? "demo.webp",
        url: produto.imagem,
        alt: produto.name,
        mime: "image/webp",
        size: 0,
        width: 1000,
        height: 1000,
        folder: "demo",
      },
    });

    const criado = await prisma.product.upsert({
      where: { slug: produto.slug },
      update: {
        priceCents: produto.precoCents,
        stock: produto.estoque,
        status: "active",
      },
      create: {
        slug: produto.slug,
        sku: produto.sku,
        name: produto.name,
        model: produto.model,
        shortDescription: produto.resumo,
        description: produto.descricao,
        status: "active",
        publishedAt: new Date(),
        condition: produto.condicao,
        featured: produto.destaque ?? false,
        brandId: marca?.id ?? null,
        categoryId: categoria?.id ?? null,
        priceCents: produto.precoCents,
        compareAtCents: produto.compareAtCents ?? null,
        trackInventory: true,
        unique: produto.unico ?? false,
        stock: produto.estoque,
        warrantyMonths: produto.garantiaMeses ?? null,
        voltage: produto.voltagem ?? null,
        allowDirectPurchase: true,
        allowQuoteRequest: true,
        seoTitle: produto.name,
        seoDescription: produto.resumo,
      },
    });

    await prisma.productMedia.upsert({
      where: { productId_mediaId: { productId: criado.id, mediaId: midia.id } },
      update: {},
      create: { productId: criado.id, mediaId: midia.id, alt: produto.name, order: 0 },
    });

    await prisma.productSpec.deleteMany({ where: { productId: criado.id } });
    await prisma.productSpec.createMany({
      data: produto.specs.map(([label, value], i) => ({
        productId: criado.id,
        label,
        value,
        order: i,
      })),
    });

    // serviços que a JB oferece junto deste equipamento
    for (const [i, servico] of servicos.entries()) {
      await prisma.productAddon.upsert({
        where: { productId_serviceId: { productId: criado.id, serviceId: servico.id } },
        update: {},
        create: {
          productId: criado.id,
          serviceId: servico.id,
          priceCents: servico.slug === "instalacao-jb" ? 45000 : servico.slug === "manutencao-preventiva" ? 32000 : 0,
          order: i,
        },
      });
    }

    // unidade única com checklist de revisão — o diferencial do Seminovo JB
    if (produto.checklist) {
      const unidade = await prisma.inventoryUnit.findFirst({ where: { productId: criado.id } });
      const registro =
        unidade ??
        (await prisma.inventoryUnit.create({
          data: {
            productId: criado.id,
            serialNumber: "DEMO-SN-0001",
            status: "disponivel",
            manufactureYear: 2021,
            usageCycles: 1480,
            conditionNotes: "Marcas leves de uso no gabinete. Funcionamento testado ciclo a ciclo.",
            inspectionNotes: "Revisão completa realizada na bancada da JB.",
            warrantyMonths: produto.garantiaMeses ?? null,
          },
        }));

      await prisma.inventoryCheckItem.deleteMany({ where: { unitId: registro.id } });
      await prisma.inventoryCheckItem.createMany({
        data: produto.checklist.map(([label, result], i) => ({
          unitId: registro.id,
          label,
          result,
          order: i,
        })),
      });
    }
  }

  /* ------------------------------------------------------------- cliente */
  console.log("→ cliente de demonstração");
  const cliente = await prisma.customer.upsert({
    where: { email: EMAIL_DEMO },
    update: {},
    create: {
      name: "Maria Fernandes",
      email: EMAIL_DEMO,
      passwordHash: await bcrypt.hash(SENHA_DEMO, 12),
      phone: "(11) 98888-1234",
      personType: "juridica",
      document: "12345678000199",
      companyName: "Clínica Fernandes Odontologia Ltda",
      tradeName: "Clínica Fernandes",
    },
  });

  const endereco = await prisma.customerAddress.findFirst({ where: { customerId: cliente.id } });
  const enderecoDemo =
    endereco ??
    (await prisma.customerAddress.create({
      data: {
        customerId: cliente.id,
        label: "Clínica",
        recipient: "Maria Fernandes",
        zip: "05045000",
        street: "Rua Demonstração",
        number: "100",
        district: "Água Branca",
        city: "São Paulo",
        state: "SP",
        isDefault: true,
      },
    }));

  const unidade = await prisma.customerLocation.findFirst({ where: { customerId: cliente.id } });
  const unidadeDemo =
    unidade ??
    (await prisma.customerLocation.create({
      data: {
        customerId: cliente.id,
        name: "Clínica Fernandes — unidade Lapa",
        addressId: enderecoDemo.id,
      },
    }));

  /* --------------------------------------------------------- equipamento */
  console.log("→ equipamento com prontuário");
  const autoclave = await prisma.product.findUnique({
    where: { slug: "demo-autoclave-horizontal-21l" },
  });

  const jaTem = await prisma.equipment.findFirst({ where: { customerId: cliente.id } });
  const equipamento =
    jaTem ??
    (await prisma.equipment.create({
      data: {
        customerId: cliente.id,
        name: "Autoclave horizontal 21 litros",
        brandName: "ALT",
        modelName: "Linha 21L",
        serialNumber: "DEMO-EQ-0001",
        voltage: "220",
        productId: autoclave?.id ?? null,
        categoryId: autoclave?.categoryId ?? null,
        locationId: unidadeDemo.id,
        room: "Sala de esterilização",
        origin: "compra_jb",
        status: "operacional",
        condition: "novo",
        purchasedAt: new Date(Date.now() - 320 * 86400000),
        installedAt: new Date(Date.now() - 310 * 86400000),
        warrantyUntil: new Date(Date.now() + 45 * 86400000),
        lastMaintenanceAt: new Date(Date.now() - 150 * 86400000),
        nextMaintenanceAt: new Date(Date.now() + 22 * 86400000),
        maintenanceIntervalDays: 180,
      },
    }));

  const temEventos = await prisma.equipmentEvent.count({ where: { equipmentId: equipamento.id } });
  if (temEventos === 0) {
    await prisma.equipmentEvent.createMany({
      data: [
        {
          equipmentId: equipamento.id,
          kind: "compra",
          title: "Equipamento adquirido na JB",
          happenedAt: new Date(Date.now() - 320 * 86400000),
        },
        {
          equipmentId: equipamento.id,
          kind: "instalacao",
          title: "Instalação concluída",
          description: "Instalado e testado por técnico da JB, com orientação à equipe.",
          happenedAt: new Date(Date.now() - 310 * 86400000),
        },
        {
          equipmentId: equipamento.id,
          kind: "manutencao",
          title: "Manutenção preventiva realizada",
          description: "Troca de vedação e teste de ciclo completo.",
          happenedAt: new Date(Date.now() - 150 * 86400000),
        },
      ],
    });
  }

  /* -------------------------------------------------------------- chamado */
  console.log("→ chamado de assistência");
  const chamadoExiste = await prisma.serviceRequest.findFirst({
    where: { customerId: cliente.id },
  });
  if (!chamadoExiste) {
    const chamado = await prisma.serviceRequest.create({
      data: {
        number: await proximoCodigo("AT"),
        status: "em_diagnostico",
        customerId: cliente.id,
        equipmentId: equipamento.id,
        contactName: cliente.name,
        contactEmail: cliente.email,
        contactPhone: cliente.phone,
        categoryId: equipamento.categoryId,
        brandName: "ALT",
        modelName: "Linha 21L",
        problemKind: "nao_completa_ciclo",
        description:
          "A autoclave não completa o ciclo e apita no fim da secagem. O problema começou na semana passada.",
        urgency: "alta",
        addressZip: enderecoDemo.zip,
        addressStreet: enderecoDemo.street,
        addressNumber: enderecoDemo.number,
        addressDistrict: enderecoDemo.district,
        addressCity: enderecoDemo.city,
        addressState: enderecoDemo.state,
        availability: "Manhãs, de segunda a quarta",
      },
    });

    await prisma.serviceRequestEvent.createMany({
      data: [
        {
          requestId: chamado.id,
          status: "solicitacao_recebida",
          title: "Chamado recebido",
          message: "Recebemos sua solicitação e ela entrou na fila de triagem.",
          createdAt: new Date(Date.now() - 3 * 86400000),
        },
        {
          requestId: chamado.id,
          status: "triagem",
          title: "Em triagem",
          message: "A equipe está avaliando o relato para definir a visita.",
          createdAt: new Date(Date.now() - 2 * 86400000),
        },
        {
          requestId: chamado.id,
          status: "em_diagnostico",
          title: "Em diagnóstico",
          message: "Técnico avaliando o equipamento no local.",
          createdAt: new Date(Date.now() - 1 * 86400000),
        },
      ],
    });
  }

  console.log("\n   ┌──────────────────────────────────────────────");
  console.log("   │ CLIENTE DE DEMONSTRAÇÃO");
  console.log(`   │ e-mail: ${EMAIL_DEMO}`);
  console.log(`   │ senha:  ${SENHA_DEMO}`);
  console.log("   └─ remova tudo com: pnpm db:demo:limpar\n");
  console.log("Pronto.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
