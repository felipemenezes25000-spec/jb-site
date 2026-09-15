import { CircleSlash, ClipboardCheck, RefreshCw, ShieldCheck, Wrench } from "lucide-react";

import type { CondicaoProduto } from "@/components/loja/produto/condicao";
import type { CertificadoDaUnidade } from "@/components/loja/produto/selo-certificado";
import { SeloCertificado } from "@/components/loja/produto/selo-certificado";
import { cn } from "@/lib/utils";

/* ============================================================================
   Laudo de inspeção desta unidade

   Esta seção já existiu, foi retirada da vitrine e o componente ficou como um
   `return null` — mas as frases que apontavam para ela continuaram no ar. A
   caixa de condição dizia "O laudo de inspeção desta unidade está mais abaixo"
   e a resposta do FAQ dizia "está nesta página, item a item". Não estava: a
   auditoria varreu a árvore inteira do DOM e não achou nada.

   É o pior tipo de defeito que esta loja pode ter, porque o laudo não é um
   detalhe da página — é o argumento central da marca. "Não vendemos caixa
   fechada. Vendemos certeza." A página prometia a prova e não entregava.

   O que a seção mostra, e por quê:

   · **O checklist item a item.** Selo de porta: substituído. Resistência:
     substituída. Ciclo 134 °C: aprovado. É isso que separa um seminovo com
     procedência de um anúncio de mercado cinza, e é a única parte da página
     que nenhum concorrente consegue copiar sem ter a bancada.

   · **Item não aplicável aparece como não aplicável.** Nunca somado aos
     aprovados. A contagem vem carimbada de `contarChecklist` no fechamento da
     inspeção, e a frase vem pronta de `frasedaVerificacao`.

   · **As notas da equipe, como foram escritas.** Estado de conservação e nota
     de inspeção são texto da bancada, não marketing.

   · **Quando não há laudo, a seção diz que não há.** Silenciar seria voltar ao
     problema: a condição da unidade não é assunto opcional num equipamento
     usado. Sem checklist, a página oferece o caminho — pedir o laudo à equipe.
   ============================================================================ */

export type ItemDeChecklist = {
  id: string;
  rotulo: string;
  resultado: string;
  nota: string;
};

type Props = {
  id?: string;
  condicao: CondicaoProduto;
  numeroDeSerie: string | null;
  anoDeFabricacao: number | null;
  horasDeUso: number | null;
  ciclos: number | null;
  garantiaMeses: number | null;
  notasDeEstado: string;
  notasDeInspecao: string;
  checklist: ItemDeChecklist[];
  certificado?: CertificadoDaUnidade | null;
  vendida?: boolean;
  /** Para onde mandar quem quer o laudo que ainda não foi publicado. */
  hrefAjuda?: string;
};

const DESENHO_DO_RESULTADO: Record<
  string,
  { rotulo: string; icone: typeof ShieldCheck; classe: string }
> = {
  verificado: {
    rotulo: "Verificado",
    icone: ShieldCheck,
    classe: "bg-ok-50 text-ok-700 ring-ok-500/20",
  },
  substituido: {
    rotulo: "Substituído",
    icone: RefreshCw,
    classe: "bg-jb-50 text-jb-700 ring-jb-500/20",
  },
  reparado: {
    rotulo: "Reparado",
    icone: Wrench,
    classe: "bg-amber-50 text-amber-700 ring-amber-500/20",
  },
  nao_aplicavel: {
    rotulo: "Não se aplica",
    icone: CircleSlash,
    classe: "bg-graf-100 text-graf-600 ring-graf-300/40",
  },
};

/**
 * O selo de um item do checklist — "Substituído", "Verificado", "Não se aplica".
 *
 * Exportado porque o laudo aparece em dois lugares com molduras diferentes: a
 * seção da vitrine (aqui) e o cartão do prontuário do cliente, depois que ele
 * comprou. O vocabulário de resultados precisa ser um só; se o prontuário
 * redesenhasse os próprios selos, "substituído" teria duas cores no site e a
 * pessoa que viu o laudo antes de comprar não reconheceria o mesmo registro
 * depois.
 */
export function ResultadoDoChecklist({ resultado }: { resultado: string }) {
  const desenho = DESENHO_DO_RESULTADO[resultado] ?? {
    rotulo: resultado,
    icone: ClipboardCheck,
    classe: "bg-graf-100 text-graf-600 ring-graf-300/40",
  };
  const Icone = desenho.icone;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1",
        desenho.classe,
      )}
    >
      <Icone className="size-3.5" aria-hidden />
      {desenho.rotulo}
    </span>
  );
}

