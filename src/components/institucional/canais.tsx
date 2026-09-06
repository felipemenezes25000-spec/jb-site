import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { Cartao } from "@/components/ui/data";
import { LinkBotao, classesBotao } from "@/components/ui/button";
import { formatarTelefone, telHref, whatsappHref } from "@/lib/format";
import { enderecoCompleto, type SettingsMap } from "@/lib/settings";
import { cn } from "@/lib/utils";

/* ============================================================================
   Canais de atendimento

   Nenhum dado daqui é escrito no código: tudo sai de `getSettings()`, que é o
   que a JB edita no painel. Linha sem valor configurado simplesmente não
   aparece — telefone vazio não vira "(00) 0000-0000".

   Os ícones perderam a chapa vermelha que tinham antes: seis chapas jb-50
   numa coluna faziam o vermelho da marca virar padrão de fundo, quando ele é
   reservado a ação e destaque. Agora o ícone é traço grafite, decorativo, e o
   peso da linha está onde deve estar — no número, em corpo de texto cheio,
   com o rótulo menor por cima.

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
  icone: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  rotulo: string;
  valor: React.ReactNode;
  href?: string;
  externo?: boolean;
}) {
  const conteudo = (
    <>
      <Icone className="mt-1 size-4.5 shrink-0 text-graf-400" aria-hidden />
      <span className="min-w-0">
        <span className="block text-[0.8125rem] leading-tight text-graf-500">{rotulo}</span>
        {/* E-mail e endereço são palavras longas e sem espaço. Sem quebra
            forçada, a largura mínima deles empurra a coluna inteira para fora
            da tela no celular — e corta o texto no cartão do desktop. */}
        <span className="mt-1 block text-base font-semibold leading-snug text-graf-950 transition-colors [overflow-wrap:anywhere] group-hover:text-jb-700">
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
        className="foco-jb group -mx-2 flex min-h-11 items-start gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-graf-50"
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
      <p className="mt-2 text-sm leading-relaxed text-graf-600">{descricao}</p>

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
            className={classesBotao("secundario", "sm", "w-full")}
          >
            Chamar no WhatsApp
          </a>
        ) : null}
      </div>
    </Cartao>
  );
}

/**
 * Faixa horizontal de contato — fecha as páginas institucionais.
 *
 * Grafite é área estratégica, e o fim de uma página institucional é
 * exatamente isso: o único ponto da tela em que a conversa é o próximo passo.
 * Sobre o escuro só entram as variantes `claro` e `contorno-claro`, que são as
 * que mantêm o anel de foco visível.
 */
export function FaixaDeContato({ s, className }: { s: SettingsMap; className?: string }) {
  const whatsapp = whatsappHref(s.whatsapp, `Olá! Vim pelo site da ${s.empresa_nome}.`);

  return (
    <section
      className={cn(
        "on-dark relative isolate overflow-hidden rounded-2xl bg-graf-950 px-6 py-10 sm:px-10 sm:py-12",
        className,
      )}
    >
      <span
        aria-hidden
        className="field-orbit pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(60%_80%_at_85%_0%,#000,transparent)]"
      />

      <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-7">
        <div className="max-w-lg">
          <h2 className="text-title text-white">Fale com a JB</h2>
          <p className="texto-suave mt-3 text-base leading-relaxed">
            {s.horario
              ? `Atendimento ${s.horario.charAt(0).toLowerCase()}${s.horario.slice(1)}.`
              : "Escolha o canal que for mais rápido para você."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <LinkBotao href="/contato" variante="claro">
            Enviar mensagem
          </LinkBotao>
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className={classesBotao("contorno-claro", "md")}
            >
              WhatsApp
            </a>
          ) : null}
          {s.telefone ? (
            <a href={telHref(s.telefone)} className={classesBotao("contorno-claro", "md")}>
              {formatarTelefone(s.telefone)}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
