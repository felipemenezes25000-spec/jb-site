import { Download, FileText } from "lucide-react";

/* ============================================================================
   Ficha técnica, medidas, regulatório e documentação

   Quatro blocos com o mesmo desenho de lista de definição, porque são a mesma
   natureza de informação: rótulo à esquerda, valor à direita, fio fino entre
   as linhas. Todos vêm do cadastro do produto.

   Sem moldura em nenhum deles: empilhados, quatro cartões com borda viram
   aquela pilha de retângulos iguais que faz a página parecer template. Quem
   separa um bloco do outro é o rótulo em caixa alta e o respiro.

   Valor em 15px e rótulo em 14px — ficha técnica longa lida em 11px é o
   caminho mais curto para ninguém ler. Nenhum bloco aparece vazio, e nenhum
   deles inventa unidade, registro ou documento: campo em branco não vira
   linha.
   ============================================================================ */

export type EspecificacaoAgrupada = {
  grupo: string;
  itens: { id: string; rotulo: string; valor: string }[];
};

/**
 * Agrupa as especificações preservando a ordem cadastrada — tanto a dos grupos
 * (pela primeira aparição) quanto a dos itens dentro de cada grupo.
 */
export function agruparEspecificacoes(
  specs: readonly { id: string; group: string; label: string; value: string }[],
): EspecificacaoAgrupada[] {
  const grupos: EspecificacaoAgrupada[] = [];

  for (const spec of specs) {
    if (!spec.label.trim() || !spec.value.trim()) continue;
    const nome = spec.group.trim() || "Ficha técnica";
    let grupo = grupos.find((g) => g.grupo === nome);
    if (!grupo) {
      grupo = { grupo: nome, itens: [] };
      grupos.push(grupo);
    }
    grupo.itens.push({ id: spec.id, rotulo: spec.label, valor: spec.value });
  }

  return grupos.filter((grupo) => grupo.itens.length > 0);
}

/** Rótulo em caixa alta que abre cada bloco de dados. */
function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-graf-500">
      {children}
    </h3>
  );
}

function Linha({ rotulo, valor, mono }: { rotulo: string; valor: string; mono?: boolean }) {
  return (
    /* Duas colunas a partir de `sm`, empilhado abaixo disso: em 360px, rótulo
       e valor lado a lado deixariam duas colunas de três palavras cada. */
    <div className="grid gap-x-8 gap-y-0.5 py-3 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
      <dt className="text-sm text-graf-500">{rotulo}</dt>
      <dd
        className={
          mono
            ? "label-mono text-graf-900"
            : "text-[0.9375rem] font-semibold text-graf-900"
        }
      >
        {valor}
      </dd>
    </div>
  );
}

function Lista({ children }: { children: React.ReactNode }) {
  return (
    <dl className="mt-3 divide-y divide-graf-200 border-t border-graf-200">{children}</dl>
  );
}

export function FichaTecnica({ grupos }: { grupos: EspecificacaoAgrupada[] }) {
  if (grupos.length === 0) return null;

  return (
    <div className="space-y-8">
      {grupos.map((grupo) => (
        <div key={grupo.grupo}>
          {grupos.length > 1 ? <Rotulo>{grupo.grupo}</Rotulo> : null}
          <dl
            className={
              grupos.length > 1
                ? "mt-3 divide-y divide-graf-200 border-t border-graf-200"
                : "divide-y divide-graf-200 border-t border-graf-200"
            }
          >
            {grupo.itens.map((item) => (
              <Linha key={item.id} rotulo={item.rotulo} valor={item.valor} />
            ))}
          </dl>
        </div>
      ))}
    </div>
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
      rotulo: "Largura × altura × profundidade",
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
    <div>
      <Rotulo>Medidas e peso</Rotulo>
      <Lista>
        {linhas.map((linha) => (
          <Linha key={linha.rotulo} rotulo={linha.rotulo} valor={linha.valor} />
        ))}
      </Lista>
    </div>
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
      ? { rotulo: "Registro/notificação", valor: codigoAnvisa, mono: true }
      : null,
    fabricante ? { rotulo: "Fabricante", valor: fabricante, mono: false } : null,
    detentor ? { rotulo: "Detentor do registro", valor: detentor, mono: false } : null,
  ].filter((linha) => linha !== null);

  if (linhas.length === 0 && !observacao) return null;

  return (
    <div>
      <Rotulo>Informações regulatórias</Rotulo>
      {linhas.length > 0 ? (
        <Lista>
          {linhas.map((linha) => (
            <Linha
              key={linha.rotulo}
              rotulo={linha.rotulo}
              valor={linha.valor}
              mono={linha.mono}
            />
          ))}
        </Lista>
      ) : null}
      {observacao ? (
        <p
          className={`text-sm leading-relaxed text-graf-600 ${
            linhas.length > 0 ? "mt-4" : "mt-3 border-t border-graf-200 pt-4"
          }`}
        >
          {observacao}
        </p>
      ) : null}
    </div>
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
    <div>
      <Rotulo>Documentação do equipamento</Rotulo>
      <ul className="mt-3 divide-y divide-graf-200 border-t border-graf-200">
        {documentos.map((documento) => {
          const tipo = TIPO_DE_DOCUMENTO[documento.tipo];
          return (
            <li key={documento.id}>
              <a
                href={documento.url}
                target="_blank"
                rel="noopener noreferrer"
                className="foco-jb group flex min-h-11 items-center gap-3 py-3.5 transition-colors duration-150 hover:text-jb-700"
              >
                <FileText className="size-[18px] shrink-0 text-graf-500" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.9375rem] font-semibold text-graf-900 transition-colors duration-150 group-hover:text-jb-700">
                    {documento.titulo}
                  </span>
                  {tipo ? (
                    <span className="mt-0.5 block text-[0.8125rem] text-graf-500">
                      {tipo}
                    </span>
                  ) : null}
                </span>
                <Download
                  className="size-4 shrink-0 text-graf-500 transition-colors duration-150 group-hover:text-jb-600"
                  aria-hidden
                />
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
