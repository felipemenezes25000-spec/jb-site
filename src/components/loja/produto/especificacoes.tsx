import {
  Download,
  FileText,
  Ruler,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

/* ============================================================================
   Ficha técnica do produto

   O conteúdo continua completo, mas com densidade de catálogo técnico: menos
   molduras, menos padding e títulos menores. Quem abre esta área quer consultar
   informação, não entrar em uma sequência de cards de dashboard.
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

    const nome = spec.group.trim() || "Especificações técnicas";
    let grupo = grupos.find((g) => g.grupo === nome);

    if (!grupo) {
      grupo = { grupo: nome, itens: [] };
      grupos.push(grupo);
    }

    grupo.itens.push({
      id: spec.id,
      rotulo: spec.label,
      valor: spec.value,
    });
  }

  return grupos.filter((grupo) => grupo.itens.length > 0);
}

type Icone = React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

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
    <section className="overflow-hidden rounded-xl border border-graf-200 bg-white">
      <header className="flex items-center gap-3 border-b border-graf-200 bg-white px-4 py-3 sm:px-5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-graf-50 text-jb-700">
          <Icone className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="text-[0.875rem] font-extrabold leading-5 text-graf-950">{titulo}</h3>
          {subtitulo ? (
            <p className="mt-0.5 text-[0.75rem] leading-4 text-graf-500">{subtitulo}</p>
          ) : null}
        </div>
      </header>

      {children}
    </section>
  );
}

function GradeDados({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 [&>*:nth-child(n+2)]:border-t sm:[&>*:nth-child(2)]:border-t-0 sm:[&>*:nth-child(even)]:border-l sm:[&>*:nth-child(n+3)]:border-t">
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
    <div className="min-w-0 border-graf-200 px-4 py-3 sm:px-5 sm:py-3.5">
      <dt className="text-[0.625rem] font-bold uppercase tracking-[0.075em] text-graf-500">
        {rotulo}
      </dt>
      <dd
        className={
          mono
            ? "label-mono mt-1 break-words text-[0.875rem] text-graf-950"
            : "mt-1 break-words text-[0.9375rem] font-semibold leading-5 text-graf-950"
        }
      >
        {valor}
      </dd>
    </div>
  );
}

export function FichaTecnica({ grupos }: { grupos: EspecificacaoAgrupada[] }) {
  if (grupos.length === 0) return null;

  return (
    <div className="space-y-3">
      {grupos.map((grupo, indice) => {
        const titulo =
          grupos.length === 1 && grupo.grupo.toLowerCase() === "ficha técnica"
            ? "Especificações técnicas"
            : grupo.grupo;

        return (
          <CartaoFicha
            key={grupo.grupo}
            titulo={titulo}
            subtitulo={indice === 0 ? "Dados para comparar este modelo" : undefined}
            icone={SlidersHorizontal}
          >
            <GradeDados>
              {grupo.itens.map((item) => (
                <Dado key={item.id} rotulo={item.rotulo} valor={item.valor} />
              ))}
            </GradeDados>
          </CartaoFicha>
        );
      })}
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
        <div
          className={
            linhas.length > 0
              ? "border-t border-graf-200 px-4 py-3 sm:px-5"
              : "px-4 py-3 sm:px-5"
          }
        >
          <p className="text-[0.625rem] font-bold uppercase tracking-[0.075em] text-graf-500">
            Observação
          </p>
          <p className="mt-1 text-[0.8125rem] leading-5 text-graf-700">{observacao}</p>
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
      <ul className="divide-y divide-graf-200">
        {documentos.map((documento) => {
          const tipo = TIPO_DE_DOCUMENTO[documento.tipo];

          return (
            <li key={documento.id}>
              <a
                href={documento.url}
                target="_blank"
                rel="noopener noreferrer"
                className="foco-jb group flex min-h-12 items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-graf-50 sm:px-5"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-graf-50 text-graf-500">
                  <FileText className="size-3.5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.875rem] font-semibold text-graf-950 transition-colors duration-150 group-hover:text-jb-700">
                    {documento.titulo}
                  </span>
                  {tipo ? (
                    <span className="mt-0.5 block text-[0.6875rem] font-medium uppercase tracking-[0.055em] text-graf-500">
                      {tipo}
                    </span>
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
