from pathlib import Path


def patch(path: str, old: str, new: str, count: int = 1):
    p = Path(path)
    text = p.read_text()
    found = text.count(old)
    if found < count:
        raise SystemExit(
            f"{path}: esperado >= {count} ocorrência(s), achei {found}: {old[:100]!r}"
        )
    p.write_text(text.replace(old, new, count))


# ---------------------------------------------------------------- schema
patch(
    "prisma/schema.prisma",
    "  condition        ProductCondition @default(novo)\n  featured         Boolean          @default(false)",
    "  condition        ProductCondition @default(novo)\n"
    "  /// Define explicitamente se a compra gera prontuário técnico na Área da Clínica.\n"
    "  /// Peças, acessórios e consumíveis continuam sendo Product, mas ficam false.\n"
    "  isEquipment      Boolean          @default(true)\n"
    "  featured         Boolean          @default(false)",
)
patch(
    "prisma/schema.prisma",
    "  condition      ProductCondition?\n  imageUrl       String            @default(\"\")",
    "  condition      ProductCondition?\n"
    "  /// Snapshot: editar o produto depois da venda não muda o pós-venda do pedido antigo.\n"
    "  isEquipment    Boolean             @default(false)\n"
    "  imageUrl       String            @default(\"\")",
)

migration = Path("prisma/migrations/20260910001500_produto_gera_prontuario/migration.sql")
migration.parent.mkdir(parents=True, exist_ok=True)
migration.write_text(
    "-- Produto físico vendável não é necessariamente equipamento técnico.\n"
    'ALTER TABLE "Product" ADD COLUMN "isEquipment" BOOLEAN NOT NULL DEFAULT true;\n\n'
    "-- O pedido guarda a decisão histórica; serviços permanecem false.\n"
    'ALTER TABLE "OrderItem" ADD COLUMN "isEquipment" BOOLEAN NOT NULL DEFAULT false;\n'
    'UPDATE "OrderItem" SET "isEquipment" = true WHERE "kind" = \'produto\';\n'
)

# ---------------------------------------------------------- admin action
patch(
    "src/app/acoes/admin-catalogo.ts",
    "  condition: z.enum(CONDICOES),\n  status: z.enum(STATUS_PRODUTO),\n  categoryId: idOpcional,",
    "  condition: z.enum(CONDICOES),\n  isEquipment: marcado,\n  status: z.enum(STATUS_PRODUTO),\n  categoryId: idOpcional,",
)
patch(
    "src/app/acoes/admin-catalogo.ts",
    '    condition: campo(formData, "condition"),\n    status: campo(formData, "status"),\n    categoryId: campo(formData, "categoryId"),',
    '    condition: campo(formData, "condition"),\n    isEquipment: campo(formData, "isEquipment"),\n    status: campo(formData, "status"),\n    categoryId: campo(formData, "categoryId"),',
)
patch(
    "src/app/acoes/admin-catalogo.ts",
    "        condition: dados.data.condition,\n        status: dados.data.status,\n        categoryId: dados.data.categoryId,",
    "        condition: dados.data.condition,\n        isEquipment: dados.data.isEquipment,\n        status: dados.data.status,\n        categoryId: dados.data.categoryId,",
)
patch(
    "src/app/acoes/admin-catalogo.ts",
    "  condition: z.enum(CONDICOES),\n  status: z.enum(STATUS_PRODUTO),\n  featured: marcado,",
    "  condition: z.enum(CONDICOES),\n  isEquipment: marcado,\n  status: z.enum(STATUS_PRODUTO),\n  featured: marcado,",
)
patch(
    "src/app/acoes/admin-catalogo.ts",
    '    condition: campo(formData, "condition"),\n    status: campo(formData, "status"),\n    featured: campo(formData, "featured"),',
    '    condition: campo(formData, "condition"),\n    isEquipment: campo(formData, "isEquipment"),\n    status: campo(formData, "status"),\n    featured: campo(formData, "featured"),',
)
patch(
    "src/app/acoes/admin-catalogo.ts",
    "      condition: true,\n      status: true,\n      featured: true,\n      publishedAt: true,",
    "      condition: true,\n      isEquipment: true,\n      status: true,\n      featured: true,\n      publishedAt: true,",
    count=2,
)
patch(
    "src/app/acoes/admin-catalogo.ts",
    "        condition: dados.data.condition,\n        status: dados.data.status,\n        featured: dados.data.featured,",
    "        condition: dados.data.condition,\n        isEquipment: dados.data.isEquipment,\n        status: dados.data.status,\n        featured: dados.data.featured,",
)
patch(
    "src/app/acoes/admin-catalogo.ts",
    "          condition: origem.condition,\n          featured: false,",
    "          condition: origem.condition,\n          isEquipment: origem.isEquipment,\n          featured: false,",
)

