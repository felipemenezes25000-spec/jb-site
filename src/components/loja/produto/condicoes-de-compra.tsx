import { PackageCheck, Plug, ShieldCheck, Store, Truck } from "lucide-react";

import { formatarPreco } from "@/lib/format";

/* ============================================================================
   Condições desta compra

   Esta área já vive dentro de "Entrega, garantia e suporte". Evitamos repetir
   um grande cabeçalho interno: as condições viram uma grade operacional curta,
   com foco em prazo, cobertura e retirada.
   ============================================================================ */

export type PerfilDeFrete = {
  nome: string;
  tipo: string;
  descricao: string;
  gratisAcimaCents: number | null;
};

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
  garantiaDaUnidade?: boolean;
  frete: PerfilDeFrete | null;
  retirada: string | null;
  voltagem: string | null;
}) {
  const linhas: Linha[] = [];

  if (garantiaMeses && garantiaMeses > 0) {
    linhas.push({
      icone: ShieldCheck,
      titulo: `${garantiaMeses} ${garantiaMeses === 1 ? "mês" : "meses"} de garantia`,
      detalhe: garantiaDaUnidade
        ? "Cobertura registrada para esta unidade."
        : "Prazo informado para este equipamento.",
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
          ? `Frete incluído acima de ${formatarPreco(frete.gratisAcimaCents)}.`
          : "",
      ]
        .filter(Boolean)
        .join(" "),
    });
  }

  if (retirada && frete?.tipo !== "retirada") {
    linhas.push({
      icone: PackageCheck,
      titulo: "Retirada disponível",
      detalhe: retirada,
    });
  }

  if (voltagem) {
    linhas.push({
      icone: Plug,
      titulo: voltagem === "bivolt" ? "Bivolt" : `${voltagem} V`,
      detalhe: "Confira a rede elétrica da sala antes da compra.",
    });
  }

  if (linhas.length === 0) return null;

  return (
    <section aria-label="Condições deste equipamento" className="overflow-hidden rounded-xl border border-graf-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-graf-200 px-4 py-3 sm:px-5">
        <div>
          <p className="text-[0.625rem] font-bold uppercase tracking-[0.09em] text-jb-700">
            Compra segura
          </p>
          <p className="mt-0.5 text-[0.875rem] font-extrabold text-graf-950">
            Condições deste equipamento
          </p>
        </div>
        <span className="rounded-full bg-graf-50 px-2.5 py-1 text-[0.6875rem] font-semibold text-graf-500">
          {linhas.length} {linhas.length === 1 ? "ponto" : "pontos"}
        </span>
      </div>

      <ul className="grid sm:grid-cols-2">
        {linhas.map((linha, indice) => {
          const Icone = linha.icone;
          return (
            <li
              key={linha.titulo}
              className={`flex min-w-0 gap-2.5 border-graf-200 px-4 py-3 sm:px-5 ${
                indice >= 2 ? "border-t" : ""
              } ${indice % 2 === 1 ? "sm:border-l" : ""} ${
                indice === 1 ? "border-t sm:border-t-0" : ""
              }`}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-jb-50 text-jb-700">
                <Icone className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[0.8125rem] font-extrabold leading-5 text-graf-950">{linha.titulo}</p>
                {linha.detalhe ? (
                  <p className="mt-0.5 text-[0.75rem] leading-4 text-graf-500">{linha.detalhe}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
