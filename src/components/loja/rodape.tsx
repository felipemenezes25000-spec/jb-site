import Link from "next/link";
import { ArrowRight, ArrowUpRight, MessageCircle, Wrench } from "lucide-react";

import { cacheLife, cacheTag } from "next/cache";

import { LinkBotao } from "@/components/ui/button";
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
  "foco-jb flex min-h-9 items-center rounded-xs text-sm text-white/58 transition-colors hover:text-white pointer-coarse:min-h-11";

function Coluna({ titulo, itens }: { titulo: string; itens: ItemMenu[] }) {
  return (
    <div>
      <h2 className="text-[0.72rem] font-black uppercase tracking-[0.14em] text-jb-300">{titulo}</h2>
      <ul className="mt-3">
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
    <footer className="mt-auto border-t border-black bg-[#101113] text-white">
      <div className="container-jb max-w-[112rem] py-8 sm:py-10 lg:py-12">
        <div className="relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-white/[0.045] px-6 py-7 sm:px-8 sm:py-8 lg:px-10">
          <div className="absolute -right-20 -top-28 size-80 rounded-full border-[3.5rem] border-jb-500/15" aria-hidden />
          <div className="absolute inset-y-0 right-0 w-[12%] bg-jb-600" aria-hidden />

          <div className="relative z-10 grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-12">
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-jb-300">Próximo passo</p>
              <h2 className="mt-2 max-w-3xl text-[clamp(2rem,3.3vw,3.6rem)] font-black leading-[0.96] tracking-[-0.05em] text-white">
                Vai equipar a clínica ou precisa resolver um equipamento?
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
                Entre pelo caminho certo e deixe a equipe da JB conduzir a próxima etapa.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <LinkBotao href="/orcamento" variante="claro" tamanho="lg" className="w-full text-jb-700 hover:text-jb-900 sm:w-auto lg:w-full">
                Pedir orçamento
                <ArrowRight className="size-4" aria-hidden />
              </LinkBotao>
              <LinkBotao href="/assistencia-tecnica/solicitar" variante="contorno-claro" tamanho="lg" className="w-full sm:w-auto lg:w-full">
                <Wrench className="size-4" aria-hidden />
                Solicitar assistência
              </LinkBotao>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-16">
          <div>
            <div className="w-fit rounded-xl bg-white px-3 py-2 shadow-sm">
              <Logo altura={38} />
            </div>

            {s.empresa_resumo ? <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/55">{s.empresa_resumo}</p> : null}

            <h2 className="sr-only">Fale com a JB</h2>
            <div className="mt-6">
              {s.telefone ? (
                <a href={telHref(s.telefone)} className="tabular foco-jb inline-flex min-h-11 items-center rounded-xs text-lg font-black text-white transition-colors hover:text-jb-300">
                  {formatarTelefone(s.telefone)}
                </a>
              ) : null}

              {s.telefone_alternativo || whatsapp ? (
                <div className="flex flex-wrap items-center gap-x-5">
                  {s.telefone_alternativo ? (
                    <a href={telHref(s.telefone_alternativo)} className="tabular foco-jb inline-flex min-h-9 items-center rounded-xs text-sm text-white/55 transition-colors hover:text-white pointer-coarse:min-h-11">
                      {formatarTelefone(s.telefone_alternativo)}
                    </a>
                  ) : null}

                  {whatsapp ? (
                    <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="foco-jb inline-flex min-h-9 items-center gap-1.5 rounded-xs text-sm font-bold text-jb-300 transition-colors hover:text-white pointer-coarse:min-h-11">
                      <MessageCircle className="size-3.5" aria-hidden />
                      WhatsApp
                    </a>
                  ) : null}
                </div>
              ) : null}

              {s.email ? (
                <a href={`mailto:${s.email}`} className="foco-jb flex min-h-9 items-center rounded-xs text-sm text-white/55 transition-colors hover:text-white pointer-coarse:min-h-11">
                  <span className="[overflow-wrap:anywhere]">{s.email}</span>
                </a>
              ) : null}
            </div>

            {endereco || s.horario ? (
              <div className="mt-4 space-y-1 text-[0.78rem] leading-relaxed text-white/38">
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
                    <a href={rede.href} target="_blank" rel="noopener noreferrer" className="foco-jb inline-flex min-h-9 items-center gap-1 rounded-xs text-[0.78rem] font-bold text-jb-300 transition-colors hover:text-white pointer-coarse:min-h-11">
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

        <div className="mt-10 flex flex-col gap-x-8 gap-y-2 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.78rem] text-white/38">
            © {ano} {s.empresa_nome}
            {s.empresa_desde ? <> · Em atividade desde {s.empresa_desde}</> : null}
          </p>
          <ul className="flex flex-wrap gap-x-5">
            {RODAPE_POLITICAS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="foco-jb inline-flex min-h-9 items-center rounded-xs text-[0.78rem] text-white/38 transition-colors hover:text-white pointer-coarse:min-h-11">
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
