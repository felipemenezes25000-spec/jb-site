import {
  ChevronDown,
  Download,
  FileText,
  Ruler,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

import { grupoSemanticoAtributo } from "@/lib/marketplace/atributos-decisao";

/* ============================================================================
   Ficha técnica do produto

   O conteúdo continua completo, com densidade de catálogo técnico: subseções
   semânticas separadas por régua, e não por moldura. Campo com grupo definido
   no admin mantém a organização humana; só o campo sem grupo recebe uma
   classificação automática.

   A ficha aparece aberta — em nenhuma das fichas de produto usadas como
   referência ela vem recolhida no desktop. O que encurta a página é o corte
   em `DADOS_VISIVEIS`, que é uma lista longa virando lista curta, e não uma
   seção inteira virando gaveta.
   ============================================================================ */

export type EspecificacaoAgrupada = {
  grupo: string;
  itens: { id: string; rotulo: string; valor: string }[];
};

export function agruparEspecificacoes(
  specs: readonly { id: string; group: string; label: string; value: string }[],
): EspecificacaoAgrupada[] {
  const grupos: EspecificacaoAgrupada[] = [];

  for (const spec of specs) {
    if (!spec.label.trim() || !spec.value.trim()) continue;

    const nome = spec.group.trim() || grupoSemanticoAtributo(spec.label);
    let grupo = grupos.find((item) => item.grupo === nome);

    if (!grupo) {
      grupo = { grupo: nome, itens: [] };
      grupos.push(grupo);
    }

    grupo.itens.push({
      id: spec.id,
      rotulo: spec.label.trim(),
      valor: spec.value.trim(),
    });
  }

  return grupos.filter((grupo) => grupo.itens.length > 0);
}

type Icone = React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

/**
 * Cabeçalho de subbloco — filete, não moldura.
 *
 * Cada peça desta ficha era uma `<section>` com `rounded-xl border bg-white`
 * dentro de uma seção que já tem `border-t`, dentro do container branco da
 * página: caixa branca com borda sobre fundo branco, três níveis. O que
 * separa um subbloco do seguinte agora é uma régua e o espaço, que é como as
 * fichas técnicas de referência organizam a mesma informação.
 */
function CartaoFicha({
  titulo,
  subtitulo,
  icone: Icone,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  icone: Icone;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0">
      <header className="flex items-start gap-2.5 border-b border-graf-200 pb-2.5">
        <Icone className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold leading-5 text-graf-950">{titulo}</h3>
          {subtitulo ? (
            <p className="texto-apoio mt-0.5 text-graf-500">{subtitulo}</p>
          ) : null}
        </div>
      </header>

      {children}
    </section>
  );
}

function GradeDados({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid grid-cols-1 border-graf-150 sm:grid-cols-2 [&>*:nth-child(n+2)]:border-t sm:[&>*:nth-child(2)]:border-t-0 sm:[&>*:nth-child(even)]:border-l sm:[&>*:nth-child(even)]:pl-5 sm:[&>*:nth-child(n+3)]:border-t">
      {children}
    </dl>
  );
}

function Dado({
  rotulo,
  valor,
  mono,
}: {
  rotulo: string;
  valor: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 border-graf-150 py-3">
      <dt className="micro text-graf-500">{rotulo}</dt>
      <dd
        className={
          mono
            ? "label-mono mt-1 break-words text-graf-950"
            : "mt-1 break-words text-sm font-semibold leading-5 text-graf-950"
        }
      >
        {valor}
      </dd>
    </div>
  );
}

function tituloDoGrupo(grupo: string, total: number) {
  const normalizado = grupo.trim().toLowerCase();
  if (
    total === 1 &&
    (normalizado === "ficha técnica" || normalizado === "especificações técnicas")
  ) {
    return null;
  }
  return grupo;
}

/** Quantos dados a ficha mostra antes de oferecer o resto sob um clique. */
const DADOS_VISIVEIS = 12;

/** Abaixo disto o resto não vale um clique: mostra tudo. */
const SOBRA_MINIMA = 3;

/**
 * Reparte a ficha no limite de linhas, e não no limite de grupos.
 *
 * O corte precisa acontecer dentro do grupo: quase todo produto do catálogo
 * tem as especificações num grupo só, e um corte que só sabe pular grupos
 * inteiros nunca dispararia — uma ficha de quarenta linhas num grupo sairia
 * inteira, que é exatamente o caso que este corte existe para resolver. Um
 * grupo partido repete o próprio rótulo dos dois lados.
 */
function repartir(grupos: EspecificacaoAgrupada[], teto: number) {
  const visiveis: EspecificacaoAgrupada[] = [];
  const extras: EspecificacaoAgrupada[] = [];
  let usado = 0;

  for (const grupo of grupos) {
    const cabem = Math.max(0, teto - usado);
    if (cabem >= grupo.itens.length) visiveis.push(grupo);
    else if (cabem === 0) extras.push(grupo);
    else {
      visiveis.push({ grupo: grupo.grupo, itens: grupo.itens.slice(0, cabem) });
      extras.push({ grupo: grupo.grupo, itens: grupo.itens.slice(cabem) });
    }
    usado += grupo.itens.length;
  }

  const escondidos = extras.reduce((soma, grupo) => soma + grupo.itens.length, 0);
  if (escondidos < SOBRA_MINIMA) return { visiveis: grupos, extras: [], escondidos: 0 };
  return { visiveis, extras, escondidos };
}

function GrupoDeEspecificacoes({
  grupo,
  titulo,
}: {
  grupo: EspecificacaoAgrupada;
  titulo: string | null;
}) {
  return (
    <section aria-label={titulo ?? "Especificações técnicas"} className="pt-3 first:pt-0">
      {titulo ? (
        <div className="flex items-center justify-between gap-3 pb-1">
          <h4 className="micro text-graf-600">{titulo}</h4>
          <span className="micro tabular text-graf-400">{grupo.itens.length}</span>
        </div>
      ) : null}
      <GradeDados>
        {grupo.itens.map((item) => (
          <Dado key={item.id} rotulo={item.rotulo} valor={item.valor} />
        ))}
      </GradeDados>
    </section>
  );
}

export function FichaTecnica({ grupos }: { grupos: EspecificacaoAgrupada[] }) {
  if (grupos.length === 0) return null;

  const totalDeItens = grupos.reduce((soma, grupo) => soma + grupo.itens.length, 0);

  /* A divulgação progressiva vive aqui, e não na seção inteira.
     Esconder "Especificações técnicas" atrás de uma gaveta é esconder o miolo
     da página; encurtar uma lista de quarenta linhas para as doze primeiras é
     o que as fichas de referência realmente fazem. Até o corte, a ficha
     aparece inteira, sem nada para clicar. */
  const { visiveis, extras, escondidos: itensEscondidos } = repartir(grupos, DADOS_VISIVEIS);

  return (
    <CartaoFicha
      /* Não repete o `h2` da seção. Com a moldura de cartão, "Especificações
         técnicas" dentro de "Especificações técnicas" passava; sem ela vira
         gagueira — e este bloco precisa de um nome próprio de qualquer forma,
         porque divide a seção com "Dimensões e peso" e "Documentos". */
      titulo="Dados do modelo"
      subtitulo={`${totalDeItens} ${totalDeItens === 1 ? "especificação cadastrada" : "especificações cadastradas"}`}
      icone={SlidersHorizontal}
    >
      <div className="divide-y divide-graf-150">
        {visiveis.map((grupo) => (
          <GrupoDeEspecificacoes
            key={grupo.grupo}
            grupo={grupo}
            titulo={tituloDoGrupo(grupo.grupo, grupos.length)}
          />
        ))}
      </div>

      {extras.length > 0 ? (
        <details className="group mt-3 border-t border-graf-200 pt-2">
          <summary className="foco-jb flex min-h-11 w-fit cursor-pointer list-none items-center gap-1.5 text-sm font-bold text-graf-700 hover:text-jb-700 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">
              Ver mais {itensEscondidos}{" "}
              {itensEscondidos === 1 ? "especificação" : "especificações"}
            </span>
            <span className="hidden group-open:inline">Mostrar menos</span>
            <ChevronDown
              className="size-4 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="divide-y divide-graf-150">
            {extras.map((grupo) => (
              <GrupoDeEspecificacoes
                key={grupo.grupo}
                grupo={grupo}
                titulo={tituloDoGrupo(grupo.grupo, grupos.length)}
              />
            ))}
          </div>
        </details>
      ) : null}
    </CartaoFicha>
  );
}

/* ------------------------------------------------------------- medidas */

function emCentimetros(milimetros: number) {
  return `${(milimetros / 10).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} cm`;
}

function emQuilos(gramas: number) {
  return `${(gramas / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`;
}

export function MedidasEPeso({
  larguraMm,
  alturaMm,
  profundidadeMm,
  pesoG,
}: {
  larguraMm: number | null;
  alturaMm: number | null;
  profundidadeMm: number | null;
  pesoG: number | null;
}) {
  const linhas: { rotulo: string; valor: string }[] = [];

  if (larguraMm && alturaMm && profundidadeMm) {
    linhas.push({
      rotulo: "Dimensões (L × A × P)",
      valor: `${emCentimetros(larguraMm)} × ${emCentimetros(alturaMm)} × ${emCentimetros(profundidadeMm)}`,
    });
  } else {
    if (larguraMm) linhas.push({ rotulo: "Largura", valor: emCentimetros(larguraMm) });
    if (alturaMm) linhas.push({ rotulo: "Altura", valor: emCentimetros(alturaMm) });
    if (profundidadeMm) {
      linhas.push({ rotulo: "Profundidade", valor: emCentimetros(profundidadeMm) });
    }
  }

  if (pesoG) linhas.push({ rotulo: "Peso", valor: emQuilos(pesoG) });

  if (linhas.length === 0) return null;

  return (
    <CartaoFicha
      titulo="Dimensões e peso"
      subtitulo="Espaço físico necessário"
      icone={Ruler}
    >
      <GradeDados>
        {linhas.map((linha) => (
          <Dado key={linha.rotulo} rotulo={linha.rotulo} valor={linha.valor} />
        ))}
      </GradeDados>
    </CartaoFicha>
  );
}

/* --------------------------------------------------------- regulatório */

export function Regulatorio({
  codigoAnvisa,
  fabricante,
  detentor,
  observacao,
}: {
  codigoAnvisa: string | null;
  fabricante: string | null;
  detentor: string | null;
  observacao: string | null;
}) {
  const linhas = [
    codigoAnvisa
      ? { rotulo: "Registro / notificação", valor: codigoAnvisa, mono: true }
      : null,
    fabricante ? { rotulo: "Fabricante", valor: fabricante, mono: false } : null,
    detentor ? { rotulo: "Detentor do registro", valor: detentor, mono: false } : null,
  ].filter((linha) => linha !== null);

  if (linhas.length === 0 && !observacao) return null;

  return (
    <CartaoFicha
      titulo="Informações regulatórias"
      subtitulo="Identificação sanitária"
      icone={ShieldCheck}
    >
      {linhas.length > 0 ? (
        <GradeDados>
          {linhas.map((linha) => (
            <Dado
              key={linha.rotulo}
              rotulo={linha.rotulo}
              valor={linha.valor}
              mono={linha.mono}
            />
          ))}
        </GradeDados>
      ) : null}

      {observacao ? (
        <div className={linhas.length > 0 ? "border-t border-graf-150 py-3" : "py-3"}>
          <p className="micro text-graf-500">Observação</p>
          <p className="texto-apoio mt-1 text-graf-700">{observacao}</p>
        </div>
      ) : null}
    </CartaoFicha>
  );
}

/* -------------------------------------------------------- documentação */

export type DocumentoProduto = {
  id: string;
  titulo: string;
  url: string;
  tipo: string;
};

const TIPO_DE_DOCUMENTO: Record<string, string> = {
  manual: "Manual",
  certificado: "Certificado",
  ficha: "Ficha",
  garantia: "Garantia",
  catalogo: "Catálogo",
};

export function Documentacao({ documentos }: { documentos: DocumentoProduto[] }) {
  if (documentos.length === 0) return null;

  return (
    <CartaoFicha
      titulo="Documentos do equipamento"
      subtitulo={`${documentos.length} ${documentos.length === 1 ? "arquivo disponível" : "arquivos disponíveis"}`}
      icone={FileText}
    >
      <ul className="divide-y divide-graf-150">
        {documentos.map((documento) => {
          const tipo = TIPO_DE_DOCUMENTO[documento.tipo];

          return (
            <li key={documento.id}>
              <a
                href={documento.url}
                target="_blank"
                rel="noopener noreferrer"
                className="foco-jb group -mx-2 flex min-h-12 items-center gap-3 rounded-lg px-2 py-2.5 transition-colors duration-150 hover:bg-graf-50"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-graf-50 text-graf-500">
                  <FileText className="size-3.5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-graf-950 transition-colors duration-150 group-hover:text-jb-700">
                    {documento.titulo}
                  </span>
                  {tipo ? (
                    <span className="micro mt-0.5 block text-graf-500">{tipo}</span>
                  ) : null}
                </span>
                <Download
                  className="size-4 shrink-0 text-graf-400 transition-colors duration-150 group-hover:text-jb-600"
                  aria-hidden
                />
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            </li>
          );
        })}
      </ul>
    </CartaoFicha>
  );
}
