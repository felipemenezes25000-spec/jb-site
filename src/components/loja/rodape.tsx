import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Building2,
  Clock3,
  FileText,
  Headphones,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Wrench,
} from "lucide-react";

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

/**
 * Rodapé da loja — composição horizontal única, em três faixas verticais:
 * cartão de contato · navegação e ações · assinatura editorial com a cadeira.
 *
 * A cadeira é a fotografia real (`/images/footer-dental-chair.png`), posicionada
 * fora do container para sangrar pela direita. Ela nunca é desenhada em CSS: o
 * que o CSS faz aqui é só o fundo abstrato — arcos finos e gradientes.
 *
 * Três degraus de largura, porque as proporções da referência (400 / 928 / 304)
 * só cabem inteiras a partir de ~1800px:
 *   < 1024px   uma coluna
 *   ≥ 1024px   cartão + navegação, editorial embaixo
 *   ≥ 1360px   as três faixas, tipografia um degrau menor
 *   ≥ 1800px   a referência
 */

type Icone = React.ComponentType<{ className?: string }>;

const CLASSE_LINK =
  "foco-jb flex min-h-[2.1rem] items-center rounded-xs text-[0.97rem] leading-snug text-graf-600 " +
  "transition-colors hover:text-jb-700 pointer-coarse:min-h-11 " +
  "min-[1800px]:text-[1.06rem]";

/** Sem dente no lucide: o traço segue a mesma gramática (24px, stroke 2, cantos redondos). */
function IconeDente({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 5.6C10.6 4 9 3.2 7.4 3.2 5 3.2 3.5 5 3.5 7.7c0 1.5.3 2.9.8 4.1.5 1.2.8 2.3 1 3.8.2 1.5.4 2.8.7 3.7.3.8.8 1.2 1.4 1.2.9 0 1.4-.7 1.7-1.9.3-1.2.5-2.6.7-3.9.2-1.2.5-1.8 1.2-1.8s1 .6 1.2 1.8c.2 1.3.4 2.7.7 3.9.3 1.2.8 1.9 1.7 1.9.6 0 1.1-.4 1.4-1.2.3-.9.5-2.2.7-3.7.2-1.5.5-2.6 1-3.8.5-1.2.8-2.6.8-4.1 0-2.7-1.5-4.5-3.9-4.5-1.6 0-3.2.8-4.6 2.4Z" />
    </svg>
  );
}

/**
 * Marca oficial de cada rede, desenhada inteira: o Facebook e o circulo azul
 * com o "f" vazado e o Instagram e o quadrado com o degrade oficial. Nada de
 * glifo generico sobre quadrado colorido — sao marcas registradas e a forma
 * faz parte delas.
 */
