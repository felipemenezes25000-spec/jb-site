import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Building2,
  Clock3,
  FileText,
  Headphones,
  Heart,
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

type Icone = React.ComponentType<{ className?: string }>;

const CLASSE_LINK =
  "foco-jb flex min-h-[2rem] items-center rounded-md text-corpo leading-snug text-graf-600 " +
  "transition-[color,transform] duration-200 hover:translate-x-0.5 hover:text-jb-700 pointer-coarse:min-h-11";

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

function MarcaSocial({ chave }: { chave: string }) {
  if (chave === "facebook") {
    return (
      <svg viewBox="0 0 24 24" className="size-full" aria-hidden>
        <circle cx="12" cy="12" r="12" fill="#1877F2" />
        <path
          fill="#fff"
          d="M13.7 20v-7h2.35l.35-2.73h-2.7V8.53c0-.79.22-1.33 1.35-1.33h1.44V4.76a19 19 0 0 0-2.1-.11c-2.08 0-3.5 1.27-3.5 3.6v2.02H8.54V13h2.35v7h2.81Z"
        />
      </svg>
    );
  }

  if (chave === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className="size-full" aria-hidden>
        <defs>
          <linearGradient id="jb-instagram-footer" x1="2" y1="22" x2="22" y2="2">
            <stop offset="0" stopColor="#FFB800" />
            <stop offset=".35" stopColor="#FF3D68" />
            <stop offset=".7" stopColor="#C837AB" />
            <stop offset="1" stopColor="#6656D9" />
          </linearGradient>
        </defs>
        <rect width="24" height="24" rx="6" fill="url(#jb-instagram-footer)" />
        <rect x="5.4" y="5.4" width="13.2" height="13.2" rx="4" fill="none" stroke="#fff" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="3.15" fill="none" stroke="#fff" strokeWidth="1.7" />
        <circle cx="16.7" cy="7.55" r="1.05" fill="#fff" />
      </svg>
    );
  }

  if (chave === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" className="size-full" aria-hidden>
        <rect width="24" height="24" rx="5" fill="#0A66C2" />
        <path fill="#fff" d="M7.5 9.5H5V19h2.5V9.5ZM6.25 5A1.5 1.5 0 1 0 6.25 8a1.5 1.5 0 0 0 0-3ZM19 13.55c0-2.86-1.52-4.19-3.55-4.19-1.64 0-2.37.9-2.78 1.54V9.5h-2.5V19h2.5v-4.7c0-1.24.24-2.45 1.78-2.45 1.52 0 1.54 1.42 1.54 2.53V19H19v-5.45Z" />
      </svg>
    );
  }

  if (chave === "youtube") {
    return (
      <svg viewBox="0 0 24 24" className="size-full" aria-hidden>
        <rect y="4.5" width="24" height="15" rx="5" fill="#FF0000" />
        <path fill="#fff" d="m10 8.8 6 3.2-6 3.2V8.8Z" />
      </svg>
    );
  }

  return (
    <span className="flex size-full items-center justify-center rounded-full bg-graf-800 text-[10px] font-black uppercase text-white">
      {chave.slice(0, 1)}
    </span>
  );
}

