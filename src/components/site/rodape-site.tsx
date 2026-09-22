import Link from "next/link";
import { BadgeCheck, Clock3, Mail, MapPin, Phone } from "lucide-react";

import { RevisarMedicao } from "@/components/analytics/revisar-medicao";
import { BotaoWhatsapp } from "@/components/site/botao-whatsapp";
import { MarcaWhatsapp } from "@/components/site/marca-whatsapp";
import { Logo } from "@/components/ui/logo";
import { algumDestino, destinosDeMedicao } from "@/lib/analytics/destinos";
import { MENSAGEM_PADRAO } from "@/lib/diagnostico";
import { PAGINAS_DE_EQUIPAMENTO } from "@/lib/paginas-equipamento";
import { formatarTelefone, telHref, whatsappHref } from "@/lib/format";
import { enderecoCompleto, type SettingsMap } from "@/lib/settings";

/** Lista oficial da EVOXX, onde qualquer um confere a autorização da JB. */
export const LISTA_EVOXX = "https://evoxx.com.br/assistencia/?estado=SP&cidade=9668";

/* ============================================================================
   Rodapé do site de assistência

   Tudo o que alguém precisa para chamar a JB sem subir a página: WhatsApp,
   telefone, e-mail, endereço, horário. E a prova da autorização EVOXX com o
   link para a lista do fabricante, porque selo sem fonte é enfeite.
   ============================================================================ */

export function RodapeSite({ s }: { s: SettingsMap }) {
  const ligar = telHref(s.whatsapp);
  const whatsapp = whatsappHref(s.whatsapp, MENSAGEM_PADRAO);

  return (
    <footer id="contato" className="scroll-mt-20 border-t border-graf-200 bg-surface-muted">
      <div className="container-jb grid gap-10 py-14 sm:grid-cols-2 md:py-16 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <Logo altura={38} />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-graf-600">
            Assistência técnica para equipamentos odontológicos em {s.endereco_cidade} e região,
            na clínica ou na nossa bancada.
          </p>
          <a
            href={LISTA_EVOXX}
            target="_blank"
            rel="noopener noreferrer"
            className="foco-jb mt-5 inline-flex items-center gap-2 rounded-lg border border-graf-200 bg-white px-3 py-2 text-xs font-bold text-graf-800 transition-colors hover:border-jb-300 hover:text-jb-700"
          >
            <BadgeCheck className="size-4 text-jb-600" aria-hidden />
            Assistência técnica autorizada EVOXX
          </a>
        </div>

        <div>
          <h2 className="text-sm font-extrabold text-graf-950">Fale com a equipe</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {whatsapp ? (
              <li>
                <a
                  href={whatsapp}
                  data-whatsapp="rodape-numero"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="foco-jb inline-flex items-center gap-2.5 rounded font-bold text-graf-900 hover:text-jb-700"
                >
                  <MarcaWhatsapp className="size-4 text-jb-600" />
                  <span className="tabular">{formatarTelefone(s.whatsapp)}</span>
                </a>
              </li>
            ) : null}
            {ligar ? (
              <li>
                <a
                  href={ligar}
                  className="foco-jb inline-flex items-center gap-2.5 rounded font-semibold text-graf-700 hover:text-jb-700"
                >
                  <Phone className="size-4 text-jb-600" aria-hidden />
                  <span>Ligar para o mesmo número</span>
                </a>
              </li>
            ) : null}
            {s.email ? (
              <li>
                <a
                  href={`mailto:${s.email}`}
                  className="foco-jb inline-flex items-center gap-2.5 break-all rounded font-semibold text-graf-700 hover:text-jb-700"
                >
                  <Mail className="size-4 shrink-0 text-jb-600" aria-hidden />
                  {s.email}
                </a>
              </li>
            ) : null}
          </ul>
          <BotaoWhatsapp
            numero={s.whatsapp}
            mensagem={MENSAGEM_PADRAO}
            posicao="rodape"
            className="mt-6"
          />
        </div>

        <nav aria-labelledby="rodape-equipamentos">
          <h2 id="rodape-equipamentos" className="text-sm font-extrabold text-graf-950">
            Conserto de equipamentos
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-1">
            {PAGINAS_DE_EQUIPAMENTO.map((pagina) => (
              <li key={pagina.slug}>
                <Link
                  href={`/${pagina.slug}`}
                  className="foco-jb rounded font-semibold text-graf-700 hover:text-jb-700"
                >
                  {pagina.nomeCurto}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-extrabold text-graf-950">Onde e quando</h2>
          <ul className="mt-4 space-y-3 text-sm text-graf-700">
            <li className="flex gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
              <span className="leading-relaxed">{enderecoCompleto(s)}</span>
            </li>
            {s.horario ? (
              <li className="flex gap-2.5">
                <Clock3 className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
                <span className="leading-relaxed">{s.horario}</span>
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="border-t border-graf-200">
        <div className="container-jb flex flex-col gap-3 pb-28 pt-5 text-xs text-graf-500 sm:flex-row sm:items-center sm:justify-between md:pb-5">
          <p>{s.empresa_nome}</p>
          <ul className="flex gap-4">
            <li>
              <Link href="/privacidade" className="foco-jb rounded hover:text-jb-700">
                Privacidade
              </Link>
            </li>
            <li>
              <Link href="/termos" className="foco-jb rounded hover:text-jb-700">
                Termos de uso
              </Link>
            </li>
            {algumDestino(destinosDeMedicao(s)) ? (
              <li>
                <RevisarMedicao className="foco-jb rounded hover:text-jb-700" />
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </footer>
  );
}
