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
      <h3 className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-graf-500">{titulo}</h3>
      <ul className="mt-5 space-y-3">
        {itens.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="text-sm text-graf-400 transition-colors hover:text-white">
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
    <footer className="mt-auto bg-graf-950 text-graf-400">
      <div className="border-b border-white/10">
        <div className="container-jb grid gap-8 py-10 lg:grid-cols-[1fr_auto] lg:items-center lg:py-12">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-jb-400">JB Soluções Odontológicas</p>
            <h2 className="mt-3 max-w-3xl text-2xl font-extrabold tracking-[-0.035em] text-white lg:text-3xl">
              Equipamentos, assistência técnica e pós-venda que continuam juntos.
            </h2>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/loja" className="inline-flex h-11 items-center rounded-lg bg-white px-5 text-sm font-extrabold text-graf-950 hover:bg-graf-100">
              Ver equipamentos
            </Link>
            <Link href="/assistencia-tecnica/solicitar" className="inline-flex h-11 items-center rounded-lg bg-jb-600 px-5 text-sm font-extrabold text-white hover:bg-jb-500">
              Solicitar assistência
            </Link>
          </div>
        </div>
      </div>

      <div className="container-jb py-14 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.45fr_repeat(4,1fr)] lg:gap-10">
          <div>
            <div className="inline-flex rounded-xl bg-white px-3 py-2">
              <Logo altura={40} />
            </div>
            <p className="mt-6 max-w-sm text-sm leading-7 text-graf-400">{s.empresa_resumo}</p>
            <p className="mt-4 text-xs text-graf-500">Em atividade desde {s.empresa_desde}.</p>

            {sociais.length > 0 ? (
              <ul className="mt-6 flex flex-wrap gap-2">
                {sociais.map((rede) => (
                  <li key={rede.chave}>
                    <a
                      href={rede.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center rounded-lg border border-white/10 px-3.5 text-xs font-bold text-graf-300 transition hover:border-white/25 hover:text-white"
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
            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-graf-500">Fale com a JB</h3>
            <ul className="mt-5 space-y-4 text-sm">
              {s.telefone ? (
                <li>
                  <a href={telHref(s.telefone)} className="flex items-start gap-3 text-graf-400 transition hover:text-white">
                    <Phone className="mt-0.5 size-4 shrink-0 text-graf-600" aria-hidden />
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
                    className="flex items-start gap-3 text-graf-400 transition hover:text-white"
                  >
                    <MessageCircle className="mt-0.5 size-4 shrink-0 text-graf-600" aria-hidden />
                    {s.whatsapp}
                  </a>
                </li>
              ) : null}
              <li>
                <a href={`mailto:${s.email}`} className="flex items-start gap-3 text-graf-400 transition hover:text-white">
                  <Mail className="mt-0.5 size-4 shrink-0 text-graf-600" aria-hidden />
                  <span className="[overflow-wrap:anywhere]">{s.email}</span>
                </a>
              </li>
              <li className="flex items-start gap-3 text-graf-400">
                <MapPin className="mt-0.5 size-4 shrink-0 text-graf-600" aria-hidden />
                <address className="not-italic leading-6">{enderecoCompleto(s)}</address>
              </li>
            </ul>
            <p className="mt-5 text-xs leading-5 text-graf-600">{s.horario}</p>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-5 border-t border-white/10 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-graf-600">© {ano} {s.empresa_nome}. Todos os direitos reservados.</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {RODAPE_POLITICAS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-xs text-graf-600 transition hover:text-graf-300">{item.rotulo}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
