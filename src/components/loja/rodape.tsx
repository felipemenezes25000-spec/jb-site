import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { Logo } from "@/components/ui/logo";
import {
  RODAPE_ASSISTENCIA,
  RODAPE_INSTITUCIONAL,
  RODAPE_LOJA,
  RODAPE_POLITICAS,
  type ItemMenu,
} from "@/lib/navegacao";
import { telHref, whatsappHref } from "@/lib/format";
import { enderecoCompleto, getSettings, redesSociais } from "@/lib/settings";

function Coluna({ titulo, itens }: { titulo: string; itens: ItemMenu[] }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-graf-500">{titulo}</h3>
      <ul className="mt-4 space-y-2.5">
        {itens.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-sm text-graf-600 transition-colors hover:text-jb-700"
            >
              {item.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function Rodape() {
  const s = await getSettings();
  const sociais = redesSociais(s);
  const ano = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-graf-200 bg-graf-50">
      <div className="container-jb py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)] lg:gap-8">
          <div>
            <Logo altura={44} />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-graf-600">
              {s.empresa_resumo}
            </p>
            <p className="mt-4 text-sm text-graf-500">
              Em atividade desde {s.empresa_desde}.
            </p>

            {sociais.length > 0 ? (
              <ul className="mt-6 flex flex-wrap gap-2">
                {sociais.map((rede) => (
                  <li key={rede.chave}>
                    <a
                      href={rede.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center rounded-lg border border-graf-300 bg-white px-3.5 text-xs font-semibold text-graf-700 transition-colors hover:border-graf-400 hover:text-jb-700"
                    >
                      {rede.rotulo}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <Coluna titulo="Loja" itens={RODAPE_LOJA} />
          <Coluna titulo="Assistência" itens={RODAPE_ASSISTENCIA} />
          <Coluna titulo="Institucional" itens={RODAPE_INSTITUCIONAL} />

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-graf-500">
              Fale com a JB
            </h3>
            <ul className="mt-4 space-y-3 text-sm">
              {s.telefone ? (
                <li>
                  <a
                    href={telHref(s.telefone)}
                    className="flex items-start gap-2.5 text-graf-600 transition-colors hover:text-jb-700"
                  >
                    <Phone className="mt-0.5 size-4 shrink-0 text-graf-400" aria-hidden />
                    {s.telefone}
                  </a>
                </li>
              ) : null}
              {s.whatsapp ? (
                <li>
                  <a
                    href={whatsappHref(s.whatsapp, "Olá! Vim pelo site da JB.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2.5 text-graf-600 transition-colors hover:text-jb-700"
                  >
                    <MessageCircle className="mt-0.5 size-4 shrink-0 text-graf-400" aria-hidden />
                    {s.whatsapp}
                  </a>
                </li>
              ) : null}
              <li>
                <a
                  href={`mailto:${s.email}`}
                  className="flex items-start gap-2.5 text-graf-600 transition-colors hover:text-jb-700"
                >
                  <Mail className="mt-0.5 size-4 shrink-0 text-graf-400" aria-hidden />
                  <span className="[overflow-wrap:anywhere]">{s.email}</span>
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-graf-600">
                <MapPin className="mt-0.5 size-4 shrink-0 text-graf-400" aria-hidden />
                <address className="not-italic leading-relaxed">{enderecoCompleto(s)}</address>
              </li>
            </ul>
            <p className="mt-4 text-xs text-graf-500">{s.horario}</p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-graf-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-graf-500">
            © {ano} {s.empresa_nome}. Todos os direitos reservados.
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {RODAPE_POLITICAS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-xs text-graf-500 transition-colors hover:text-jb-700"
                >
                  {item.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
