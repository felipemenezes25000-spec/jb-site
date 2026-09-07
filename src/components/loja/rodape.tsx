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

type Icone = React.ComponentType<{ className?: string }>;

const CLASSE_LINK =
  "foco-jb inline-flex min-h-9 items-center rounded-xs text-[0.94rem] leading-snug text-graf-600 " +
  "transition-colors hover:text-jb-700 pointer-coarse:min-h-11 min-[1536px]:text-[0.98rem]";

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
      <h2 className="flex min-h-7 items-center gap-2.5 text-[0.86rem] font-black uppercase tracking-[0.055em] text-jb-600 min-[1536px]:text-[0.9rem]">
        <IconeColuna className="size-[1.25rem] shrink-0 stroke-[2.1]" />
        {titulo}
      </h2>
      <ul className="mt-3.5 space-y-0.5">
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
    <div className="grid grid-cols-[1.6rem_minmax(0,1fr)] gap-x-2.5 py-1">
      <span className="mt-0.5 flex justify-center text-jb-600" aria-hidden>
        <IconeLinha className="size-[1.1rem] stroke-[1.9]" />
      </span>
      <div className="min-w-0">
        <div className="text-[0.91rem] leading-[1.35] text-graf-700">{children}</div>
        {apoio ? <p className="mt-0.5 text-[0.76rem] leading-snug text-graf-500">{apoio}</p> : null}
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
    <li className="flex min-w-0 items-center gap-2.5">
      <IconeProva className="size-[1.2rem] shrink-0 stroke-[1.8] text-jb-600" />
      <p className="min-w-0 text-[0.76rem] leading-[1.35] text-graf-500">
        <strong className="block font-semibold text-graf-800">{titulo}</strong>
        <span>{detalhe}</span>
      </p>
    </li>
  );
}

