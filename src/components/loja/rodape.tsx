import Link from "next/link";
import { ArrowUpRight, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { Logo } from "@/components/ui/logo";
import {
  RODAPE_ASSISTENCIA,
  RODAPE_CLIENTE,
  RODAPE_INSTITUCIONAL,
  RODAPE_LOJA,
  RODAPE_POLITICAS,
  type ItemMenu,
} from "@/lib/navegacao";
import { telHref, whatsappHref } from "@/lib/format";
import { enderecoCompleto, getSettings, redesSociais } from "@/lib/settings";

/* ==========================================================================
   Rodapé da loja

   Dois blocos: à esquerda quem é a JB e como falar com ela — telefone,
   WhatsApp, e-mail, endereço e horário, tudo vindo de `getSettings`; à
   direita o mapa do site em quatro colunas.

   Campo vazio não vira travessão: some. Uma clínica que não vê o WhatsApp
   é melhor do que uma clínica que vê um WhatsApp que não existe.
   ========================================================================== */

const CLASSE_LINK =
  "inline-flex min-h-11 items-center rounded-xs text-sm text-graf-600 transition-colors hover:text-jb-700";

function Coluna({ titulo, itens }: { titulo: string; itens: ItemMenu[] }) {
  return (
    <div>
      <h2 className="text-xs font-bold uppercase tracking-wider text-graf-500">{titulo}</h2>
      <ul className="mt-2">
        {itens.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className={CLASSE_LINK}>
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
  const endereco = enderecoCompleto(s);

  return (
    <footer className="mt-auto border-t border-graf-200 bg-graf-50">
      <div className="container-jb py-14 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,2.3fr)] lg:gap-16">
          {/* ------------------------------------------- marca e contato */}
          <div>
            <Logo altura={44} />

            {s.empresa_resumo ? (
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-graf-600">
                {s.empresa_resumo}
              </p>
            ) : null}
            {s.empresa_desde ? (
              <p className="mt-3 text-sm text-graf-500">
                Em atividade desde {s.empresa_desde}, com equipe técnica própria.
              </p>
            ) : null}

            <h2 className="mt-9 text-xs font-bold uppercase tracking-wider text-graf-500">
              Fale com a JB
            </h2>
            <ul className="mt-3 space-y-1">
              {s.telefone ? (
                <li>
                  <a
                    href={telHref(s.telefone)}
                    className="flex min-h-11 items-center gap-3 rounded-xs text-sm font-semibold text-graf-800 transition-colors hover:text-jb-700"
                  >
                    <Phone className="size-4 shrink-0 text-graf-400" aria-hidden />
                    {s.telefone}
                  </a>
                </li>
              ) : null}

              {s.telefone_alternativo ? (
                <li>
                  <a
                    href={telHref(s.telefone_alternativo)}
                    className="flex min-h-11 items-center gap-3 rounded-xs text-sm text-graf-600 transition-colors hover:text-jb-700"
                  >
                    <Phone className="size-4 shrink-0 text-graf-400" aria-hidden />
                    {s.telefone_alternativo}
                  </a>
                </li>
              ) : null}

              {s.whatsapp ? (
                <li>
                  <a
                    href={whatsappHref(s.whatsapp, "Olá! Vim pelo site da JB.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 items-center gap-3 rounded-xs text-sm text-graf-600 transition-colors hover:text-jb-700"
                  >
                    <MessageCircle className="size-4 shrink-0 text-graf-400" aria-hidden />
                    WhatsApp {s.whatsapp}
                  </a>
                </li>
              ) : null}

              {s.email ? (
                <li>
                  <a
                    href={`mailto:${s.email}`}
                    className="flex min-h-11 items-center gap-3 rounded-xs text-sm text-graf-600 transition-colors hover:text-jb-700"
                  >
                    <Mail className="size-4 shrink-0 text-graf-400" aria-hidden />
                    <span className="[overflow-wrap:anywhere]">{s.email}</span>
                  </a>
                </li>
              ) : null}

              {endereco ? (
                <li className="flex gap-3 py-2 text-sm text-graf-600">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-graf-400" aria-hidden />
                  <address className="not-italic leading-relaxed">
                    {endereco}
                    {s.endereco_cep ? <> — CEP {s.endereco_cep}</> : null}
                  </address>
                </li>
              ) : null}

              {s.horario ? (
                <li className="flex items-center gap-3 py-2 text-sm text-graf-600">
                  <Clock className="size-4 shrink-0 text-graf-400" aria-hidden />
                  {s.horario}
                </li>
              ) : null}
            </ul>

            {sociais.length > 0 ? (
              <ul className="mt-6 flex flex-wrap gap-2">
                {sociais.map((rede) => (
                  <li key={rede.chave}>
                    <a
                      href={rede.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-graf-300 bg-white px-4 text-xs font-semibold text-graf-700 transition-colors hover:border-graf-400 hover:text-jb-700"
                    >
                      {rede.rotulo}
                      <ArrowUpRight className="size-3.5 text-graf-400" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* ------------------------------------------------ mapa do site */}
          <nav aria-label="Rodapé" className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
            <Coluna titulo="Loja" itens={RODAPE_LOJA} />
            <Coluna titulo="Assistência" itens={RODAPE_ASSISTENCIA} />
            <Coluna titulo="Área da clínica" itens={RODAPE_CLIENTE} />
            <Coluna titulo="Institucional" itens={RODAPE_INSTITUCIONAL} />
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-graf-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-graf-500">
            © {ano} {s.empresa_nome}. Todos os direitos reservados.
          </p>
          <ul className="flex flex-wrap gap-x-6">
            {RODAPE_POLITICAS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-xs text-sm text-graf-500 transition-colors hover:text-jb-700"
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
