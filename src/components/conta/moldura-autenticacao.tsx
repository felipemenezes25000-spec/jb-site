import { Clock, MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react";

import { classesBotao } from "@/components/ui/button";
import { formatarTelefone, telHref, whatsappHref } from "@/lib/format";
import { enderecoCompleto, getSettings, type SettingsMap } from "@/lib/settings";
import { cn } from "@/lib/utils";

/**
 * Moldura das quatro telas de autenticação.
 *
 * Composição centrada e curta de propósito: quem chega aqui quer entrar, não
 * ler a loja. A coluna do formulário tem 27rem, e ao lado dela — só a partir de
 * `lg`, onde sobra largura — o painel grafite com o atendimento da JB.
 *
 * Tudo o que o painel mostra vem de `getSettings`: nome, ano de início,
 * resumo, telefone, WhatsApp, horário e endereço. Campo vazio nas configurações
 * simplesmente não aparece — nada de número inventado nem de traço repetido.
 *
 * No celular o painel sai da frente e vira um bloco curto de ajuda embaixo do
 * formulário, com telefone e WhatsApp em botão de toque cheio.
 */

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

  if (s.endereco_logradouro.trim()) {
    canais.push({ icone: MapPin, rotulo: "Onde estamos", valor: enderecoCompleto(s) });
  }

  return canais;
}

/** Linha do painel grafite. Os tons claros vêm de `on-dark`, no globals.css. */
function ItemCanal({ canal }: { canal: Canal }) {
  const { icone: Icone, rotulo, valor, href } = canal;

  return (
    <li className="flex gap-3.5">
      <span
        className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white"
        aria-hidden
      >
        <Icone className="size-4" />
      </span>

      <span className="min-w-0">
        <span className="block text-xs font-bold uppercase tracking-[0.08em] texto-suave">
          {rotulo}
        </span>
        {href ? (
          <a
            href={href}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-white underline-offset-4 hover:underline [overflow-wrap:anywhere]"
          >
            {valor}
          </a>
        ) : (
          <span className="mt-1 block text-sm leading-relaxed texto-suave [overflow-wrap:anywhere]">
            {valor}
          </span>
        )}
      </span>
    </li>
  );
}

export async function MolduraAutenticacao({
  etapa,
  titulo,
  subtitulo,
  aviso,
  rodape,
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
  children: React.ReactNode;
}) {
  const s = await getSettings();

  const desde = Number(s.empresa_desde);
  const anoDeInicio =
    Number.isInteger(desde) && desde > 1900 && desde <= new Date().getFullYear() ? desde : null;

  const canais = canaisDeAtendimento(s);
  const telefone = telHref(s.telefone);
  const whatsapp = whatsappHref(s.whatsapp);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 lg:flex-row lg:items-start lg:justify-center lg:gap-16">
      <div className="mx-auto w-full max-w-[27rem] lg:mx-0">
        {/* Sem logotipo aqui: as quatro telas de acesso ficam dentro do
            cabeçalho da loja, que já traz a marca e o link para a home. Repetir
            a logo dois blocos abaixo dela só empurrava o formulário para baixo. */}
        {etapa ? <p className="sobretitulo">{etapa}</p> : null}
        <h1 className={cn("text-title", etapa && "mt-2")}>{titulo}</h1>
        <p className="mt-3 text-base leading-relaxed text-graf-600">{subtitulo}</p>

        {aviso ? <div className="mt-6">{aviso}</div> : null}

        <div className="mt-8">{children}</div>

        {rodape ? (
          <div className="mt-8 border-t border-graf-200 pt-6 text-sm leading-relaxed text-graf-600">
            {rodape}
          </div>
        ) : null}

        {telefone || whatsapp ? (
          <div className="mt-8 rounded-xl border border-graf-200 bg-graf-50 p-5 lg:hidden">
            <p className="text-sm font-semibold text-graf-900">Precisa de ajuda para acessar?</p>
            {s.horario.trim() ? (
              <p className="mt-1 text-sm leading-relaxed text-graf-600">
                Fale com a equipe da JB. {s.horario}.
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2.5">
              {telefone ? (
                <a href={telefone} className={classesBotao("secundario", "md")}>
                  <Phone className="size-4" aria-hidden />
                  Ligar para a JB
                </a>
              ) : null}
              {whatsapp ? (
                <a href={whatsapp} className={classesBotao("secundario", "md")}>
                  <MessageCircle className="size-4" aria-hidden />
                  WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <aside className="hidden w-80 shrink-0 lg:block" aria-label="Atendimento da JB">
        <div className="on-dark field-orbit sticky top-28 overflow-hidden rounded-2xl bg-graf-950 p-7">
          <span className="absolute inset-x-0 top-0 h-1 bg-jb-500" aria-hidden />

          <p className="sobretitulo">{s.empresa_nome}</p>

          {anoDeInicio !== null ? (
            <p className="mt-3 text-xl font-bold leading-snug text-white">
              Em atividade desde {anoDeInicio}
            </p>
          ) : null}

          {s.empresa_resumo.trim() ? (
            <p className="mt-2 text-sm leading-relaxed texto-suave">{s.empresa_resumo}</p>
          ) : null}

          {canais.length ? (
            <ul className="mt-7 space-y-4 border-t border-white/10 pt-6">
              {canais.map((canal) => (
                <ItemCanal key={canal.rotulo} canal={canal} />
              ))}
            </ul>
          ) : null}

          <p className="mt-7 flex gap-3 border-t border-white/10 pt-6 text-xs leading-relaxed texto-suave">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-white" aria-hidden />
            <span>A JB nunca pede sua senha por telefone, e-mail ou WhatsApp.</span>
          </p>
        </div>
      </aside>
    </div>
  );
}
