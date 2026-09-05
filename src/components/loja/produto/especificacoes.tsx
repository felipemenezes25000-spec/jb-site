import { Download, FileText } from "lucide-react";

/* ============================================================================
   Ficha técnica, medidas, regulatório e documentação

   Quatro blocos com o mesmo desenho de lista de definição, porque são a mesma
   natureza de informação: rótulo à esquerda, valor à direita, linha divisória
   fina. Todos vêm do cadastro do produto.

   Nenhum deles aparece vazio, e nenhum deles inventa unidade, registro ou
   documento: campo em branco simplesmente não vira linha.
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

function Linha({ rotulo, valor, mono }: { rotulo: string; valor: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-3.5 sm:px-5">
      <dt className="text-sm text-graf-500">{rotulo}</dt>
      <dd
        className={
          mono
            ? "label-mono text-graf-900"
            : "text-sm font-semibold text-graf-900 sm:text-right"
        }
      >
        {valor}
      </dd>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-graf-200 bg-white">
      {titulo ? (
        <p className="border-b border-graf-200 bg-graf-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-graf-600 sm:px-5">
          {titulo}
        </p>
      ) : null}
      <dl className="divide-y divide-graf-100">{children}</dl>
    </div>
  );
}

export function FichaTecnica({ grupos }: { grupos: EspecificacaoAgrupada[] }) {
  if (grupos.length === 0) return null;

  return (
    <div className="space-y-4">
      {grupos.map((grupo) => (
        <Bloco key={grupo.grupo} titulo={grupos.length > 1 ? grupo.grupo : undefined}>
          {grupo.itens.map((item) => (
            <Linha key={item.id} rotulo={item.rotulo} valor={item.valor} />
          ))}
        </Bloco>
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
    <Bloco titulo="Medidas e peso">
      {linhas.map((linha) => (
        <Linha key={linha.rotulo} rotulo={linha.rotulo} valor={linha.valor} />
      ))}
    </Bloco>
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
    <div className="overflow-hidden rounded-xl border border-graf-200 bg-white">
      <p className="border-b border-graf-200 bg-graf-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-graf-600 sm:px-5">
        Informações regulatórias
      </p>
      {linhas.length > 0 ? (
        <dl className="divide-y divide-graf-100">
          {linhas.map((linha) => (
            <Linha
              key={linha.rotulo}
              rotulo={linha.rotulo}
              valor={linha.valor}
              mono={linha.mono}
            />
          ))}
        </dl>
      ) : null}
      {observacao ? (
        <p className="border-t border-graf-100 px-4 py-3.5 text-sm leading-relaxed text-graf-600 sm:px-5">
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
      <h3 className="text-sm font-bold uppercase tracking-wide text-graf-500">
        Documentação do equipamento
      </h3>
      <ul className="mt-3 space-y-2">
        {documentos.map((documento) => {
          const tipo = TIPO_DE_DOCUMENTO[documento.tipo];
          return (
            <li key={documento.id}>
              <a
                href={documento.url}
                target="_blank"
                rel="noopener noreferrer"
                className="foco-jb group flex min-h-11 items-center gap-3 rounded-lg border border-graf-200 bg-white px-4 py-3 transition-colors duration-150 hover:border-graf-400"
              >
                <FileText className="size-4.5 shrink-0 text-graf-500" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-graf-800">
                    {documento.titulo}
                  </span>
                  {tipo ? (
                    <span className="mt-0.5 block text-xs text-graf-500">{tipo}</span>
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
    </div>
  );
}
