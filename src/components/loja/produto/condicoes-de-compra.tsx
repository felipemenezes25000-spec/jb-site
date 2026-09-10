import { PackageCheck, Plug, ShieldCheck, Store, Truck } from "lucide-react";

import { formatarPreco } from "@/lib/format";

export type PerfilDeFrete = {
  nome: string;
  tipo: string;
  descricao: string;
  gratisAcimaCents: number | null;
};

const TIPO_DE_FRETE: Record<string, string> = {
  retirada: "Retirada no endereço da JB.",
  entrega_local: "Entrega feita pela equipe da JB.",
  transportadora: "Envio por transportadora.",
  sob_orcamento: "O frete é confirmado antes da cobrança.",
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
        ? "Cobertura desta unidade específica."
        : "Prazo de garantia informado para este produto.",
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
          ? `Grátis acima de ${formatarPreco(frete.gratisAcimaCents)}.`
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
      titulo: voltagem.toLowerCase() === "bivolt" ? "Bivolt" : `${voltagem} V`,
      detalhe: "Confira a alimentação elétrica antes da compra.",
    });
  }

  if (linhas.length === 0) return null;

  return (
    <section aria-label="Condições do produto" className="border-y border-graf-200">
      <ul className="divide-y divide-graf-150">
        {linhas.map((linha) => {
          const Icone = linha.icone;
          return (
            <li key={linha.titulo} className="flex min-w-0 items-start gap-3 py-3.5">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-graf-50 text-jb-700">
                <Icone className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-5 text-graf-950">{linha.titulo}</p>
                {linha.detalhe ? (
                  <p className="mt-0.5 text-xs leading-5 text-graf-500">{linha.detalhe}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
