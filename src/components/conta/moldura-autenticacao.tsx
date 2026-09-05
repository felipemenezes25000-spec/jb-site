import Link from "next/link";
import { Clock, KeyRound, MapPin, MessageCircle, Phone } from "lucide-react";

import { Logo } from "@/components/ui/logo";
import { formatarTelefone, telHref, whatsappHref } from "@/lib/format";
import { enderecoCompleto, getSettings } from "@/lib/settings";

/**
 * Moldura das quatro telas de autenticação.
 *
 * Coluna do formulário à esquerda; à direita, só a partir de `lg`, a prova de
 * confiança da JB — tudo vindo das configurações reais da loja: desde quando a
 * empresa atende, telefone, WhatsApp, horário e endereço. Nenhuma foto de
 * banco de imagens, nenhum número inventado.
 */

function Contato({
  icone: Icone,
  rotulo,
  valor,
  href,
}: {
  icone: React.ComponentType<{ className?: string }>;
  rotulo: string;
  valor: string;
  href?: string;
}) {
  return (
    <li className="flex gap-3">
      <span
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-jb-600 shadow-card"
        aria-hidden
      >
        <Icone className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-wider text-graf-500">
          {rotulo}
        </span>
        {href ? (
          <a
            href={href}
            className="mt-0.5 inline-flex min-h-11 items-center text-sm font-semibold text-graf-900 underline-offset-4 hover:text-jb-700 hover:underline"
          >
            {valor}
          </a>
        ) : (
          <span className="mt-0.5 block text-sm leading-relaxed text-graf-700">{valor}</span>
        )}
      </span>
    </li>
  );
}

export async function MolduraAutenticacao({
  titulo,
  subtitulo,
  aviso,
  rodape,
  children,
}: {
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
  const anos =
    Number.isInteger(desde) && desde > 1900 ? new Date().getFullYear() - desde : null;

  const whatsapp = whatsappHref(s.whatsapp);

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16 xl:gap-24">
      <div className="mx-auto w-full max-w-md lg:mx-0">
        <Link
          href="/"
          className="inline-flex rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-jb-500"
        >
          <Logo altura={38} prioridade />
          <span className="sr-only">Ir para a página inicial da JB</span>
        </Link>

        <h1 className="mt-8 text-title leading-tight">{titulo}</h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-graf-600">{subtitulo}</p>

        {aviso ? <div className="mt-6">{aviso}</div> : null}

        <div className="mt-8">{children}</div>

        {rodape ? (
          <div className="mt-8 border-t border-graf-200 pt-6 text-sm leading-relaxed text-graf-600">
            {rodape}
          </div>
        ) : null}
      </div>

      <aside className="hidden lg:block" aria-label="Atendimento da JB">
        <div className="field-orbit sticky top-28 rounded-xl border border-graf-200 bg-graf-50/70 p-7">
          <p className="text-xs font-bold uppercase tracking-wider text-jb-600">
            {s.empresa_nome}
          </p>
          <p className="mt-3 text-lg font-bold leading-snug text-graf-950">
            {anos !== null
              ? `${anos} anos cuidando de consultórios odontológicos`
              : "Equipamentos e assistência técnica para consultórios"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-graf-600">{s.empresa_resumo}</p>

          <ul className="mt-7 space-y-5 border-t border-graf-200 pt-6">
            {s.telefone ? (
              <Contato
                icone={Phone}
                rotulo="Telefone"
                valor={formatarTelefone(s.telefone)}
                href={telHref(s.telefone)}
              />
            ) : null}

            {whatsapp ? (
              <Contato
                icone={MessageCircle}
                rotulo="WhatsApp"
                valor={formatarTelefone(s.whatsapp)}
                href={whatsapp}
              />
            ) : null}

            {s.horario ? (
              <Contato icone={Clock} rotulo="Atendimento" valor={s.horario} />
            ) : null}

            {s.endereco_logradouro ? (
              <Contato icone={MapPin} rotulo="Onde estamos" valor={enderecoCompleto(s)} />
            ) : null}
          </ul>

          <p className="mt-7 flex gap-2.5 border-t border-graf-200 pt-6 text-xs leading-relaxed text-graf-500">
            <KeyRound className="mt-0.5 size-3.5 shrink-0 text-graf-500" aria-hidden />
            <span>
              Sua senha fica guardada cifrada e cada acesso é registrado. A JB nunca pede
              senha por telefone, e-mail ou WhatsApp.
            </span>
          </p>
        </div>
      </aside>
    </div>
  );
}
