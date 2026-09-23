import { Clock, Mail, MapPin, MessageCircle } from "lucide-react";

import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
import { Cartao } from "@/components/ui/data";
import { LinkBotao } from "@/components/ui/button";
import { contatosWhatsapp, saudarPeloNome } from "@/lib/contatos-whatsapp";
import { MENSAGEM_PADRAO } from "@/lib/diagnostico";
import { formatarTelefone, whatsappHref } from "@/lib/format";
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
  posicaoWhatsapp,
}: {
  icone: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  rotulo: string;
  valor: React.ReactNode;
  href?: string;
  externo?: boolean;
  /** Marca o link para a medição de conversas no WhatsApp. */
  posicaoWhatsapp?: string;
}) {
  const conteudo = (
    <>
      <Icone className="mt-1 size-4.5 shrink-0 text-graf-500" aria-hidden />
      <span className="min-w-0">
        <span className="block text-apoio leading-tight text-graf-500">{rotulo}</span>
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
        data-whatsapp={posicaoWhatsapp}
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
  return (
    <ul className={cn("space-y-1", className)}>
      {contatosWhatsapp(s).map(({ numero, nome }) => (
        <Linha
          key={numero}
          icone={MessageCircle}
          rotulo="WhatsApp"
          valor={nome || formatarTelefone(numero)}
          href={whatsappHref(numero, saudarPeloNome(MENSAGEM_PADRAO, nome))}
          posicaoWhatsapp="institucional"
          externo
        />
      ))}

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
  return (
    <Cartao className={cn("p-5", className)}>
      <h2 className="text-base font-bold text-graf-950">{titulo}</h2>
      <p className="mt-2 text-sm leading-relaxed text-graf-600">{descricao}</p>

      <CanaisDeContato s={s} className="mt-4" mostrarEndereco={false} />

      <div className="mt-5 flex flex-col gap-2">
        <LinkBotao href="/contato" tamanho="sm" larguraTotal>
          Enviar mensagem
        </LinkBotao>
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
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden rounded-2xl border border-graf-200 bg-surface-muted px-6 py-10 sm:px-10 sm:py-12",
        className,
      )}
    >
      <span
        aria-hidden
        className="field-orbit pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(60%_80%_at_85%_0%,#000,transparent)]"
      />

      <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-7">
        <div className="max-w-lg">
          <h2 className="text-title text-graf-950">Fale com a JB</h2>
          <p className="texto-suave mt-3 text-base leading-relaxed">
            {s.horario
              ? `Atendimento ${s.horario.charAt(0).toLowerCase()}${s.horario.slice(1)}.`
              : "Escolha o canal que for mais rápido para você."}
          </p>
        </div>

        {/* Três botões desenhados para faixa grafite, numa faixa clara.

            `claro` é branco sobre branco e `contorno-claro` é texto branco com
            borda branca a 35% — o próprio `button.tsx` avisa: "Não use nenhum
            dos dois sobre fundo claro". Sobre `bg-surface-muted` os três
            sumiam, e a auditoria registrou os dois de contato como invisíveis
            na página 404. As variantes de fundo claro são estas. */}
        <OpcoesWhatsapp
          contatos={contatosWhatsapp(s)}
          mensagem={MENSAGEM_PADRAO}
          posicao="institucional"
          tamanho="md"
        />
      </div>
    </section>
  );
}