function Coluna({
  titulo,
  itens,
  icone: IconeColuna,
  separador = false,
}: {
  titulo: string;
  itens: ItemMenu[];
  icone: Icone;
  separador?: boolean;
}) {
  return (
    <div
      className={
        "min-w-0 " +
        (separador
          ? "min-[900px]:border-l min-[900px]:border-graf-200/80 min-[900px]:pl-8 min-[1400px]:pl-10"
          : "")
      }
    >
      <h2 className="flex items-center gap-2.5 text-sm font-black uppercase tracking-[0.045em] text-jb-600">
        <IconeColuna className="size-[1.3rem] shrink-0 stroke-[2]" />
        {titulo}
      </h2>
      <ul className="mt-4 space-y-0.5">
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
    <div className="grid grid-cols-[2.15rem_minmax(0,1fr)] gap-x-3 py-[0.32rem]">
      <span
        className="flex size-8 items-center justify-center rounded-full bg-white text-jb-600 shadow-[0_5px_15px_-9px_rgba(164,10,16,0.55)] ring-1 ring-jb-100"
        aria-hidden
      >
        <IconeLinha className="size-[1.05rem] stroke-[1.9]" />
      </span>
      <div className="min-w-0 pt-0.5">
        <div className="text-corpo leading-[1.35] text-graf-700">{children}</div>
        {apoio ? <p className="mt-0.5 text-xs leading-snug text-graf-500">{apoio}</p> : null}
      </div>
    </div>
  );
}

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
    <li className="flex min-w-0 items-center gap-3.5 px-5 py-4 min-[1100px]:px-7">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-jb-600 ring-1 ring-graf-200/80">
        <IconeProva className="size-[1.35rem] stroke-[1.9]" />
      </span>
      <p className="min-w-0 text-xs leading-[1.4] text-graf-500">
        <strong className="block text-[0.82rem] font-bold leading-snug text-graf-800">{titulo}</strong>
        <span className="mt-0.5 block">{detalhe}</span>
      </p>
    </li>
  );
}

/**
 * O rodapé é cacheado, e por isso ele não fala de sessão.
 *
 * O problema real era este: ele oferecia "Entrar" e "Criar conta" a quem o
 * cabeçalho, quatro telas acima, cumprimentava pelo nome. Convidar a criar
 * conta quem já tem uma sugere que a sessão caiu.
 *
 * A primeira correção foi receber esses dois links de fora, como `ReactNode`
 * dentro de um `<Suspense>`, do jeito que o cabeçalho faz com `AcessoDaConta`.
 * **Não refaça isso.** Uma fronteira de streaming entregue como prop a um
 * componente `"use cache"` resolve tarde e re-renderiza a casca inteira — e a
 * gaveta do celular, que guarda estado de aberta/fechada, era arrancada do DOM
 * no meio do toque. Medido em 15/09/2026: o teste da gaveta passou a falhar
 * com "element was detached from the DOM" em toda execução, e voltou a passar
 * assim que o slot saiu.
 *
 * A saída que ficou é mais simples e não custa fronteira nenhuma: o rodapé só
 * lista links verdadeiros nos dois estados (ver `RODAPE_CLIENTE`). Quem não
 * tem sessão e clicar em "Meus pedidos" cai na tela de entrada, que é para
 * onde queria ir; e o caminho de entrar continua no cabeçalho, que é dinâmico
 * de verdade.
 */