const SOCIAL: Record<string, () => React.ReactNode> = {
  facebook: () => (
    <svg viewBox="0 0 24 24" className="size-full" aria-hidden>
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.44 18.63.07 12 .07S0 5.44 0 12.07c0 5.99 4.39 10.95 10.13 11.86v-8.39H7.08v-3.47h3.05V9.43c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.24 2.69.24v2.95h-1.51c-1.49 0-1.96.93-1.96 1.87v2.25h3.33l-.53 3.47h-2.8v8.39C19.61 23.02 24 18.06 24 12.07Z"
      />
    </svg>
  ),
  instagram: () => (
    <svg viewBox="0 0 24 24" className="size-full" aria-hidden>
      <defs>
        <radialGradient id="jb-ig" cx="0.25" cy="1.05" r="1.25">
          <stop offset="0" stopColor="#FFDD55" />
          <stop offset="0.12" stopColor="#FFDD55" />
          <stop offset="0.32" stopColor="#FF543E" />
          <stop offset="0.55" stopColor="#C837AB" />
          <stop offset="0.82" stopColor="#8134AF" />
          <stop offset="1" stopColor="#5851DB" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="6.4" fill="url(#jb-ig)" />
      <path
        fill="#fff"
        d="M12 5.4c-1.79 0-2.02.01-2.72.04-.7.03-1.18.14-1.6.31-.43.17-.8.39-1.17.76-.37.37-.59.74-.76 1.17-.17.42-.28.9-.31 1.6-.03.7-.04.93-.04 2.72s.01 2.02.04 2.72c.3.7.14 1.18.31 1.6.17.43.39.8.76 1.17.37.37.74.59 1.17.76.42.17.9.28 1.6.31.7.03.93.04 2.72.04s2.02-.01 2.72-.04c.7-.03 1.18-.14 1.6-.31.43-.17.8-.39 1.17-.76.37-.37.59-.74.76-1.17.17-.42.28-.9.31-1.6.03-.7.04-.93.04-2.72s-.01-2.02-.04-2.72c-.03-.7-.14-1.18-.31-1.6a3.24 3.24 0 0 0-.76-1.17 3.24 3.24 0 0 0-1.17-.76c-.42-.17-.9-.28-1.6-.31-.7-.03-.93-.04-2.72-.04Zm0 1.19c1.76 0 1.97.01 2.66.04.64.03.99.14 1.22.23.31.12.53.26.76.49.23.23.37.45.49.76.09.23.2.58.23 1.22.3.69.04.9.04 2.66s-.01 1.97-.04 2.66c-.3.64-.14.99-.23 1.22-.12.31-.26.53-.49.76-.23.23-.45.37-.76.49-.23.09-.58.2-1.22.23-.69.03-.9.04-2.66.04s-1.97-.01-2.66-.04c-.64-.03-.99-.14-1.22-.23a2.05 2.05 0 0 1-.76-.49 2.05 2.05 0 0 1-.49-.76c-.09-.23-.2-.58-.23-1.22-.03-.69-.04-.9-.04-2.66s.01-1.97.04-2.66c.03-.64.14-.99.23-1.22.12-.31.26-.53.49-.76.23-.23.45-.37.76-.49.23-.9.58-.2 1.22-.23.69-.3.9-.04 2.66-.04Zm0 2.02a3.39 3.39 0 1 0 0 6.78 3.39 3.39 0 0 0 0-6.78Zm0 5.59a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4Zm4.32-5.72a.79.79 0 1 1-1.59 0 .79.79 0 0 1 1.59 0Z"
      />
    </svg>
  ),
  linkedin: () => (
    <svg viewBox="0 0 24 24" className="size-full" aria-hidden>
      <rect width="24" height="24" rx="4.2" fill="#0A66C2" />
      <path
        fill="#fff"
        d="M8.4 18.6H5.6V9.9h2.8v8.7ZM7 8.7a1.63 1.63 0 1 1 0-3.26 1.63 1.63 0 0 1 0 3.26Zm11.6 9.9h-2.8v-4.24c0-1.01-.02-2.31-1.41-2.31-1.41 0-1.63 1.1-1.63 2.24v4.31H9.97V9.9h2.68v1.19h.04c.37-.71 1.29-1.46 2.65-1.46 2.83 0 3.36 1.87 3.36 4.29v4.68Z"
      />
    </svg>
  ),
  youtube: () => (
    <svg viewBox="0 0 24 24" className="size-full" aria-hidden>
      <path
        fill="#FF0000"
        d="M23.5 6.9a3.02 3.02 0 0 0-2.12-2.14C19.5 4.25 12 4.25 12 4.25s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.9C0 8.79 0 12 0 12s0 3.21.5 5.1a3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14C24 15.21 24 12 24 12s0-3.21-.5-5.1ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z"
      />
    </svg>
  ),
};

