import {
  Clock,
  FileText,
  LifeBuoy,
  MessageCircle,
  Package,
  Phone,
  ShieldCheck,
  Stethoscope,
  Wrench,
} from "lucide-react";

import { formatarTelefone, telHref, whatsappHref } from "@/lib/format";
import { getSettings, type SettingsMap } from "@/lib/settings";
import { cn } from "@/lib/utils";

/**
 * Moldura das quatro telas de acesso — entrar, criar conta, recuperar e
 * redefinir senha.
 *
 * É aqui que a clínica decide se confia na JB, então a tela não pode ser um
 * formulário solto no meio do branco. A composição é uma folha só, com borda
 * fina e um filete vermelho no topo: à esquerda o formulário, à direita a
 * lateral grafite que diz, sem promessa nenhuma, o que a Área da Clínica
 * guarda de fato — equipamentos, chamados, manutenções, pedidos e documentos.
 * Cada linha dessa lista corresponde a uma área que já existe na conta.
 *
 * No celular a folha vira uma coluna: o texto e o formulário primeiro, a
 * lateral grafite embaixo, para quem só quer entrar não ter de rolar por cima
 * de argumento nenhum.
 *
 * O contato vem inteiro de `getSettings` — telefone, WhatsApp e horário.
 * Campo vazio nas configurações simplesmente não aparece: nada de número
 * inventado nem de traço solto no lugar do dado que falta.
 */

type Recurso = {
  icone: React.ComponentType<{ className?: string }>;
  titulo: string;
  descricao: string;
};

/* O que a conta entrega. Cada item espelha uma área da Área da Clínica: se um
   dia a área sair do produto, a linha sai daqui junto. */
const RECURSOS: Recurso[] = [
  {
    icone: Stethoscope,
    titulo: "Seus equipamentos",
    descricao: "Garantia, histórico de manutenção e chamados de cada aparelho.",
  },
  {
    icone: LifeBuoy,
    titulo: "Chamados de assistência",
    descricao: "Abra o chamado e acompanhe a etapa e as respostas da equipe.",
  },
  {
    icone: Wrench,
    titulo: "Manutenções",
    descricao: "Contratos ativos, visitas previstas e o que já foi feito.",
  },
  {
    icone: Package,
    titulo: "Pedidos e orçamentos",
    descricao: "O andamento das compras e as propostas para aprovar ou recusar.",
  },
  {
    icone: FileText,
    titulo: "Documentos",
    descricao: "Notas fiscais, laudos e contratos prontos para baixar.",
  },
];

type Canal = {
  icone: React.ComponentType<{ className?: string }>;
  rotulo: string;
  valor: string;
  href?: string;
};

function canaisDeAtendimento(s: SettingsMap): Canal[] {
  const canais: Canal[] = [];

  if (s.telefone.trim()) {
    canais.push({
      icone: Phone,
      rotulo: "Telefone",
      valor: formatarTelefone(s.telefone),
      href: telHref(s.telefone),
    });
  }

  const whatsapp = whatsappHref(s.whatsapp);
  if (whatsapp) {
    canais.push({
      icone: MessageCircle,
      rotulo: "WhatsApp",
      valor: formatarTelefone(s.whatsapp),
      href: whatsapp,
    });
  }

  if (s.horario.trim()) {
    canais.push({ icone: Clock, rotulo: "Atendimento", valor: s.horario });
  }

  return canais;
}

/** Uma linha da lista de recursos, dentro da lateral grafite. */
function ItemRecurso({ recurso }: { recurso: Recurso }) {
  const { icone: Icone, titulo, descricao } = recurso;

  return (
    <li className="flex gap-3.5">
      <span
        className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-jb-600 ring-1 ring-jb-100"
        aria-hidden
      >
        <Icone className="size-4" />
      </span>

      <span className="min-w-0">
        <span className="block text-corpo font-semibold text-graf-900">{titulo}</span>
        <span className="mt-1 block text-apoio leading-relaxed text-graf-600">{descricao}</span>
      </span>
    </li>
  );
}

