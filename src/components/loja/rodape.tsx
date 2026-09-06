import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { cacheLife, cacheTag } from "next/cache";

import { Logo } from "@/components/ui/logo";
import { ETIQUETA_CONFIGURACOES } from "@/lib/loja-publica";
import {
  RODAPE_ASSISTENCIA,
  RODAPE_CLIENTE,
  RODAPE_INSTITUCIONAL,
  RODAPE_LOJA,
  RODAPE_POLITICAS,
  type ItemMenu,
} from "@/lib/navegacao";
import { formatarTelefone, telHref, whatsappHref } from "@/lib/format";
import { enderecoCompleto, getSettings, redesSociais } from "@/lib/settings";

const CLASSE_LINK =
  "foco-jb flex min-h-9 items-center rounded-xs text-sm text-graf-700 transition-colors hover:text-jb-700 pointer-coarse:min-h-11";

function Coluna({ titulo, itens }: { titulo: string; itens: ItemMenu[] }) {
  return (
    <div>
      <h2 className="text-[0.8125rem] font-extrabold uppercase tracking-[0.08em] text-jb-700">{titulo}</h2>
      <ul className="mt-2">
        {itens.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className={CLASSE_LINK}>{item.rotulo}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function Rodape() {
  "use cache";
  cacheTag(ETIQUETA_CONFIGURACOES);
  cacheLife("hours");

  const s = await getSettings();
  const sociais = redesSociais(s);
  const ano = new Date().getFullYear();
  const endereco = enderecoCompleto(s);
  const whatsapp = whatsappHref(s.whatsapp, "Olá! Vim pelo site da JB.");

  return (
    <footer className="mt-auto border-t-4 border-jb-500 bg-white">
      <div className="container-jb max-w-[112rem] py-10 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-16">
          <div>
            <Logo altura={40} />

            {s.empresa_resumo ? <p className="mt-4 max-w-xs text-sm leading-relaxed text-graf-700">{s.empresa_resumo}</p> : null}

            <h2 className="sr-only">Fale com a JB</h2>
            <div className="mt-6">
              {s.telefone ? (
                <a href={telHref(s.telefone)} className="tabular foco-jb inline-flex min-h-11 items-center rounded-xs text-lg font-extrabold text-jb-700 transition-colors hover:text-jb-900">
                  {formatarTelefone(s.telefone)}
                </a>
              ) : null}

              {s.telefone_alternativo || whatsapp ? (
                <div className="flex flex-wrap items-center gap-x-5">
                  {s.telefone_alternativo ? (
                    <a href={telHref(s.telefone_alternativo)} className="tabular foco-jb inline-flex min-h-9 items-center rounded-xs text-sm text-graf-700 transition-colors hover:text-jb-700 pointer-coarse:min-h-11">
                      {formatarTelefone(s.telefone_alternativo)}
                    </a>
                  ) : null}

                  {whatsapp ? (
                    <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="foco-jb inline-flex min-h-9 items-center rounded-xs text-sm font-bold text-jb-700 transition-colors hover:text-jb-900 pointer-coarse:min-h-11">
                      WhatsApp
                    </a>
                  ) : null}
                </div>
              ) : null}

              {s.email ? (
                <a href={`mailto:${s.email}`} className="foco-jb flex min-h-9 items-center rounded-xs text-sm text-graf-700 transition-colors hover:text-jb-700 pointer-coarse:min-h-11">
                  <span className="[overflow-wrap:anywhere]">{s.email}</span>
                </a>
              ) : null}
            </div>

            {endereco || s.horario ? (
              <div className="mt-4 space-y-1 text-[0.8125rem] leading-relaxed text-graf-600">
                {endereco ? (
                  <address className="not-italic">
                    {endereco}
                    {s.endereco_cep ? <> — CEP {s.endereco_cep}</> : null}
                  </address>
                ) : null}
                {s.horario ? <p>{s.horario}</p> : null}
              </div>
            ) : null}

            {sociais.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-x-5">
                {sociais.map((rede) => (
                  <li key={rede.chave}>
                    <a href={rede.href} target="_blank" rel="noopener noreferrer" className="foco-jb inline-flex min-h-9 items-center gap-1 rounded-xs text-[0.8125rem] font-bold text-jb-700 transition-colors hover:text-jb-900 pointer-coarse:min-h-11">
                      {rede.rotulo}
                      <ArrowUpRight className="size-3.5" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <nav aria-label="Rodapé" className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
            <Coluna titulo="Loja" itens={RODAPE_LOJA} />
            <Coluna titulo="Assistência" itens={RODAPE_ASSISTENCIA} />
            <Coluna titulo="Área da Clínica" itens={RODAPE_CLIENTE} />
            <Coluna titulo="Institucional" itens={RODAPE_INSTITUCIONAL} />
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-x-8 gap-y-2 border-t border-jb-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.8125rem] text-graf-600">
            © {ano} {s.empresa_nome}
            {s.empresa_desde ? <> · Em atividade desde {s.empresa_desde}</> : null}
          </p>
          <ul className="flex flex-wrap gap-x-5">
            {RODAPE_POLITICAS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="foco-jb inline-flex min-h-9 items-center rounded-xs text-[0.8125rem] text-graf-600 transition-colors hover:text-jb-700 pointer-coarse:min-h-11">
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
