import {
  Download,
  FileText,
  Ruler,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

/* ============================================================================
   Ficha técnica do produto

   A ficha pública precisa ser escaneável em segundos. Em vez de espalhar
   rótulo e valor em linhas longas e soltas, todos os blocos usam o mesmo
   padrão visual: cartão, título claro e grade de dados. Assim especificações,
   medidas, regulatório e documentos parecem partes da mesma ficha — não quatro
   pedaços diferentes da página.

   Campo vazio nunca vira linha. A ordem cadastrada continua sendo respeitada.
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
    <section className="overflow-hidden rounded-2xl border border-graf-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <header className="flex items-start gap-3 border-b border-graf-200 bg-graf-50/70 px-5 py-4 sm:px-6">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-graf-200 bg-white text-jb-700 shadow-sm">
          <Icone className="size-[18px]" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="text-[0.9375rem] font-bold leading-5 text-graf-950">{titulo}</h3>
          {subtitulo ? (
            <p className="mt-0.5 text-[0.8125rem] leading-5 text-graf-500">{subtitulo}</p>
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
    <div className="min-w-0 border-graf-200 px-5 py-4 sm:px-6 sm:py-5">
      <dt className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-graf-500">
        {rotulo}
      </dt>
      <dd
        className={
          mono
            ? "label-mono mt-1.5 break-words text-[0.9375rem] text-graf-950"
            : "mt-1.5 break-words text-[1rem] font-semibold leading-6 text-graf-950"
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
    <div className="space-y-5">
      {grupos.map((grupo, indice) => {
        const titulo =
          grupos.length === 1 && grupo.grupo.toLowerCase() === "ficha técnica"
            ? "Especificações técnicas"
            : grupo.grupo;

        return (
          <CartaoFicha
            key={grupo.grupo}
            titulo={titulo}
            subtitulo={indice === 0 ? "Principais dados do equipamento" : undefined}
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
      subtitulo="Confira o espaço necessário antes da instalação"
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
      subtitulo="Identificação sanitária e responsabilidade do produto"
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
        <div className={linhas.length > 0 ? "border-t border-graf-200 px-5 py-4 sm:px-6" : "px-5 py-4 sm:px-6"}>
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-graf-500">
            Observação
          </p>
          <p className="mt-1.5 text-sm leading-6 text-graf-700">{observacao}</p>
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
      subtitulo="Manuais, certificados e arquivos disponibilizados pelo cadastro"
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
                className="foco-jb group flex min-h-14 items-center gap-3 px-5 py-3.5 transition-colors duration-150 hover:bg-graf-50 sm:px-6"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-graf-200 bg-white text-graf-500">
                  <FileText className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.9375rem] font-semibold text-graf-950 transition-colors duration-150 group-hover:text-jb-700">
                    {documento.titulo}
                  </span>
                  {tipo ? (
                    <span className="mt-0.5 block text-[0.75rem] font-medium uppercase tracking-[0.06em] text-graf-500">
                      {tipo}
                    </span>
                  ) : null}
                </span>
                <Download
                  className="size-[18px] shrink-0 text-graf-400 transition-colors duration-150 group-hover:text-jb-600"
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