/** Uma linha de contato. O rótulo vai no nome acessível, não em texto solto. */
function ItemCanal({ canal }: { canal: Canal }) {
  const { icone: Icone, rotulo, valor, href } = canal;

  return (
    <li className="flex items-center gap-3">
      <Icone className="size-4 shrink-0 text-jb-300" aria-hidden />
      {href ? (
        <a
          href={href}
          aria-label={`${rotulo}: ${valor}`}
          className="flex min-h-11 items-center text-sm font-semibold text-graf-900 underline-offset-4 hover:underline [overflow-wrap:anywhere]"
        >
          {valor}
        </a>
      ) : (
        <span className="flex min-h-11 items-center text-sm leading-relaxed text-graf-600 [overflow-wrap:anywhere]">
          {valor}
        </span>
      )}
    </li>
  );
}

export async function MolduraAutenticacao({
  etapa,
  titulo,
  subtitulo,
  aviso,
  rodape,
  largura = "padrao",
  children,
}: {
  /** degrau em caixa alta acima do título — mantém as quatro telas irmãs */
  etapa?: string;
  titulo: string;
  subtitulo: string;
  /** faixa acima do formulário, para explicar por que a pessoa chegou aqui */
  aviso?: React.ReactNode;
  /** links de troca de tela: criar conta, voltar a entrar, recuperar senha */
  rodape?: React.ReactNode;
  /** `ampla` abre a coluna do formulário — o cadastro tem oito campos */
  largura?: "padrao" | "ampla";
  children: React.ReactNode;
}) {
  const s = await getSettings();
  const canais = canaisDeAtendimento(s);
  const ampla = largura === "ampla";

  return (
    <div
      className={cn(
        "relative mx-auto w-full overflow-hidden rounded-2xl border border-graf-200 bg-white shadow-card",
        "lg:flex lg:items-stretch",
        ampla ? "max-w-6xl" : "max-w-5xl",
      )}
    >
      {/* filete da marca no topo da folha inteira: é o único vermelho grande
          da tela, e serve de assinatura — não de decoração repetida */}
      <span className="absolute inset-x-0 top-0 h-[3px] bg-jb-500" aria-hidden />

      <div className="min-w-0 flex-1 px-5 pb-9 pt-8 sm:px-8 sm:pb-12 sm:pt-11 lg:px-12 lg:py-14">
        <div className={cn("mx-auto w-full", ampla ? "max-w-[34rem]" : "max-w-[27rem]")}>
          {/* Sem logotipo aqui: as telas de acesso ficam dentro do cabeçalho da
              loja, que já traz a marca e o caminho de volta para a home. */}
          {etapa ? <p className="sobretitulo">{etapa}</p> : null}
          <h1 className={cn("text-title", etapa && "mt-2.5")}>{titulo}</h1>
          <p className="mt-3 text-base leading-relaxed text-graf-600">{subtitulo}</p>

          {aviso ? <div className="mt-6">{aviso}</div> : null}

          <div className="mt-8">{children}</div>

          {rodape ? (
            <div className="mt-8 border-t border-graf-200 pt-6 text-sm leading-relaxed text-graf-600">
              {rodape}
            </div>
          ) : null}
        </div>
      </div>

      <aside
        className="border-t border-graf-200 bg-surface-muted px-5 py-9 sm:px-8 sm:py-10 lg:w-[21.5rem] lg:shrink-0 lg:border-l lg:border-t-0 lg:px-8 lg:py-14"
        aria-labelledby="painel-area-clinica"
      >
        {/* sem sobretítulo aqui: "Área da Clínica" já está no degrau acima do
            título, a dois palmos de distância — repetir seria eco */}
        <h2 id="painel-area-clinica" className="text-xl font-bold leading-snug text-graf-950">
          O que fica guardado na Área da Clínica
        </h2>
        <p className="mt-2.5 text-sm leading-relaxed text-graf-600">
          A mesma conta serve para a compra e para a assistência.
        </p>

        <ul className="mt-8 space-y-5 border-t border-graf-200 pt-7">
          {RECURSOS.map((recurso) => (
            <ItemRecurso key={recurso.titulo} recurso={recurso} />
          ))}
        </ul>

        {canais.length ? (
          <div className="mt-8 border-t border-graf-200 pt-6">
            <p className="text-apoio font-semibold text-graf-900">
              Dificuldade para entrar? Fale com a equipe
            </p>
            <ul className="mt-2">
              {canais.map((canal) => (
                <ItemCanal key={canal.rotulo} canal={canal} />
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mt-7 flex gap-3 border-t border-graf-200 pt-6 text-apoio leading-relaxed text-graf-600">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-graf-900" aria-hidden />
          <span>A JB nunca pede sua senha por telefone, e-mail ou WhatsApp.</span>
        </p>
      </aside>
    </div>
  );
}
