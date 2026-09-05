import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { BotaoImprimir } from "@/components/admin/vendas/botao-imprimir";
import { Logo } from "@/components/ui/logo";

/* ============================================================================
   Folha de impressão em papel timbrado

   POR QUE O `<style>` INLINE

   Esta página é filha de /admin, então ela nasce dentro da casca do painel —
   menu lateral, cabeçalho, tudo. No App Router um layout filho não tem como
   remover o layout do pai, e `globals.css` está congelado nesta rodada, então
   não dá para marcar a casca com `no-print` a partir daqui.

   A saída é a regra clássica de impressão: esconder tudo por visibilidade e
   trazer de volta apenas a subárvore da folha, que passa a ocupar a página
   sozinha. Vale só dentro de @media print — na tela a página continua sendo uma
   pré-visualização normal, com o painel em volta.
   ============================================================================ */

const CSS_IMPRESSAO = `
@page { size: A4; margin: 14mm; }

@media print {
  body * { visibility: hidden !important; }
  #folha-impressao, #folha-impressao * { visibility: visible !important; }
  #folha-impressao {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    box-shadow: none !important;
    background: #fff !important;
  }
  #folha-impressao .quebra { break-inside: avoid; }
  #folha-impressao table { break-inside: auto; }
  #folha-impressao tr { break-inside: avoid; }
}
`;

export type EmpresaTimbrada = {
  nome: string;
  resumo: string;
  endereco: string;
  telefone: string;
  email: string;
  site: string;
};

export function FolhaImpressao({
  voltarHref,
  voltarRotulo,
  documento,
  numero,
  empresa,
  children,
}: {
  voltarHref: string;
  voltarRotulo: string;
  /** "Pedido", "Orçamento" — o que este papel é. */
  documento: string;
  numero: string;
  empresa: EmpresaTimbrada;
  children: React.ReactNode;
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS_IMPRESSAO }} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={voltarHref}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-graf-700 transition-colors hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {voltarRotulo}
        </Link>
        <BotaoImprimir rotulo={`Imprimir ${documento.toLowerCase()}`} />
      </div>

      <div
        id="folha-impressao"
        className="mx-auto max-w-[820px] rounded-xl border border-graf-200 bg-white p-8 text-graf-900 shadow-card sm:p-10 print:rounded-none print:border-0 print:p-0 print:shadow-none"
      >
        <header className="quebra flex flex-wrap items-start justify-between gap-6 border-b-2 border-jb-500 pb-5">
          <div className="min-w-0">
            <Logo altura={44} />
            <p className="mt-3 text-sm font-semibold text-graf-900">{empresa.nome}</p>
            {empresa.endereco ? (
              <p className="text-xs leading-relaxed text-graf-600">{empresa.endereco}</p>
            ) : null}
            <p className="text-xs leading-relaxed text-graf-600">
              {[empresa.telefone, empresa.email].filter(Boolean).join(" · ")}
            </p>
            {empresa.site ? (
              <p className="text-xs leading-relaxed text-graf-600">{empresa.site}</p>
            ) : null}
          </div>

          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-widest text-graf-500">
              {documento}
            </p>
            <p className="tabular text-2xl font-bold leading-tight text-graf-950">{numero}</p>
          </div>
        </header>

        {children}

        <footer className="mt-10 border-t border-graf-200 pt-4 text-[11px] leading-relaxed text-graf-500">
          {empresa.resumo ? <p>{empresa.resumo}</p> : null}
          <p>
            Documento gerado pelo painel da {empresa.nome}. Dúvidas sobre este {documento.toLowerCase()}:{" "}
            {[empresa.telefone, empresa.email].filter(Boolean).join(" ou ")}.
          </p>
        </footer>
      </div>
    </>
  );
}

/* -------------------------------------------------------------- auxiliares */

/** Bloco rótulo/valor da folha, com tipografia menor que a do painel. */
export function DadoImpresso({
  rotulo,
  children,
}: {
  rotulo: string;
  children?: React.ReactNode;
}) {
  const vazio = children === null || children === undefined || children === "";
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-graf-500">{rotulo}</dt>
      <dd className={vazio ? "text-sm text-graf-500" : "text-sm text-graf-900"}>
        {vazio ? "—" : children}
      </dd>
    </div>
  );
}

export function SecaoImpressa({
  titulo,
  children,
  className,
}: {
  titulo: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`quebra mt-8 ${className ?? ""}`}>
      <h2 className="mb-3 border-b border-graf-200 pb-1.5 text-xs font-bold uppercase tracking-widest text-graf-600">
        {titulo}
      </h2>
      {children}
    </section>
  );
}
