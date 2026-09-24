import Link from "next/link";
import { BadgeCheck, Clock3, Mail, MapPin, Phone } from "lucide-react";

import { RevisarMedicao } from "@/components/analytics/revisar-medicao";
import { MarcaWhatsapp } from "@/components/site/marca-whatsapp";
import { Logo } from "@/components/ui/logo";
import { algumDestino, destinosDeMedicao } from "@/lib/analytics/destinos";
import { contatosWhatsapp, saudarPeloNome } from "@/lib/contatos-whatsapp";
import { MENSAGEM_PADRAO } from "@/lib/diagnostico";
import { PAGINAS_DE_EQUIPAMENTO } from "@/lib/paginas-equipamento";
import { formatarTelefone, telHref, whatsappHref } from "@/lib/format";
import { enderecoCompleto, type SettingsMap } from "@/lib/settings";

/** Lista oficial da EVOXX, onde qualquer um confere a autorização da JB. */
export const LISTA_EVOXX = "https://evoxx.com.br/assistencia/?estado=SP&cidade=9668";

/* ============================================================================
   Rodapé do site de assistência

   Fecha a experiência com contraste alto e todos os canais úteis. Continua
   sendo operacional: WhatsApp dos dois atendentes com nome e número, o
   telefone fixo da JB, e-mail, endereço, horário, páginas de equipamento e a
   fonte oficial da autorização EVOXX.
   ============================================================================ */

export function RodapeSite({ s }: { s: SettingsMap }) {
  const contatos = contatosWhatsapp(s);

  return (
    <footer id="contato" className="jb-footer-premium scroll-mt-20">
      <div className="container-jb grid gap-10 py-14 sm:grid-cols-2 md:py-16 lg:grid-cols-[1.25fr_1fr_1fr_1fr] lg:gap-12 lg:py-20">
        <div>
          <div className="jb-footer-logo-card inline-flex bg-white p-3">
            <Logo altura={40} />
          </div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-graf-600">
            Assistência e manutenção de equipamentos odontológicos de todas as marcas, em{" "}
            {s.endereco_cidade} e região, além de infraestrutura hidráulica e de esgoto sob visita técnica.
          </p>
          <a
            href={LISTA_EVOXX}
            target="_blank"
            rel="noopener noreferrer"
            className="jb-footer-badge foco-jb mt-5 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-colors"
          >
            <BadgeCheck className="size-4 text-jb-500" aria-hidden />
            Assistência técnica autorizada EVOXX
          </a>
        </div>

        <div>
          <h2 className="text-sm font-extrabold text-graf-950">Fale com a equipe</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {contatos.map(({ numero, nome }, indice) => (
              <li key={numero}>
                <a
                  href={whatsappHref(numero, saudarPeloNome(MENSAGEM_PADRAO, nome))}
                  data-whatsapp={indice === 0 ? "rodape" : "rodape-segundo"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="jb-footer-link foco-jb gap-2.5 rounded font-bold text-graf-900"
                >
                  <MarcaWhatsapp className="size-4 shrink-0 text-jb-500" />
                  <span>
                    <span className="sr-only">WhatsApp: </span>
                    {nome ? `${nome} · ` : null}
                    <span className="tabular">{formatarTelefone(numero)}</span>
                  </span>
                </a>
              </li>
            ))}
            {telHref(s.telefone) ? (
              <li>
                <a
                  href={telHref(s.telefone)}
                  data-telefone="rodape"
                  className="jb-footer-link foco-jb gap-2.5 rounded font-bold text-graf-900"
                >
                  <Phone className="size-4 shrink-0 text-jb-500" aria-hidden />
                  <span>
                    <span className="sr-only">Telefone: </span>
                    <span className="tabular">{s.telefone}</span>
                  </span>
                </a>
              </li>
            ) : null}
            {s.email ? (
              <li>
                <a
                  href={`mailto:${s.email}`}
                  className="jb-footer-link foco-jb gap-2.5 break-all rounded font-semibold text-graf-700"
                >
                  <Mail className="size-4 shrink-0 text-jb-500" aria-hidden />
                  {s.email}
                </a>
              </li>
            ) : null}
          </ul>
        </div>

        <nav aria-labelledby="rodape-equipamentos">
          <h2 id="rodape-equipamentos" className="text-sm font-extrabold text-graf-950">
            Assistência e serviços
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-1">
            {PAGINAS_DE_EQUIPAMENTO.map((pagina) => (
              <li key={pagina.slug}>
                <Link
                  href={`/${pagina.slug}`}
                  prefetch={false}
                  className="jb-footer-link foco-jb rounded font-semibold text-graf-700"
                >
                  {pagina.nomeCurto}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/#infraestrutura"
                prefetch={false}
                className="jb-footer-link foco-jb rounded font-semibold text-graf-700"
              >
                Infraestrutura hidráulica e esgoto
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-extrabold text-graf-950">Onde e quando</h2>
          <ul className="mt-4 space-y-4 text-sm text-graf-700">
            <li className="flex gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-jb-500" aria-hidden />
              <span className="leading-relaxed">{enderecoCompleto(s)}</span>
            </li>
            {s.horario ? (
              <li className="flex gap-2.5">
                <Clock3 className="mt-0.5 size-4 shrink-0 text-jb-500" aria-hidden />
                <span className="leading-relaxed">{s.horario}</span>
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="jb-footer-divisor border-t">
        <div className="container-jb flex flex-col gap-3 pb-28 pt-5 text-xs text-graf-500 sm:flex-row sm:items-center sm:justify-between md:pb-5">
          <p>{s.empresa_nome}</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            <li>
              <Link href="/privacidade" className="jb-footer-link foco-jb rounded">
                Privacidade
              </Link>
            </li>
            <li>
              <Link href="/termos" className="jb-footer-link foco-jb rounded">
                Termos de uso
              </Link>
            </li>
            {algumDestino(destinosDeMedicao(s)) ? (
              <li>
                <RevisarMedicao className="jb-footer-link foco-jb rounded" />
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </footer>
  );
}