# --------------------------------------------------------------- admin UI
patch(
    "src/components/admin/catalogo/formulario-produto-basico.tsx",
    "  condition: string;\n  status: string;",
    "  condition: string;\n  isEquipment: boolean;\n  status: string;",
)
patch(
    "src/components/admin/catalogo/formulario-produto-basico.tsx",
    '            <Marcador\n              name="featured"',
    '            <Marcador\n'
    '              name="isEquipment"\n'
    '              value="on"\n'
    '              defaultChecked={produto.isEquipment}\n'
    '              rotulo="Gera prontuário técnico após a compra"\n'
    '              ajuda="Ative para equipamentos. Desative para peças, acessórios e consumíveis: eles continuam no pedido, mas não entram no parque técnico da clínica."\n'
    '            />\n\n'
    '            <Marcador\n              name="featured"',
)
patch(
    "src/components/admin/catalogo/formulario-novo-produto.tsx",
    'import { Campo, Selecao } from "@/components/ui/form";',
    'import { Campo, Marcador, Selecao } from "@/components/ui/form";',
)
patch(
    "src/components/admin/catalogo/formulario-novo-produto.tsx",
    "        </Grade>\n\n        <BarraSalvar>",
    "        </Grade>\n\n"
    "        <Marcador\n"
    '          name="isEquipment"\n'
    '          value="on"\n'
    "          defaultChecked\n"
    '          rotulo="Gera prontuário técnico após a compra"\n'
    '          ajuda="Deixe ativo para equipamentos. Desative para peças, acessórios e consumíveis."\n'
    "        />\n\n"
    "        <BarraSalvar>",
)
patch(
    "src/app/(admin)/admin/produtos/[id]/page.tsx",
    "            condition: produto.condition,\n            status: produto.status,",
    "            condition: produto.condition,\n            isEquipment: produto.isEquipment,\n            status: produto.status,",
)

# -------------------------------------------------------- pedido snapshot
patch(
    "src/lib/pedido-base.ts",
    '            condition: produto?.condition ?? null,\n            imageUrl: produto?.media[0]?.media.url ?? "",',
    '            condition: produto?.condition ?? null,\n            isEquipment: produto?.isEquipment ?? false,\n            imageUrl: produto?.media[0]?.media.url ?? "",',
)
patch(
    "src/lib/pedido-base.ts",
    '      if (item.kind !== "produto" || !item.product) continue;',
    '      if (item.kind !== "produto" || !item.product || !item.isEquipment) continue;',
)
patch(
    "src/lib/pedido-base.ts",
    '        body: "Já estamos preparando seu equipamento.",',
    '        body: pedido.items.some((item) => item.kind === "produto" && item.isEquipment)\n'
    '          ? "Já estamos preparando seu equipamento."\n'
    '          : "Já estamos preparando seu pedido.",',
)
patch(
    "src/lib/orcamento.ts",
    "        condition: produto?.condition ?? null,\n        // preço da proposta, não o da vitrine",
    "        condition: produto?.condition ?? null,\n        isEquipment: produto?.isEquipment ?? false,\n        // preço da proposta, não o da vitrine",
)

# --------------------------------------------------------------- PDP
patch(
    "src/app/(vitrine)/loja/[slug]/page.tsx",
    '  const geraEquipamentoNoPosCompra = produto.condition !== "novo" || produto.trackInventory;',
    '  const geraEquipamentoNoPosCompra = produto.isEquipment;',
)
patch(
    "src/app/(vitrine)/loja/[slug]/layout.tsx",
    "      condition: true,\n      trackInventory: true,",
    "      condition: true,\n      isEquipment: true,\n      trackInventory: true,",
)
patch(
    "src/app/(vitrine)/loja/[slug]/layout.tsx",
    '  const geraEquipamento = produto.condition !== "novo" || produto.trackInventory;',
    '  const geraEquipamento = produto.isEquipment;',
)

# ----------------------------------------------- prova de regressão real
p = Path("scripts/prova-atomicidade.ts")
text = p.read_text()
anchor = '  console.log(`\\n${falhas === 0 ? "TUDO OK" : `${falhas} FALHA(S)`}\\n`);'
if anchor not in text:
    raise SystemExit("scripts/prova-atomicidade.ts: âncora final não encontrada")
scenario = """

  console.log("\\n5. item marcado como não equipamento não cria prontuário técnico");
  {
    const { pedido, cliente } = await pedidoDescartavel(1);
    await prisma.orderItem.updateMany({
      where: { orderId: pedido.id, kind: "produto" },
      data: { isEquipment: false },
    });

    await confirmarPagamento(pedido.id);

    const equipamentos = await prisma.equipment.count({ where: { orderId: pedido.id } });
    const aviso = await prisma.notification.findFirst({
      where: { customerId: cliente.id, title: { contains: pedido.number } },
      select: { body: true },
    });
    conferir("não criou equipamento", equipamentos === 0, `${equipamentos}`);
    conferir(
      "mensagem fala em pedido, não equipamento",
      aviso?.body === "Já estamos preparando seu pedido.",
      aviso?.body ?? "sem aviso",
    );

    await limpar(pedido.id, cliente.id, pedido.number);
  }
"""
p.write_text(text.replace(anchor, scenario + "\n" + anchor, 1))

# O aplicador não permanece na branch final.
Path(".github/workflows/aplicar-is-equipment.yml").unlink(missing_ok=True)
Path(".github/scripts/aplicar_is_equipment.py").unlink(missing_ok=True)
