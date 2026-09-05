import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { Cartao } from "@/components/ui/data";
import { LinkBotao } from "@/components/ui/button";
import { formatarTelefone, telHref, whatsappHref } from "@/lib/format";
import { enderecoCompleto, type SettingsMap } from "@/lib/settings";
import { cn } from "@/lib/utils";

/* ============================================================================
   Canais de atendimento

   Nenhum dado daqui é escrito no código: tudo sai de `getSettings()`, que é o
   que a JB edita no painel. Linha sem valor configurado simplesmente não
   aparece — telefone vazio não vira "(00) 0000-0000".

   Cada link tem 44px de alvo de toque e rótulo por escrito; o ícone é
   decorativo e fica escondido do leitor de tela.
   ============================================================================ */

function Linha({
  icone: Icone,
  rotulo,
  valor,
  href,
  externo,
}: {
  icone: React.ComponentType<{ className?: string }>;
  rotulo: string;
  valor: React.ReactNode;
  href?: string;
  externo?: boolean;
}) {
  const conteudo = (
    <>
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-jb-50 text-jb-600 ring-1 ring-inset ring-jb-100">
        <Icone className="size-4.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-wide text-graf-500">
          {rotulo}
        </span>
        <span className="mt-0.5 block text-[0.9375rem] font-medium leading-snug text-graf-900">
          {valor}
        </span>
      </span>
    </>
  );

  if (!href) {
    return <li className="flex min-h-11 items-start gap-3 py-1.5">{conteudo}</li>;
  }

  return (
    <li>
      <a
        href={href}
        {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="-mx-2 flex min-h-11 items-start gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-graf-50"
      >
        {conteudo}
      </a>
    </li>
  );
}

export function CanaisDeContato({
  s,
  className,
  mostrarEndereco = true,
}: {
  s: SettingsMap;
  className?: string;
  mostrarEndereco?: boolean;
}) {
  const whatsapp = whatsappHref(s.whatsapp, `Olá! Vim pelo site da ${s.empresa_nome}.`);

  return (
    <ul className={cn("space-y-1", className)}>
      {s.telefone ? (
        <Linha
          icone={Phone}
          rotulo="Telefone"
          valor={formatarTelefone(s.telefone)}
          href={telHref(s.telefone)}
        />
      ) : null}

      {s.telefone_alternativo ? (
        <Linha
          icone={Phone}
          rotulo="Telefone alternativo"
          valor={formatarTelefone(s.telefone_alternativo)}
          href={telHref(s.telefone_alternativo)}
        />
      ) : null}

      {whatsapp ? (
        <Linha
          icone={MessageCircle}
          rotulo="WhatsApp"
          valor={formatarTelefone(s.whatsapp)}
          href={whatsapp}
          externo
        />
      ) : null}

      {s.email ? (
        <Linha icone={Mail} rotulo="E-mail" valor={s.email} href={`mailto:${s.email}`} />
      ) : null}

      {s.horario ? <Linha icone={Clock} rotulo="Atendimento" valor={s.horario} /> : null}

      {mostrarEndereco && s.endereco_logradouro ? (
        <Linha icone={MapPin} rotulo="Endereço" valor={enderecoCompleto(s)} />
      ) : null}
    </ul>
  );
}

/** Cartão fechado de ajuda — usado na coluna lateral das páginas longas. */
export function CaixaDeAjuda({
  s,
  titulo = "Ficou com dúvida?",
  descricao = "Fale com a equipe da JB pelo canal que for mais rápido para você.",
  className,
}: {
  s: SettingsMap;
  titulo?: string;
  descricao?: string;
  className?: string;
}) {
  const whatsapp = whatsappHref(s.whatsapp, `Olá! Vim pelo site da ${s.empresa_nome}.`);

  return (
    <Cartao className={cn("p-5", className)}>
      <h2 className="text-base font-bold text-graf-950">{titulo}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-graf-600">{descricao}</p>

      <CanaisDeContato s={s} className="mt-4" mostrarEndereco={false} />

      <div className="mt-5 flex flex-col gap-2">
        <LinkBotao href="/contato" tamanho="sm" larguraTotal>
          Enviar mensagem
        </LinkBotao>
        {whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center justify-center rounded-md border border-graf-300 bg-white px-3.5 text-sm font-semibold text-graf-800 transition-colors hover:border-graf-400 hover:bg-graf-50"
          >
            Chamar no WhatsApp
          </a>
        ) : null}
      </div>
    </Cartao>
  );
}

/** Faixa horizontal de contato — fecha as páginas institucionais. */
export function FaixaDeContato({ s }: { s: SettingsMap }) {
  const whatsapp = whatsappHref(s.whatsapp, `Olá! Vim pelo site da ${s.empresa_nome}.`);

  return (
    <section className="rounded-2xl border border-graf-200 bg-graf-50 px-6 py-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-6">
        <div className="max-w-lg">
          <h2 className="text-xl font-bold text-graf-950">Fale com a JB</h2>
          <p className="mt-2 text-sm leading-relaxed text-graf-600">
            {s.horario
              ? `Atendimento ${s.horario.charAt(0).toLowerCase()}${s.horario.slice(1)}.`
              : "Escolha o canal que for mais rápido para você."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <LinkBotao href="/contato">Enviar mensagem</LinkBotao>
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-graf-300 bg-white px-5 text-[0.9375rem] font-semibold text-graf-800 transition-colors hover:border-graf-400 hover:bg-white/80"
            >
              WhatsApp
            </a>
          ) : null}
          {s.telefone ? (
            <a
              href={telHref(s.telefone)}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-graf-300 bg-white px-5 text-[0.9375rem] font-semibold text-graf-800 transition-colors hover:border-graf-400"
            >
              {formatarTelefone(s.telefone)}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
