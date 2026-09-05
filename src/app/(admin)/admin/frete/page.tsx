import type { Metadata } from "next";
import type { ShippingKind } from "@prisma/client";
import { MapPinned, Package, Truck } from "lucide-react";

import { Indicador, Indicadores } from "@/components/admin/indicador";
import { CabecalhoPagina, ROTULO_FRETE } from "@/components/admin/vendas/comuns";
import { GestorFrete } from "@/components/admin/vendas/formulario-frete";
import { Aviso } from "@/components/ui/aviso";
import { plural } from "@/lib/format";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { getSettings, ligado } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Frete",
};

/**
 * Perfis de frete e faixas de CEP.
 *
 * A guarda usa a área "configuracoes" porque é lá que a descrição do próprio
 * mapa de permissões coloca o frete — junto de pagamento e dados da empresa.
 * Na prática, isso restringe a tela a administradores.
 */

/** Centavos no formato do campo de texto do formulário. */
function paraCampo(centavos: number | null | undefined) {
  return centavos && centavos > 0 ? (centavos / 100).toFixed(2).replace(".", ",") : "";
}

export default async function FretePage() {
  const usuario = await exigirArea("configuracoes");

  const [perfis, semPerfil, ajustes] = await Promise.all([
    prisma.shippingProfile.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      include: {
        zones: { orderBy: [{ order: "asc" }, { zipStart: "asc" }] },
        _count: { select: { products: true } },
      },
    }),
    prisma.product.count({ where: { shippingProfileId: null, status: "active" } }),
    getSettings(),
  ]);

  const totalZonas = perfis.reduce((soma, perfil) => soma + perfil.zones.length, 0);
  const temPadrao = perfis.some((perfil) => perfil.isDefault);

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Frete"
        apoio="Como cada produto chega ao cliente: retirada, entrega local, transportadora ou combinação."
      />

      {!temPadrao && perfis.length > 0 ? (
        <Aviso tom="atencao" titulo="Nenhum perfil marcado como padrão">
          Produtos sem perfil próprio ficam sem regra de entrega. Marque um perfil como padrão
          para cobrir esses casos.
        </Aviso>
      ) : null}

      {semPerfil > 0 && !temPadrao ? (
        <Aviso tom="info" titulo={`${plural(semPerfil, "produto ativo", "produtos ativos")} sem perfil`}>
          Eles caem na regra padrão da loja. Enquanto não houver perfil padrão, a entrega
          desses itens precisa ser combinada caso a caso.
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
          detalhe="Intervalos com preço e prazo definidos"
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

      <GestorFrete
        podeEditar={podeEditar(usuario, "configuracoes")}
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
  );
}