function Coluna({
  titulo,
  itens,
  icone: IconeColuna,
}: {
  titulo: string;
  itens: ItemMenu[];
  icone: Icone;
}) {
  return (
    <div className="min-w-0">
      <h2 className="flex items-center gap-2.5 text-[0.9rem] font-black uppercase tracking-[0.05em] text-jb-600 min-[1800px]:gap-3 min-[1800px]:text-[1rem]">
        <IconeColuna className="size-[1.35rem] shrink-0 stroke-[2.1]" />
        {titulo}
      </h2>
      <ul className="mt-4 min-[1800px]:mt-5">
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

/** Ícone vermelho à esquerda, valor e apoio à direita. */
function LinhaContato({
  icone: IconeLinha,
  apoio,
  children,
}: {
  icone: Icone;
  apoio?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3 py-[0.25rem]">
      <span className="mt-0.5 flex justify-center text-jb-600" aria-hidden>
        <IconeLinha className="size-[1.2rem] stroke-[1.9]" />
      </span>
      <div className="min-w-0">
        <div className="text-[0.95rem] leading-[1.35] text-graf-700">{children}</div>
        {apoio ? (
          <p className="mt-0.5 text-[0.8rem] leading-snug text-graf-500">{apoio}</p>
        ) : null}
      </div>
    </div>
  );
}

/** Um dos quatro selos da faixa inferior. */
function Prova({
  icone: IconeProva,
  titulo,
  detalhe,
}: {
  icone: Icone;
  titulo: string;
  detalhe: string;
}) {
  return (
    <li className="flex items-center gap-3 px-4 min-[1800px]:px-7">
      <IconeProva className="size-[1.3rem] shrink-0 stroke-[1.8] text-jb-600" />
      <p className="whitespace-nowrap text-[0.8rem] leading-[1.35] text-graf-500">
        <strong className="block font-semibold text-graf-800">{titulo}</strong>
        {detalhe}
      </p>
    </li>
  );
}

/**
 * A cadeira. Fica fora do fluxo, ancorada na borda direita do container para que
 * a distância até a assinatura editorial não mude com a largura da tela — e
 * sangra além dela, que é o corte da referência.
 *
 * As duas máscaras dissolvem o lado esquerdo (para o texto respirar) e a base
 * (para não invadir a faixa inferior). Duas divs, uma máscara em cada: evita
 * depender de `mask-composite`.
 */
function CadeiraOdontologica() {
  return (
    <div
      className="pointer-events-none absolute top-4 hidden select-none min-[1360px]:-right-[11.5rem] min-[1360px]:top-6 min-[1360px]:block min-[1360px]:h-[25.9rem] min-[1360px]:w-[29rem] min-[1800px]:top-12 min-[1800px]:-right-[18rem] min-[1800px]:h-[31.8rem] min-[1800px]:w-[35.6rem]"
      style={{ maskImage: "linear-gradient(to right, transparent 0%, #000 9%)" }}
      aria-hidden
    >
      <div
        className="relative size-full"
        style={{ maskImage: "linear-gradient(to top, transparent 0%, #000 13%)" }}
      >
        <Image
          src="/images/footer-dental-chair.png"
          alt=""
          fill
          sizes="(min-width: 1800px) 570px, 464px"
          className="object-contain object-right-top opacity-[0.48]"
        />
      </div>
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
  /* O cartão quebra o endereço em duas linhas — logradouro em cima, o resto
     embaixo. A fonte continua sendo `enderecoCompleto`; aqui só se escolhe
     onde a linha corta, em vez de deixar o navegador partir no meio da rua. */
  const [logradouro, ...restoEndereco] = endereco.split(" — ");
  const complementoEndereco = [
    restoEndereco.join(" — "),
    s.endereco_cep ? `CEP ${s.endereco_cep}` : "",
  ]
    .filter(Boolean)
    .join(" — ");
  const whatsapp = s.whatsapp.trim()
    ? whatsappHref(s.whatsapp, "Olá! Vim pelo site da JB.")
    : "";
  const desdeNumero = Number.parseInt(s.empresa_desde, 10);
  const anosExperiencia =
    Number.isFinite(desdeNumero) && desdeNumero > 1900 && desdeNumero <= ano
      ? ano - desdeNumero
      : null;

  return (
    <footer className="relative isolate mt-auto overflow-hidden border-t border-jb-100/70 bg-[#fffdfc] text-graf-900">
      {/* Fundo: iluminação quase imperceptível e arcos editoriais de 1px. */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_80%_at_90%_40%,rgba(224,20,27,0.035),transparent_60%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[linear-gradient(180deg,rgba(224,20,27,0.02),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-[30rem] top-12 size-[37.5rem] rounded-full border border-jb-300/45"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-[35rem] top-2 size-[45rem] rounded-full border border-jb-200/40"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-[26rem] -top-[32rem] size-[64rem] rounded-full border border-jb-200/50"
        aria-hidden
      />

      <div className="container-jb relative z-10 max-w-[115rem] pt-9 min-[1800px]:pt-7">
        <CadeiraOdontologica />

        <div className="relative z-10 grid gap-10 min-[1150px]:grid-cols-[20rem_minmax(0,1fr)] min-[1150px]:gap-x-10 min-[1360px]:grid-cols-[27%_minmax(0,1fr)_17%] min-[1360px]:gap-x-8 min-[1800px]:grid-cols-[25rem_minmax(0,1fr)_19rem] min-[1800px]:gap-x-16">
          {/* ── Contato ───────────────────────────────────────────────────── */}
          <section
            /* Sem moldura: nenhum outro bloco do rodapé tem cartão, e este
               ficava numa placa branca com borda e sombra que o destacava do
               conjunto sem motivo — parecia um componente de outra página
               coberto ali dentro. Agora ele fica sobre o mesmo fundo dos
               demais, e sem o recuo interno o conteúdo alinha com a coluna
               "Loja" ao lado.

               O teto de largura continua valendo só a partir de 1360px, que é
               quando a cadeira entra e precisa do espaço. */
            className="w-full self-start min-[1360px]:max-w-[27rem]"
            aria-labelledby="rodape-contato"
          >
            <h2 id="rodape-contato" className="sr-only">
              Fale com a JB
            </h2>

            <div className="w-fit">
              <Logo altura={82} />
            </div>

            {s.empresa_resumo ? (
              <p className="mt-3.5 max-w-[17.5rem] text-[0.97rem] leading-[1.3] text-graf-600">
                {s.empresa_resumo}
              </p>
            ) : null}

            <div className="mt-4 h-px bg-jb-100" />

            <div className="mt-0.5">
              {s.telefone ? (
                <LinhaContato icone={Phone} apoio="Fale com nossa equipe">
                  <a
                    href={telHref(s.telefone)}
                    className="tabular foco-jb text-[1.3rem] font-extrabold leading-tight text-jb-600 transition-colors hover:text-jb-800"
                  >
                    {formatarTelefone(s.telefone)}
                  </a>
                </LinhaContato>
              ) : null}

              {whatsapp ? (
                <LinhaContato icone={MessageCircle} apoio="Atendimento rápido">
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="foco-jb inline-flex flex-wrap items-center gap-2.5 font-semibold text-graf-800 hover:text-jb-700"
                  >
                    <span className="tabular text-[1.02rem]">{formatarTelefone(s.whatsapp)}</span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[0.78rem] font-bold text-emerald-700">
                      WhatsApp
                    </span>
                  </a>
                </LinhaContato>
              ) : s.telefone_alternativo ? (
                <LinhaContato icone={MessageCircle} apoio="Atendimento rápido">
                  <a
                    href={telHref(s.telefone_alternativo)}
                    className="tabular foco-jb text-[1.02rem] font-semibold text-graf-800 hover:text-jb-700"
                  >
                    {formatarTelefone(s.telefone_alternativo)}
                  </a>
                </LinhaContato>
              ) : null}

              {s.email ? (
                <LinhaContato icone={Mail} apoio="Envie um e-mail">
                  <a
                    href={`mailto:${s.email}`}
                    className="foco-jb text-[0.78rem] text-graf-600 hover:text-jb-700 min-[1800px]:text-[0.85rem]"
                  >
                    <span className="[overflow-wrap:anywhere]">{s.email}</span>
                  </a>
                </LinhaContato>
              ) : null}

              {endereco ? (
                <LinhaContato icone={MapPin}>
                  <address className="not-italic text-[0.86rem] leading-[1.42] text-graf-600">
                    {logradouro}
                    {complementoEndereco ? (
                      <>
                        <br />
                        {complementoEndereco}
                      </>
                    ) : null}
                  </address>
                </LinhaContato>
              ) : null}

              {s.horario ? (
                <LinhaContato icone={Clock3} apoio="Horário de atendimento">
                  <p className="text-graf-600">{s.horario}</p>
                </LinhaContato>
              ) : null}
            </div>

            {/* As redes ficam lado a lado, com uma legenda só: empilhadas, cada
                rede nova esticaria o cartão e tiraria o rodapé da altura da
                referência. */}
            {sociais.length > 0 ? (
              <div className="mt-2 border-t border-jb-100 pt-2">
                <ul className="flex flex-wrap items-center gap-x-5 gap-y-1">
                  {sociais.map((rede) => {
                    const Marca = SOCIAL[rede.chave];
                    return (
                      <li key={rede.chave}>
                        <a
                          href={rede.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="foco-jb group flex min-h-9 items-center gap-2.5 rounded-xs pointer-coarse:min-h-11"
                        >
                          <span className="flex size-7 shrink-0 items-center justify-center" aria-hidden>
                            <Marca />
                          </span>
                          <span className="flex items-center gap-1.5 text-[0.95rem] font-semibold text-graf-800 transition-colors group-hover:text-jb-700">
                            {rede.rotulo}
                            <ArrowUpRight className="size-3.5" aria-hidden />
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
                <p className="pl-[2.375rem] text-[0.8rem] text-graf-500">
                  Acompanhe nossas novidades
                </p>
              </div>
            ) : null}
          </section>

          {/* ── Navegação e ações ─────────────────────────────────────────── */}
          <div className="min-w-0 min-[1150px]:pt-2 min-[1800px]:pt-10">
            <nav
              aria-label="Rodapé"
              className="grid grid-cols-2 gap-x-8 gap-y-9 min-[860px]:grid-cols-4 min-[860px]:gap-x-6 min-[1360px]:grid-cols-[repeat(4,max-content)] min-[1360px]:justify-between min-[1360px]:gap-x-0"
            >
              <Coluna titulo="Loja" itens={RODAPE_LOJA} icone={ShoppingCart} />
              <Coluna titulo="Assistência" itens={RODAPE_ASSISTENCIA} icone={Wrench} />
              <Coluna titulo="Área da Clínica" itens={RODAPE_CLIENTE} icone={IconeDente} />
              <Coluna titulo="Institucional" itens={RODAPE_INSTITUCIONAL} icone={Building2} />
            </nav>

            <div className="mt-9 grid gap-6 sm:grid-cols-2 sm:gap-0 min-[1360px]:mt-1 min-[1360px]:ml-[10%] min-[1800px]:ml-[27.5%]">
              <div className="sm:pr-9">
                <Link
                  href="/assistencia-tecnica/solicitar"
                  className="group foco-jb flex min-h-[3.4rem] items-center justify-between gap-4 rounded-[0.7rem] bg-jb-600 px-6 text-[0.97rem] font-bold text-white shadow-[0_16px_30px_-18px_rgba(164,10,16,0.75)] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-jb-700"
                >
                  <span className="flex items-center gap-3">
                    <Wrench className="size-[1.15rem] stroke-[2]" aria-hidden />
                    Solicitar assistência
                  </span>
                  <ArrowRight
                    className="size-[1.05rem] transition-transform group-hover:translate-x-1"
                    aria-hidden
                  />
                </Link>
                <p className="mt-3.5 text-center text-[0.85rem] leading-[1.45] text-graf-500">
                  Suporte técnico especializado
                  <br />e atendimento ágil.
                </p>
              </div>

              <div className="sm:border-l sm:border-graf-200 sm:pl-9">
                <Link
                  href="/orcamento"
                  className="group foco-jb flex min-h-[3.4rem] items-center justify-between gap-4 rounded-[0.7rem] border-[1.5px] border-jb-500 bg-white px-6 text-[0.97rem] font-bold text-jb-600 transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-jb-50"
                >
                  <span className="flex items-center gap-3">
                    <FileText className="size-[1.15rem] stroke-[2]" aria-hidden />
                    Pedir orçamento
                  </span>
                  <ArrowRight
                    className="size-[1.05rem] transition-transform group-hover:translate-x-1"
                    aria-hidden
                  />
                </Link>
                <p className="mt-3.5 text-center text-[0.85rem] leading-[1.45] text-graf-500">
                  Equipamentos, peças e serviços
                  <br />
                  com as melhores condições.
                </p>
              </div>
            </div>
          </div>

          {/* ── Assinatura editorial ──────────────────────────────────────── */}
          <div className="relative flex flex-col justify-between min-[1150px]:col-span-2 min-[1150px]:flex-row-reverse min-[1150px]:items-end min-[1150px]:justify-between min-[1360px]:col-span-1 min-[1360px]:flex-col min-[1360px]:min-h-[27rem] min-[1800px]:min-h-[32rem]">
            <div className="text-right min-[1800px]:pt-[6.4rem]">
              <p className="text-[0.8rem] font-semibold uppercase leading-[1.6] tracking-[0.34em] text-graf-500">
                Tecnologia
                <br />
                que move
              </p>
              <p className="mt-2.5 flex items-center justify-end gap-4">
                <span className="text-[2.15rem] font-light uppercase leading-none tracking-[0.1em] text-jb-600 min-[1800px]:text-[2.35rem]">
                  Sorrisos
                </span>
                <span className="h-px w-9 shrink-0 bg-jb-500" aria-hidden />
              </p>
              <p className="ml-auto mt-3.5 max-w-[10.5rem] text-[0.8rem] font-medium uppercase leading-[1.65] tracking-[0.28em] text-graf-500">
                {s.empresa_nome}
              </p>
            </div>

            <div className="mt-10 min-[1150px]:mt-0 min-[1360px]:mt-0 min-[1800px]:pb-5">
              <span className="mb-3.5 block h-px w-9 bg-jb-500" aria-hidden />
              <p
                className="text-[1.3rem] leading-[1.45] text-graf-500 min-[1360px]:text-[1.05rem] min-[1800px]:text-[1.45rem]"
                style={{ fontFamily: "var(--font-manuscrita), cursive" }}
              >
                Mais que equipamentos, parceria para o seu consultório.
              </p>
            </div>
          </div>
        </div>

        {/* ── Faixa inferior ──────────────────────────────────────────────── */}
        <div className="relative z-10 mt-6 border-t border-graf-200/70 py-[1.15rem] min-[1800px]:mt-[1.1rem]">
          <div className="grid gap-5 min-[960px]:grid-cols-2 min-[960px]:items-center min-[1840px]:grid-cols-[auto_minmax(0,1fr)_auto] min-[1840px]:gap-8">
            <div className="min-[960px]:order-1 min-[1840px]:order-none">
              <p className="text-[0.86rem] text-graf-600">
                © {ano} {s.empresa_nome}
                {s.empresa_desde ? <> · Em atividade desde {s.empresa_desde}</> : null}
              </p>
              <p className="mt-1 text-[0.8rem] text-graf-500">
                Qualidade • Confiança • Sempre ao lado do seu consultório
              </p>
            </div>

            <ul className="grid gap-5 min-[640px]:grid-cols-2 min-[960px]:order-3 min-[960px]:col-span-2 min-[960px]:flex min-[1840px]:order-none min-[1840px]:col-span-1 min-[960px]:justify-center min-[960px]:gap-0 min-[960px]:divide-x min-[960px]:divide-graf-200 min-[960px]:border-x min-[960px]:border-graf-200">
              <Prova
                icone={Award}
                titulo={anosExperiencia ? `+${anosExperiencia} anos` : "Experiência"}
                detalhe="de experiência"
              />
              <Prova
                icone={Truck}
                titulo="Atendimento"
                detalhe={
                  s.endereco_cidade ? `em ${s.endereco_cidade} e região` : "especializado"
                }
              />
              <Prova
                icone={ShieldCheck}
                titulo="Equipamentos com"
                detalhe="garantia e procedência"
              />
              <Prova icone={Headphones} titulo="Suporte técnico" detalhe="especializado" />
            </ul>

            <ul className="flex flex-wrap gap-x-6 gap-y-1 min-[960px]:order-2 min-[960px]:justify-end min-[1840px]:order-none">
              {RODAPE_POLITICAS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="foco-jb inline-flex min-h-8 items-center rounded-xs text-[0.86rem] text-graf-500 transition-colors hover:text-jb-700 pointer-coarse:min-h-11"
                  >
                    {item.rotulo}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
