import { PackageCheck, Plug, ShieldCheck, Store, Truck } from "lucide-react";

import { formatarPreco } from "@/lib/format";

/* ============================================================================
   Condições desta compra

   O bloco funciona como um resumo operacional da compra. Em vez de uma lista
   longa, cada condição vira uma célula curta e comparável: garantia, frete,
   retirada, alimentação e assistência. Isso deixa a primeira dobra mais
   escaneável e cria um padrão visual único para todo o catálogo.
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

  return (
    <section
      aria-labelledby="condicoes-desta-compra"
      className="overflow-hidden rounded-2xl border border-graf-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
    >
      <header className="border-b border-graf-200 bg-graf-50/70 px-5 py-4">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-jb-700">
          Compra segura
        </p>
        <h2 id="condicoes-desta-compra" className="mt-1 text-[0.9375rem] font-bold text-graf-950">
          Condições deste equipamento
        </h2>
      </header>

      <ul className="grid sm:grid-cols-2">
        {linhas.map((linha, indice) => {
          const Icone = linha.icone;
          return (
            <li
              key={linha.titulo}
              className={`flex min-w-0 gap-3 border-graf-200 px-5 py-4 ${
                indice >= 2 ? "border-t" : ""
              } ${indice % 2 === 1 ? "sm:border-l" : ""} ${
                indice === 1 ? "border-t sm:border-t-0" : ""
              }`}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-jb-50 text-jb-700">
                <Icone className="size-[17px]" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[0.875rem] font-bold leading-5 text-graf-950">{linha.titulo}</p>
                {linha.detalhe ? (
                  <p className="mt-1 text-[0.8125rem] leading-5 text-graf-500">{linha.detalhe}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