function CadeiraOdontologica() {
  return (
    <div
      className="pointer-events-none absolute -bottom-5 -right-8 hidden h-[20.5rem] w-[22.5rem] select-none min-[1360px]:block min-[1536px]:-right-12 min-[1536px]:h-[22rem] min-[1536px]:w-[24rem]"
      style={{ maskImage: "linear-gradient(to right, transparent 0%, #000 12%)" }}
      aria-hidden
    >
      <div
        className="relative size-full"
        style={{ maskImage: "linear-gradient(to top, transparent 0%, #000 12%)" }}
      >
        <Image
          src="/images/footer-dental-chair.png"
          alt=""
          fill
          sizes="(min-width: 1536px) 384px, 360px"
          className="object-contain object-right-bottom opacity-[0.4]"
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
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(78%_72%_at_92%_42%,rgba(224,20,27,0.04),transparent_62%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[linear-gradient(180deg,rgba(224,20,27,0.022),transparent)]"
        aria-hidden
      />

      <div className="container-jb relative z-10 max-w-[96rem] py-11 min-[1024px]:py-12 min-[1536px]:py-14">
        {/*
         * Uma única malha organiza todo o topo. No desktop grande ela vira:
         * marca | navegação (4 colunas iguais) | assinatura/arte.
         * Assim todos os títulos partem do mesmo eixo e a cadeira deixa de
         * empurrar ou desalinha os blocos centrais.
         */}
        <div className="grid items-start gap-y-12 min-[1150px]:grid-cols-[minmax(17rem,0.9fr)_minmax(0,2.25fr)] min-[1150px]:gap-x-11 min-[1360px]:grid-cols-[minmax(17rem,1.02fr)_minmax(0,2.55fr)_minmax(16rem,1fr)] min-[1360px]:gap-x-12">
          <section className="w-full self-start" aria-labelledby="rodape-contato">
            <h2 id="rodape-contato" className="sr-only">
              Fale com a JB
            </h2>

            <div className="w-fit">
              <Logo altura={78} />
            </div>

            {s.empresa_resumo ? (
              <p className="mt-3 max-w-[18rem] text-[0.92rem] leading-[1.35] text-graf-600">
                {s.empresa_resumo}
              </p>
            ) : null}

            <div className="my-3.5 h-px max-w-[19rem] bg-jb-100" />

            <div className="max-w-[20rem]">
              {s.telefone ? (
                <LinhaContato icone={Phone} apoio="Fale com nossa equipe">
                  <a
                    href={telHref(s.telefone)}
                    className="tabular foco-jb text-[1.18rem] font-extrabold leading-tight text-jb-600 transition-colors hover:text-jb-800"
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
                    className="foco-jb inline-flex flex-wrap items-center gap-2 font-semibold text-graf-800 hover:text-jb-700"
                  >
                    <span className="tabular">{formatarTelefone(s.whatsapp)}</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.72rem] font-bold text-emerald-700">
                      WhatsApp
                    </span>
                  </a>
                </LinhaContato>
              ) : s.telefone_alternativo ? (
                <LinhaContato icone={MessageCircle} apoio="Atendimento rápido">
                  <a
                    href={telHref(s.telefone_alternativo)}
                    className="tabular foco-jb font-semibold text-graf-800 hover:text-jb-700"
                  >
                    {formatarTelefone(s.telefone_alternativo)}
                  </a>
                </LinhaContato>
              ) : null}

              {s.email ? (
                <LinhaContato icone={Mail} apoio="Envie um e-mail">
                  <a
                    href={`mailto:${s.email}`}
                    className="foco-jb text-[0.78rem] text-graf-600 hover:text-jb-700"
                  >
                    <span className="[overflow-wrap:anywhere]">{s.email}</span>
                  </a>
                </LinhaContato>
              ) : null}

              {endereco ? (
                <LinhaContato icone={MapPin}>
                  <address className="not-italic text-[0.82rem] leading-[1.42] text-graf-600">
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
              <div className="mt-3 max-w-[20rem] border-t border-jb-100 pt-3">
                <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  {sociais.map((rede) => (
                    <li key={rede.chave}>
                      <a
                        href={rede.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="foco-jb group inline-flex min-h-9 items-center gap-1.5 rounded-xs text-[0.88rem] font-semibold text-graf-700 transition-colors hover:text-jb-700 pointer-coarse:min-h-11"
                      >
                        {rede.rotulo}
                        <ArrowUpRight
                          className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="mt-0.5 text-[0.76rem] text-graf-500">Acompanhe nossas novidades</p>
              </div>
            ) : null}
          </section>

          <nav
            aria-label="Rodapé"
            className="grid min-w-0 grid-cols-2 gap-x-8 gap-y-9 min-[760px]:grid-cols-4 min-[760px]:gap-x-7 min-[1360px]:gap-x-8"
          >
            <Coluna titulo="Loja" itens={RODAPE_LOJA} icone={ShoppingCart} />
            <Coluna titulo="Assistência" itens={RODAPE_ASSISTENCIA} icone={Wrench} />
            <Coluna titulo="Área da Clínica" itens={RODAPE_CLIENTE} icone={IconeDente} />
            <Coluna titulo="Institucional" itens={RODAPE_INSTITUCIONAL} icone={Building2} />
          </nav>

          <div className="relative flex min-h-[11rem] flex-col justify-between overflow-visible min-[760px]:flex-row min-[760px]:items-end min-[1150px]:col-span-2 min-[1360px]:col-span-1 min-[1360px]:min-h-[23rem] min-[1360px]:flex-col min-[1360px]:items-stretch">
            <CadeiraOdontologica />

            <div className="relative z-10 text-right">
              <p className="text-[0.74rem] font-semibold uppercase leading-[1.6] tracking-[0.32em] text-graf-500">
                Tecnologia
                <br />
                que move
              </p>
              <p className="mt-2 flex items-center justify-end gap-3">
                <span className="text-[1.95rem] font-light uppercase leading-none tracking-[0.09em] text-jb-600 min-[1536px]:text-[2.1rem]">
                  Sorrisos
                </span>
                <span className="h-px w-8 shrink-0 bg-jb-500" aria-hidden />
              </p>
              <p className="ml-auto mt-3 max-w-[10rem] text-[0.72rem] font-medium uppercase leading-[1.6] tracking-[0.25em] text-graf-500">
                {s.empresa_nome}
              </p>
            </div>

            <div className="relative z-10 mt-8 max-w-[15rem] min-[760px]:mt-0 min-[760px]:text-left min-[1360px]:mb-1">
              <span className="mb-3 block h-px w-8 bg-jb-500" aria-hidden />
              <p
                className="text-[1.15rem] leading-[1.45] text-graf-500 min-[1536px]:text-[1.25rem]"
                style={{ fontFamily: "var(--font-manuscrita), cursive" }}
              >
                Mais que equipamentos, parceria para o seu consultório.
              </p>
            </div>
          </div>
        </div>

        {/* Ações fora das colunas: nenhum botão altera a altura ou o eixo da navegação. */}
        <div className="mt-10 border-y border-jb-100/80 py-6 min-[1360px]:mt-11">
          <div className="mx-auto grid max-w-[50rem] gap-5 sm:grid-cols-2 sm:gap-7">
            <div>
              <Link
                href="/assistencia-tecnica/solicitar"
                className="group foco-jb flex min-h-[3.35rem] items-center justify-between gap-4 rounded-[0.7rem] bg-jb-600 px-5 text-[0.94rem] font-bold text-white shadow-[0_16px_30px_-18px_rgba(164,10,16,0.72)] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-jb-700"
              >
                <span className="flex items-center gap-2.5">
                  <Wrench className="size-[1.1rem] stroke-[2]" aria-hidden />
                  Solicitar assistência
                </span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
              <p className="mt-2.5 text-center text-[0.8rem] leading-[1.4] text-graf-500">
                Suporte técnico especializado e atendimento ágil.
              </p>
            </div>

            <div>
              <Link
                href="/orcamento"
                className="group foco-jb flex min-h-[3.35rem] items-center justify-between gap-4 rounded-[0.7rem] border-[1.5px] border-jb-500 bg-white px-5 text-[0.94rem] font-bold text-jb-600 transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-jb-50"
              >
                <span className="flex items-center gap-2.5">
                  <FileText className="size-[1.1rem] stroke-[2]" aria-hidden />
                  Pedir orçamento
                </span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
              <p className="mt-2.5 text-center text-[0.8rem] leading-[1.4] text-graf-500">
                Equipamentos, peças e serviços com as melhores condições.
              </p>
            </div>
          </div>
        </div>

        {/* Faixa final em três zonas: empresa | provas | políticas. */}
        <div className="pt-6">
          <div className="grid gap-6 min-[1180px]:grid-cols-[minmax(14rem,0.9fr)_minmax(0,1.7fr)_minmax(14rem,0.9fr)] min-[1180px]:items-center min-[1180px]:gap-7">
            <div>
              <p className="text-[0.81rem] text-graf-600">
                © {ano} {s.empresa_nome}
                {s.empresa_desde ? <> · Em atividade desde {s.empresa_desde}</> : null}
              </p>
              <p className="mt-1 text-[0.75rem] text-graf-500">
                Qualidade • Confiança • Sempre ao lado do seu consultório
              </p>
            </div>

            <ul className="grid gap-x-5 gap-y-4 sm:grid-cols-2 min-[1180px]:border-x min-[1180px]:border-graf-200 min-[1180px]:px-6 min-[1536px]:grid-cols-4">
              <Prova
                icone={Award}
                titulo={anosExperiencia ? `+${anosExperiencia} anos` : "Experiência"}
                detalhe="de experiência"
              />
              <Prova
                icone={Truck}
                titulo="Atendimento"
                detalhe={s.endereco_cidade ? `em ${s.endereco_cidade} e região` : "especializado"}
              />
              <Prova
                icone={ShieldCheck}
                titulo="Equipamentos com"
                detalhe="garantia e procedência"
              />
              <Prova icone={Headphones} titulo="Suporte técnico" detalhe="especializado" />
            </ul>

            <ul className="flex flex-wrap gap-x-5 gap-y-1 min-[1180px]:justify-end">
              {RODAPE_POLITICAS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="foco-jb inline-flex min-h-8 items-center rounded-xs text-[0.8rem] text-graf-500 transition-colors hover:text-jb-700 pointer-coarse:min-h-11"
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
