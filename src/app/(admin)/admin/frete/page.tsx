import type { Metadata } from "next";
import type { ShippingKind } from "@prisma/client";
import { MapPinned, Package, Truck } from "lucide-react";

import { Indicador, Indicadores } from "@/components/admin/indicador";
import { CabecalhoPagina, ROTULO_FRETE } from "@/components/admin/vendas/comuns";
import { GestorFrete } from "@/components/admin/vendas/formulario-frete";
import { LogisticaMelhorEnvio } from "@/components/admin/vendas/logistica-melhor-envio";
import { Aviso } from "@/components/ui/aviso";
import { plural } from "@/lib/format";
import { lerMetaMelhorEnvio } from "@/lib/logistica-meta";
import { statusMelhorEnvio } from "@/lib/melhor-envio";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { getSettings, ligado } from "@/lib/settings";

export const instant = false;

export const metadata: Metadata = {
  title: "Frete",
};

function paraCampo(centavos: number | null | undefined) {
  return centavos && centavos > 0 ? (centavos / 100).toFixed(2).replace(".", ",") : "";
}

export default async function FretePage() {
  const usuario = await exigirArea("frete");

  const [perfis, semPerfil, ajustes, produtos, pedidosMe] = await Promise.all([
    prisma.shippingProfile.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      include: {
        zones: { orderBy: [{ order: "asc" }, { zipStart: "asc" }] },
        _count: { select: { products: true } },
      },
    }),
    prisma.product.count({ where: { shippingProfileId: null, status: "active" } }),
    getSettings(),
    prisma.product.findMany({
      where: { status: { not: "archived" } },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      take: 300,
      select: {
        id: true,
        name: true,
        sku: true,
        status: true,
        priceCents: true,
        weightGrams: true,
        widthMm: true,
        heightMm: true,
        depthMm: true,
      },
    }),
    prisma.order.findMany({
      where: { shippingLabel: { startsWith: "Melhor Envio · " } },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        number: true,
        status: true,
        buyerName: true,
        shippingLabel: true,
        paidAt: true,
        shipCity: true,
        shipState: true,
        internalNote: true,
      },
    }),
  ]);

  const totalZonas = perfis.reduce((soma, perfil) => soma + perfil.zones.length, 0);
  const temPadrao = perfis.some((perfil) => perfil.isDefault);
  const podeEditarFrete = podeEditar(usuario, "frete");

  return (
    <div className="space-y-8">
      <CabecalhoPagina
        titulo="Frete"
        apoio="Peso e dimensões do produto, cotação automática, transportadora, etiqueta e rastreio em um só fluxo."
      />

      <LogisticaMelhorEnvio
        podeEditar={podeEditarFrete}
        status={statusMelhorEnvio()}
        produtos={produtos}
        pedidos={pedidosMe.map((pedido) => ({
          id: pedido.id,
          number: pedido.number,
          status: pedido.status,
          buyerName: pedido.buyerName,
          shippingLabel: pedido.shippingLabel,
          paidAt: pedido.paidAt?.toISOString() ?? null,
          shipCity: pedido.shipCity,
          shipState: pedido.shipState,
          meta: lerMetaMelhorEnvio(pedido.internalNote),
        }))}
      />

      <div className="border-t border-graf-200 pt-8">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-graf-950">Tabela própria e contingência</h2>
          <p className="mt-1 text-sm text-graf-600">
            Continua ativa para entrega local e como fallback se o agregador estiver indisponível.
          </p>
        </div>

        {!temPadrao && perfis.length > 0 ? (
          <Aviso tom="atencao" titulo="Nenhum perfil marcado como padrão">
            Produtos sem perfil próprio ficam sem regra de contingência. Marque um perfil como padrão.
          </Aviso>
        ) : null}

        {semPerfil > 0 && !temPadrao ? (
          <Aviso tom="info" titulo={`${plural(semPerfil, "produto ativo", "produtos ativos")} sem perfil`} className="mt-4">
            Sem um perfil padrão, se o Melhor Envio falhar estes itens caem em frete sob análise.
          </Aviso>
        ) : null}

        <Indicadores>
          <Indicador
            rotulo="Perfis cadastrados"
            valor={perfis.length}
            icone={Truck}
            detalhe={temPadrao ? "Um deles é o padrão da loja" : "Nenhum marcado como padrão"}
          />
          <Indicador
            rotulo="Faixas de CEP"
            valor={totalZonas}
            icone={MapPinned}
            detalhe="Intervalos locais com preço e prazo"
          />
          <Indicador
            rotulo="Produtos sem perfil"
            valor={semPerfil}
            icone={Package}
            tom={semPerfil > 0 ? "aviso" : "ok"}
            detalhe="Contando só os produtos publicados"
          />
          <Indicador
            rotulo="Retirada na JB"
            valor={ligado(ajustes.retirada_disponivel) ? "Ativada" : "Desativada"}
            detalhe="Configurada em Configurações › Loja"
          />
        </Indicadores>

        <div className="mt-6">
          <GestorFrete
            podeEditar={podeEditarFrete}
            tipos={(
              [
                "retirada",
                "entrega_local",
                "transportadora",
                "gratis",
                "sob_orcamento",
                "nao_aplicavel",
              ] as ShippingKind[]
            ).map((tipo) => ({ valor: tipo, rotulo: ROTULO_FRETE[tipo] }))}
            perfis={perfis.map((perfil) => ({
              id: perfil.id,
              nome: perfil.name,
              tipo: perfil.kind,
              tipoRotulo: ROTULO_FRETE[perfil.kind],
              descricao: perfil.description,
              gratisAcimaCents: perfil.freeAboveCents,
              gratisAcima: paraCampo(perfil.freeAboveCents),
              padrao: perfil.isDefault,
              produtos: perfil._count.products,
              zonas: perfil.zones.map((zona) => ({
                id: zona.id,
                nome: zona.name,
                cepInicio: zona.zipStart,
                cepFim: zona.zipEnd,
                valorCents: zona.priceCents,
                valor: paraCampo(zona.priceCents),
                prazo: zona.etaDays != null ? String(zona.etaDays) : "",
                ordem: String(zona.order),
              })),
            }))}
          />
        </div>
      </div>
    </div>
  );
}