export async function Rodape() {
  "use cache";
  cacheTag(ETIQUETA_CONFIGURACOES);
  cacheLife("hours");

  const s = await getSettings();
  const sociais = redesSociais(s);
  const ano = new Date().getFullYear();
  const endereco = enderecoCompleto(s);
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
  const cidade = s.endereco_cidade || "São Paulo";

  return (
    <footer className="relative isolate mt-auto overflow-hidden border-t border-graf-200 bg-[#fdfdfd] text-graf-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_18%_0%,rgba(164,10,16,0.045),transparent_62%)]" />

      <div className="container-loja relative z-10 py-8 min-[1200px]:py-10">
        <div className="grid gap-4 min-[1200px]:grid-cols-[27rem_minmax(0,1fr)] min-[1400px]:grid-cols-[29rem_minmax(0,1fr)] min-[1200px]:gap-5">
          <section
            className="rounded-[1.65rem] border border-graf-200/80 bg-[linear-gradient(145deg,#fffafa_0%,#fff_62%,#fff8f8_100%)] p-6 shadow-[0_24px_70px_-48px_rgba(53,23,25,0.38)] min-[1400px]:p-7"
            aria-labelledby="rodape-contato"
          >
            <h2 id="rodape-contato" className="sr-only">
              Fale com a JB
            </h2>

            <div className="w-fit">
              <Logo altura={82} />
            </div>

            {s.empresa_resumo ? (
              <p className="mt-3.5 max-w-[21rem] text-corpo leading-[1.38] text-graf-600">
                {s.empresa_resumo}
              </p>
            ) : null}

            <div className="my-3.5 h-px bg-jb-100/90" />

            <div>
              {s.telefone ? (
                <LinhaContato icone={Phone} apoio="Fale com nossa equipe">
                  <a
                    href={telHref(s.telefone)}
                    className="tabular foco-jb inline-flex items-center pointer-coarse:min-h-11 text-xl font-extrabold leading-tight text-jb-600 transition-colors hover:text-jb-800"
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
                    className="foco-jb inline-flex flex-wrap items-center gap-2 pointer-coarse:min-h-11 font-semibold text-graf-800 transition-colors hover:text-jb-700"
                  >
                    <span className="tabular text-base">{formatarTelefone(s.whatsapp)}</span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                      WhatsApp
                    </span>
                  </a>
                </LinhaContato>
              ) : s.telefone_alternativo ? (
                <LinhaContato icone={MessageCircle} apoio="Atendimento rápido">
                  <a
                    href={telHref(s.telefone_alternativo)}
                    className="tabular foco-jb inline-flex items-center pointer-coarse:min-h-11 text-base font-semibold text-graf-800 hover:text-jb-700"
                  >
                    {formatarTelefone(s.telefone_alternativo)}
                  </a>
                </LinhaContato>
              ) : null}

              {s.email ? (
                <LinhaContato icone={Mail} apoio="Envie um e-mail">
                  <a
                    href={`mailto:${s.email}`}
                    className="foco-jb inline-flex min-h-6 items-center pointer-coarse:min-h-11 text-xs text-graf-600 hover:text-jb-700"
                  >
                    <span className="[overflow-wrap:anywhere]">{s.email}</span>
                  </a>
                </LinhaContato>
              ) : null}

              {endereco ? (
                <LinhaContato icone={MapPin}>
                  <address className="not-italic text-apoio leading-[1.42] text-graf-600">
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

            {sociais.length > 0 ? (
              <div className="mt-3 border-t border-jb-100/90 pt-3">
                <ul className="flex flex-wrap items-center gap-x-5 gap-y-1">
                  {sociais.map((rede) => (
                    <li key={rede.chave}>
                      <a
                        href={rede.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="foco-jb group flex min-h-9 items-center gap-2.5 rounded-md pointer-coarse:min-h-11"
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center" aria-hidden>
                          <MarcaSocial chave={rede.chave} />
                        </span>
                        <span className="flex items-center gap-1.5 text-corpo font-semibold text-graf-800 transition-colors group-hover:text-jb-700">
                          {rede.rotulo}
                          <ArrowUpRight className="size-3.5" aria-hidden />
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="mt-0.5 pl-[2.4rem] text-xs text-graf-500">
                  Acompanhe nossas novidades
                </p>
              </div>
            ) : null}
          </section>

          <section className="overflow-hidden rounded-[1.65rem] border border-graf-200/80 bg-white shadow-[0_24px_70px_-52px_rgba(24,24,27,0.34)]">
            <nav
              aria-label="Rodapé"
              className="grid grid-cols-2 gap-x-7 gap-y-9 p-6 min-[900px]:grid-cols-4 min-[1200px]:gap-x-5 min-[1400px]:gap-x-8 min-[1400px]:p-8"
            >
              <Coluna titulo="Loja" itens={RODAPE_LOJA} icone={ShoppingCart} />
              <Coluna titulo="Assistência" itens={RODAPE_ASSISTENCIA} icone={Wrench} separador />
              <Coluna titulo="Área da Clínica" itens={RODAPE_CLIENTE} icone={IconeDente} separador />
              <Coluna titulo="Institucional" itens={RODAPE_INSTITUCIONAL} icone={Building2} separador />
            </nav>

            <div className="mx-6 border-t border-graf-200/80 min-[1400px]:mx-8" />

            <div className="grid gap-5 p-6 pt-5 sm:grid-cols-2 sm:gap-0 min-[1400px]:p-8 min-[1400px]:pt-6">
              <div className="sm:pr-7 min-[1400px]:pr-9">
                <Link
                  href="/assistencia-tecnica/solicitar"
                  className="group foco-jb flex min-h-[3.6rem] items-center justify-between gap-4 rounded-[0.95rem] bg-jb-600 px-6 text-corpo font-bold text-white shadow-[0_18px_34px_-20px_rgba(164,10,16,0.85)] transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-jb-700 hover:shadow-[0_22px_38px_-20px_rgba(164,10,16,0.9)]"
                >
                  <span className="flex items-center gap-3">
                    <Wrench className="size-[1.15rem] stroke-[2]" aria-hidden />
                    Solicitar assistência
                  </span>
                  <ArrowRight className="size-[1.05rem] transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
                <p className="mt-3 text-center text-apoio leading-[1.45] text-graf-500">
                  Suporte técnico especializado
                  <br />e atendimento ágil.
                </p>
              </div>

              <div className="sm:border-l sm:border-graf-200 sm:pl-7 min-[1400px]:pl-9">
                <Link
                  href="/orcamento"
                  className="group foco-jb flex min-h-[3.6rem] items-center justify-between gap-4 rounded-[0.95rem] border-[1.5px] border-jb-500 bg-white px-6 text-corpo font-bold text-jb-600 transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-jb-50 hover:shadow-[0_16px_28px_-22px_rgba(164,10,16,0.55)]"
                >
                  <span className="flex items-center gap-3">
                    <FileText className="size-[1.15rem] stroke-[2]" aria-hidden />
                    Pedir orçamento
                  </span>
                  <ArrowRight className="size-[1.05rem] transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
                <p className="mt-3 text-center text-apoio leading-[1.45] text-graf-500">
                  Equipamentos, peças e serviços
                  <br />com as melhores condições.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-4 overflow-hidden rounded-[1.35rem] border border-graf-200/80 bg-[#fafafa] shadow-[0_18px_48px_-42px_rgba(24,24,27,0.35)]">
          <ul className="grid sm:grid-cols-2 min-[1100px]:grid-cols-4 min-[1100px]:divide-x min-[1100px]:divide-graf-200/80">
            <Prova
              icone={Award}
              titulo={anosExperiencia ? `+${anosExperiencia} anos de experiência` : "Experiência consolidada"}
              detalhe="Confiança e expertise no seu consultório."
            />
            <Prova
              icone={Truck}
              titulo={`Atendimento em ${cidade} e região`}
              detalhe="Agilidade onde você precisa."
            />
            <Prova
              icone={ShieldCheck}
              titulo="Equipamentos com garantia e procedência"
              detalhe="Segurança para o seu investimento."
            />
            <Prova
              icone={Headphones}
              titulo="Suporte técnico especializado"
              detalhe="Do diagnóstico à solução."
            />
          </ul>
        </div>

        <div className="mt-4 grid gap-4 border-t border-graf-200/80 pt-4 min-[1050px]:grid-cols-[1fr_auto_auto] min-[1050px]:items-center min-[1050px]:gap-8">
          <div className="min-w-0">
            <p className="text-apoio text-graf-600">© {ano} {s.empresa_nome}</p>
            <p className="mt-1 text-xs text-graf-500">
              Qualidade • Confiança • Sempre ao lado do seu consultório
            </p>
          </div>

          <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 min-[1050px]:justify-center">
            {RODAPE_POLITICAS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="foco-jb inline-flex min-h-8 items-center rounded-md text-apoio text-graf-500 transition-colors hover:text-jb-700 pointer-coarse:min-h-11"
                >
                  {item.rotulo}
                </Link>
              </li>
            ))}
          </ul>

          <p className="flex items-center gap-2 whitespace-nowrap text-xs text-graf-500 min-[1050px]:justify-end">
            <Heart className="size-4 fill-transparent stroke-[1.8] text-jb-600" aria-hidden />
            Feito para o <strong className="font-bold text-jb-600">seu sorriso</strong>
          </p>
        </div>
      </div>
    </footer>
  );
}