export function UnidadeFisica({
  id = "laudo",
  condicao,
  numeroDeSerie,
  notasDeEstado,
  notasDeInspecao,
  checklist,
  certificado,
  vendida,
  hrefAjuda = "/contato",
}: Props) {
  /* Equipamento novo não tem laudo de unidade, e inventar um seria pior do que
     não ter: laudo é registro de bancada sobre uma peça que já rodou. */
  if (condicao === "novo") return null;

  const aprovados = checklist.filter((item) => item.resultado !== "nao_aplicavel");
  const substituidos = checklist.filter((item) => item.resultado === "substituido");
  const temLaudo = checklist.length > 0;
  const temNotas = Boolean(notasDeEstado.trim() || notasDeInspecao.trim());

  if (!temLaudo && !temNotas) {
    return (
      <section
        id={id}
        aria-labelledby={`${id}-titulo`}
        className="container-loja scroll-mt-[var(--jb-topo-secoes)] border-t border-graf-200 py-8"
      >
        <h2 id={`${id}-titulo`} className="text-base font-extrabold text-graf-950">
          Laudo de inspeção desta unidade
        </h2>
        <p className="mt-2 max-w-[62ch] text-sm leading-6 text-graf-600">
          A inspeção desta unidade ainda não foi publicada nesta página. Ela existe na
          bancada — nenhum seminovo sai da JB sem passar por lá — e a equipe envia o registro
          item a item antes da compra, se você pedir.
        </p>
        <a
          href={hrefAjuda}
          className="foco-jb mt-3 inline-flex min-h-11 items-center rounded-lg border border-graf-300 px-4 text-sm font-bold text-graf-800 transition-colors hover:border-graf-400 hover:bg-graf-50"
        >
          Pedir o laudo desta unidade
        </a>
      </section>
    );
  }

  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className="container-loja scroll-mt-[var(--jb-topo-secoes)] border-t border-graf-200 py-8"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="micro text-jb-700">Prova da bancada</p>
          <h2
            id={`${id}-titulo`}
            className="fonte-display mt-1 text-xl leading-tight tracking-[-0.02em] text-graf-950 sm:text-2xl"
          >
            Laudo de inspeção desta unidade
          </h2>
          <p className="mt-1.5 max-w-[64ch] text-sm leading-6 text-graf-600">
            {temLaudo
              ? `Cada item foi conferido na bancada da JB${
                  numeroDeSerie ? ` na unidade de série ${numeroDeSerie}` : ""
                }. O que foi trocado aparece como trocado.`
              : "O registro que a equipe técnica fez desta unidade, como foi escrito."}
          </p>
        </div>

        {temLaudo ? (
          <dl className="flex shrink-0 gap-6 rounded-xl border border-graf-200 bg-graf-50/60 px-4 py-3">
            <div>
              <dt className="micro text-graf-500">Itens conferidos</dt>
              <dd className="tabular mt-0.5 text-lg font-extrabold text-graf-950">
                {aprovados.length}
                <span className="text-sm font-semibold text-graf-500">/{checklist.length}</span>
              </dd>
            </div>
            <div>
              <dt className="micro text-graf-500">Peças trocadas</dt>
              <dd className="tabular mt-0.5 text-lg font-extrabold text-graf-950">
                {substituidos.length}
              </dd>
            </div>
          </dl>
        ) : null}
      </header>

      {vendida ? (
        <p className="mt-4 rounded-lg border border-graf-200 bg-graf-50 px-4 py-2.5 text-sm text-graf-600">
          Esta unidade já foi vendida. O laudo continua publicado porque ele pertence ao
          equipamento, não ao anúncio.
        </p>
      ) : null}

      {temLaudo ? (
        <ul className="mt-5 divide-y divide-hairline border-y border-hairline">
          {checklist.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-x-5 gap-y-1.5 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-5 text-graf-950">{item.rotulo}</p>
                {item.nota.trim() ? (
                  <p className="texto-apoio mt-0.5 text-graf-600">{item.nota.trim()}</p>
                ) : null}
              </div>
              <ResultadoDoChecklist resultado={item.resultado} />
            </li>
          ))}
        </ul>
      ) : null}

      {temNotas ? (
        <div className="mt-5 grid gap-x-10 gap-y-5 xl:grid-cols-2">
          {notasDeEstado.trim() ? (
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-graf-950">Estado de conservação</h3>
              <p className="mt-1 text-sm leading-6 text-graf-700">{notasDeEstado.trim()}</p>
            </div>
          ) : null}
          {notasDeInspecao.trim() ? (
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-graf-950">Notas da inspeção</h3>
              <p className="mt-1 text-sm leading-6 text-graf-700">{notasDeInspecao.trim()}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {certificado ? (
        <SeloCertificado certificado={certificado} forma="laudo" className="mt-6" />
      ) : null}
    </section>
  );
}
