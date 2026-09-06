import { PackageCheck, Plug, ShieldCheck, Store, Truck, Wrench } from "lucide-react";

import { formatarPreco } from "@/lib/format";

/* ============================================================================
   Condições desta compra

   O que muda de equipamento para equipamento: garantia, frete, retirada,
   voltagem. Cada linha existe apenas se o campo correspondente está
   preenchido no cadastro ou na configuração da loja — a lista encolhe em vez
   de exibir travessão.

   Sem moldura de propósito: este bloco corre logo abaixo da caixa de compra,
   e uma segunda borda ali dentro faria a coluna virar uma pilha de cartões.
   Fio fino entre as linhas basta.

   A única linha fixa é a assistência própria, porque é fato da JB: quem vende
   é a mesma equipe técnica que atende depois.
   ============================================================================ */

export type PerfilDeFrete = {
  nome: string;
  tipo: string;
  descricao: string;
  gratisAcimaCents: number | null;
};

/** Leitura em português de cada tipo de perfil de frete cadastrado. */
const TIPO_DE_FRETE: Record<string, string> = {
  retirada: "Retirada no endereço da JB.",
  entrega_local: "Entrega feita pela própria equipe da JB.",
  transportadora: "Envio por transportadora.",
  sob_orcamento: "O valor do frete é fechado depois da análise do pedido.",
  gratis: "Frete incluído no preço.",
  nao_aplicavel: "",
};

type Linha = {
  icone: React.ComponentType<{ className?: string }>;
  titulo: string;
  detalhe?: string;
};

export function CondicoesDeCompra({
  garantiaMeses,
  garantiaDaUnidade,
  frete,
  retirada,
  voltagem,
}: {
  garantiaMeses: number | null;
  /** `true` quando a garantia veio da unidade física, não do modelo. */
  garantiaDaUnidade?: boolean;
  frete: PerfilDeFrete | null;
  /** Instruções de retirada, quando a JB aceita retirada no local. */
  retirada: string | null;
  voltagem: string | null;
}) {
  const linhas: Linha[] = [];

  if (garantiaMeses && garantiaMeses > 0) {
    linhas.push({
      icone: ShieldCheck,
      titulo: `Garantia de ${garantiaMeses} ${garantiaMeses === 1 ? "mês" : "meses"}`,
      detalhe: garantiaDaUnidade
        ? "Registrada para esta unidade específica."
        : undefined,
    });
  }

  if (frete && frete.tipo !== "nao_aplicavel") {
    const explicacao = frete.descricao.trim() || TIPO_DE_FRETE[frete.tipo] || "";
    linhas.push({
      icone: frete.tipo === "retirada" ? Store : Truck,
      titulo: frete.nome,
      detalhe: [
        explicacao,
        frete.gratisAcimaCents && frete.gratisAcimaCents > 0
          ? `Frete incluído em pedidos acima de ${formatarPreco(frete.gratisAcimaCents)}.`
          : "",
      ]
        .filter(Boolean)
        .join(" "),
    });
  }

  // Quando o próprio perfil de frete já é "retirada", a linha da configuração
  // repetiria o mesmo recado com outras palavras.
  if (retirada && frete?.tipo !== "retirada") {
    linhas.push({
      icone: PackageCheck,
      titulo: "Retirada no local",
      detalhe: retirada,
    });
  }

  if (voltagem) {
    linhas.push({
      icone: Plug,
      titulo: voltagem === "bivolt" ? "Bivolt" : `Alimentação em ${voltagem} V`,
      detalhe: "Confira a rede elétrica da sala antes de fechar o pedido.",
    });
  }

  linhas.push({
    icone: Wrench,
    titulo: "Assistência técnica própria",
    detalhe: "A mesma equipe que vende é a que atende o equipamento depois.",
  });

  return (
    <section aria-labelledby="condicoes-desta-compra">
      <h2
        id="condicoes-desta-compra"
        className="text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-graf-500"
      >
        Condições desta compra
      </h2>
      <ul className="mt-3 divide-y divide-graf-200 border-t border-graf-200">
        {linhas.map((linha) => {
          const Icone = linha.icone;
          return (
            <li key={linha.titulo} className="flex gap-3 py-3.5">
              <Icone className="mt-0.5 size-[18px] shrink-0 text-graf-500" aria-hidden />
              <div className="min-w-0">
                <p className="text-[0.9375rem] font-semibold text-graf-900">
                  {linha.titulo}
                </p>
                {linha.detalhe ? (
                  <p className="mt-0.5 text-sm leading-relaxed text-graf-500">
                    {linha.detalhe}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
