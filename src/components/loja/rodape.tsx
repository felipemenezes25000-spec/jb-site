import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Building2,
  Clock3,
  FileText,
  Headphones,
  HeartPulse,
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

const CLASSE_LINK =
  "foco-jb flex min-h-9 items-center rounded-xs text-[0.92rem] text-graf-600 transition-colors hover:text-jb-700 pointer-coarse:min-h-11";

type Icone = React.ComponentType<{ className?: string }>;

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
      <h2 className="flex items-center gap-3 text-[0.78rem] font-black uppercase tracking-[0.08em] text-jb-700">
        <IconeColuna className="size-5 shrink-0 stroke-[2.2]" aria-hidden />
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
  titulo,
  detalhe,
  children,
}: {
  icone: Icone;
  titulo?: string;
  detalhe?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 py-2.5">
      <span className="flex size-8 items-center justify-center text-jb-600" aria-hidden>
        <IconeLinha className="size-[1.15rem] stroke-[2.1]" />
      </span>
      <div className="min-w-0 self-center">
        {titulo ? <p className="text-[0.72rem] font-semibold text-graf-400">{titulo}</p> : null}
        <div className="text-[0.88rem] leading-snug text-graf-700">{children}</div>
        {detalhe ? <p className="mt-0.5 text-[0.68rem] leading-snug text-graf-400">{detalhe}</p> : null}
      </div>
    </div>
  );
}

function VisualOdontologico({ empresa }: { empresa: string }) {
  return (
    <div className="relative hidden min-h-[31rem] overflow-hidden xl:block">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_48%,rgba(220,38,38,0.06),transparent_42%)]" aria-hidden />
      <div className="absolute -right-[13rem] -top-[16rem] size-[43rem] rounded-full border border-jb-300/60" aria-hidden />
      <div className="absolute -right-[9rem] -top-[12rem] size-[34rem] rounded-full border border-jb-100" aria-hidden />

      {/* Silhueta editorial de uma cadeira odontológica: decorativa e propositalmente suave. */}
      <div className="pointer-events-none absolute bottom-[-2.5rem] right-[-4.5rem] h-[29rem] w-[29rem] opacity-70" aria-hidden>
        <div className="absolute bottom-[2.5rem] left-[7rem] h-7 w-48 rounded-[50%] bg-graf-200/70 blur-[1px]" />
        <div className="absolute bottom-[4rem] left-[13.5rem] h-32 w-8 -rotate-12 rounded-full bg-gradient-to-b from-white to-graf-200 shadow-[0_12px_36px_rgba(32,34,38,0.08)]" />
        <div className="absolute bottom-[10.5rem] left-[7rem] h-[5.8rem] w-[18rem] rotate-[7deg] rounded-[52%_45%_44%_48%] border border-graf-200 bg-gradient-to-br from-white via-white to-graf-100 shadow-[0_18px_42px_rgba(32,34,38,0.08)]" />
        <div className="absolute bottom-[15rem] left-[9.2rem] h-[12rem] w-[7.5rem] rotate-[19deg] rounded-[2.8rem] border border-graf-200 bg-gradient-to-br from-white via-white to-graf-100 shadow-[0_20px_45px_rgba(32,34,38,0.08)]">
          <div className="absolute inset-y-5 left-[-0.28rem] w-2 rounded-full bg-jb-500/70" />
        </div>
        <div className="absolute bottom-[24.7rem] left-[8.2rem] h-14 w-20 rotate-[12deg] rounded-[45%] border border-graf-200 bg-white shadow-[0_10px_28px_rgba(32,34,38,0.07)]" />

        <div className="absolute right-[3.8rem] top-[1.2rem] h-[10rem] w-2 rotate-[13deg] rounded-full bg-graf-200/80" />
        <div className="absolute right-[4.6rem] top-[0.7rem] h-2 w-28 -rotate-[22deg] rounded-full bg-graf-200/80" />
        <div className="absolute right-[10rem] top-[-0.1rem] h-12 w-24 rotate-[8deg] rounded-[50%] border border-graf-200 bg-white shadow-[0_12px_30px_rgba(32,34,38,0.08)]" />

        <div className="absolute bottom-[12.5rem] right-[3rem] h-44 w-2 rotate-[7deg] rounded-full bg-graf-200/70" />
        <div className="absolute bottom-[20.5rem] right-[0.6rem] h-2 w-28 -rotate-[5deg] rounded-full bg-graf-200/70" />
        <div className="absolute bottom-[17.7rem] right-[-0.7rem] grid grid-cols-4 gap-1.5 rounded-2xl border border-graf-200 bg-white/90 p-3 shadow-[0_15px_32px_rgba(32,34,38,0.06)]">
          {Array.from({ length: 4 }).map((_, indice) => (
            <span key={indice} className="h-14 w-2 rounded-full bg-graf-300" />
          ))}
        </div>
      </div>

      <div className="relative z-10 ml-auto mt-[5.7rem] max-w-[15rem] text-right">
        <p className="text-[0.68rem] font-semibold uppercase leading-[1.7] tracking-[0.42em] text-graf-500">
          Tecnologia
          <br />
          que move
        </p>
        <div className="mt-3 flex items-center justify-end gap-3">
          <p className="text-[2rem] font-light uppercase tracking-[0.16em] text-jb-600">Sorrisos</p>
          <span className="h-px w-9 bg-jb-500" aria-hidden />
        </div>
        <p className="mt-3 text-[0.68rem] font-semibold uppercase leading-[1.8] tracking-[0.34em] text-graf-500">
          {empresa}
        </p>
      </div>

      <div className="absolute bottom-[3.8rem] right-[1rem] z-10 max-w-[18rem]">
        <span className="mb-3 block h-px w-8 bg-jb-500" aria-hidden />
        <p
          className="text-[1.45rem] leading-[1.25] text-graf-500"
          style={{ fontFamily: '"Segoe Script", "Brush Script MT", cursive' }}
        >
          Mais que equipamentos,
          <br />
          parceria para o seu consultório.
        </p>
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
  const whatsapp = s.whatsapp.trim()
    ? whatsappHref(s.whatsapp, "Olá! Vim pelo site da JB.")
    : "";
  const desdeNumero = Number.parseInt(s.empresa_desde, 10);
  const anosExperiencia =
    Number.isFinite(desdeNumero) && desdeNumero > 1900 && desdeNumero <= ano
      ? ano - desdeNumero
      : null;

  return (
    <footer className="relative isolate mt-auto overflow-hidden border-t border-jb-100 bg-[#fffdfc] text-graf-900">
      <div className="pointer-events-none absolute -left-[23rem] -top-[20rem] size-[54rem] rounded-full border border-jb-200/60" aria-hidden />
      <div className="pointer-events-none absolute -left-[18rem] -top-[15rem] size-[44rem] rounded-full border border-jb-100" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(220,38,38,0.025),transparent)]" aria-hidden />

      <div className="container-jb relative z-10 max-w-[112rem] pt-10 sm:pt-12 lg:pt-14">
        <div className="grid gap-9 xl:grid-cols-[22rem_minmax(0,1fr)_25rem] xl:gap-10 2xl:gap-12">
          {/* Cartão de contato */}
          <section className="self-start rounded-[2rem] border border-white bg-white/80 p-6 shadow-[0_24px_70px_-44px_rgba(90,0,0,0.24)] backdrop-blur-md sm:p-7" aria-labelledby="rodape-contato">
            <div className="w-fit">
              <Logo altura={70} />
            </div>

            {s.empresa_resumo ? (
              <p className="mt-4 max-w-[17rem] text-[0.92rem] leading-[1.4] text-graf-600">
                {s.empresa_resumo}
              </p>
            ) : null}

            <div className="my-4 h-px bg-jb-100" />
            <h2 id="rodape-contato" className="sr-only">Fale com a JB</h2>

            <div className="divide-y divide-jb-50">
              {s.telefone ? (
                <LinhaContato icone={Phone} detalhe="Fale com nossa equipe">
                  <a
                    href={telHref(s.telefone)}
                    className="tabular foco-jb text-[1.05rem] font-black text-jb-700 transition-colors hover:text-jb-900"
                  >
                    {formatarTelefone(s.telefone)}
                  </a>
                </LinhaContato>
              ) : null}

              {whatsapp ? (
                <LinhaContato icone={MessageCircle} detalhe="Atendimento rápido">
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="foco-jb inline-flex flex-wrap items-center gap-2 font-semibold text-graf-700 hover:text-jb-700"
                  >
                    <span className="tabular">{formatarTelefone(s.whatsapp)}</span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[0.7rem] font-black text-emerald-700">WhatsApp</span>
                  </a>
                </LinhaContato>
              ) : s.telefone_alternativo ? (
                <LinhaContato icone={MessageCircle} detalhe="Atendimento rápido">
                  <a href={telHref(s.telefone_alternativo)} className="tabular foco-jb font-semibold text-graf-700 hover:text-jb-700">
                    {formatarTelefone(s.telefone_alternativo)}
                  </a>
                </LinhaContato>
              ) : null}

              {s.email ? (
                <LinhaContato icone={Mail} detalhe="Envie um e-mail">
                  <a href={`mailto:${s.email}`} className="foco-jb text-[0.78rem] font-medium text-graf-600 hover:text-jb-700">
                    <span className="[overflow-wrap:anywhere]">{s.email}</span>
                  </a>
                </LinhaContato>
              ) : null}

              {endereco ? (
                <LinhaContato icone={MapPin}>
                  <address className="not-italic text-[0.78rem] leading-[1.4] text-graf-600">
                    {endereco}
                    {s.endereco_cep ? <> — CEP {s.endereco_cep}</> : null}
                  </address>
                </LinhaContato>
              ) : null}

              {s.horario ? (
                <LinhaContato icone={Clock3} detalhe="Horário de atendimento">
                  <p className="text-[0.8rem] font-medium text-graf-600">{s.horario}</p>
                </LinhaContato>
              ) : null}
            </div>

            {sociais.length > 0 ? (
              <ul className="mt-3 border-t border-jb-100 pt-3">
                {sociais.map((rede) => (
                  <li key={rede.chave}>
                    <a
                      href={rede.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="foco-jb inline-flex min-h-10 items-center gap-2 text-[0.8rem] font-bold text-graf-600 transition-colors hover:text-jb-700"
                    >
                      {rede.rotulo}
                      <ArrowUpRight className="size-3.5" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          {/* Navegação e ações */}
          <div className="min-w-0 py-2 xl:pt-5">
            <nav aria-label="Rodapé" className="grid grid-cols-2 gap-x-8 gap-y-9 md:grid-cols-4 md:gap-x-6">
              <Coluna titulo="Loja" itens={RODAPE_LOJA} icone={ShoppingCart} />
              <Coluna titulo="Assistência" itens={RODAPE_ASSISTENCIA} icone={Wrench} />
              <Coluna titulo="Área da Clínica" itens={RODAPE_CLIENTE} icone={HeartPulse} />
              <Coluna titulo="Institucional" itens={RODAPE_INSTITUCIONAL} icone={Building2} />
            </nav>

            <div className="mt-10 grid gap-5 border-t border-jb-100 pt-8 md:grid-cols-2 md:gap-0">
              <div className="md:pr-7">
                <Link
                  href="/assistencia-tecnica/solicitar"
                  className="group foco-jb flex min-h-14 items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-jb-600 to-jb-500 px-6 text-sm font-black text-white shadow-[0_14px_32px_-18px_rgba(190,0,0,0.65)] transition-transform hover:-translate-y-0.5"
                >
                  <span className="flex items-center gap-3">
                    <Wrench className="size-5" aria-hidden />
                    Solicitar assistência
                  </span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
                <p className="mx-auto mt-3 max-w-[16rem] text-center text-[0.72rem] leading-relaxed text-graf-400">
                  Suporte técnico especializado e atendimento ágil.
                </p>
              </div>

              <div className="md:border-l md:border-jb-100 md:pl-7">
                <Link
                  href="/orcamento"
                  className="group foco-jb flex min-h-14 items-center justify-between gap-4 rounded-xl border-2 border-jb-500 bg-white px-6 text-sm font-black text-jb-700 transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-jb-50"
                >
                  <span className="flex items-center gap-3">
                    <FileText className="size-5" aria-hidden />
                    Pedir orçamento
                  </span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
                <p className="mx-auto mt-3 max-w-[16rem] text-center text-[0.72rem] leading-relaxed text-graf-400">
                  Equipamentos, peças e serviços com orientação da equipe.
                </p>
              </div>
            </div>
          </div>

          <VisualOdontologico empresa={s.empresa_nome} />
        </div>

        {/* Barra inferior de confiança e políticas */}
        <div className="mt-8 border-t border-graf-200/80 py-5 lg:mt-10">
          <div className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)_auto] xl:items-center xl:gap-8">
            <div>
              <p className="text-[0.76rem] text-graf-500">
                © {ano} {s.empresa_nome}
                {s.empresa_desde ? <> · Em atividade desde {s.empresa_desde}</> : null}
              </p>
              <p className="mt-1 text-[0.68rem] text-graf-400">Qualidade · Confiança · Sempre ao lado do seu consultório</p>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-graf-200">
              <li className="flex items-center gap-3 lg:px-4 first:lg:pl-0">
                <Award className="size-5 shrink-0 text-jb-600" aria-hidden />
                <p className="text-[0.72rem] leading-snug text-graf-500">
                  <strong className="block text-graf-700">{anosExperiencia ? `${anosExperiencia}+ anos` : "Experiência"}</strong>
                  de mercado
                </p>
              </li>
              <li className="flex items-center gap-3 lg:px-4">
                <Truck className="size-5 shrink-0 text-jb-600" aria-hidden />
                <p className="text-[0.72rem] leading-snug text-graf-500">
                  <strong className="block text-graf-700">Atendimento</strong>
                  {s.endereco_cidade ? `em ${s.endereco_cidade} e região` : "especializado"}
                </p>
              </li>
              <li className="flex items-center gap-3 lg:px-4">
                <ShieldCheck className="size-5 shrink-0 text-jb-600" aria-hidden />
                <p className="text-[0.72rem] leading-snug text-graf-500">
                  <strong className="block text-graf-700">Equipamentos</strong>
                  com garantia e procedência
                </p>
              </li>
              <li className="flex items-center gap-3 lg:px-4">
                <Headphones className="size-5 shrink-0 text-jb-600" aria-hidden />
                <p className="text-[0.72rem] leading-snug text-graf-500">
                  <strong className="block text-graf-700">Suporte técnico</strong>
                  especializado
                </p>
              </li>
            </ul>

            <ul className="flex flex-wrap gap-x-4 gap-y-1 xl:justify-end">
              {RODAPE_POLITICAS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="foco-jb inline-flex min-h-9 items-center text-[0.68rem] text-graf-400 transition-colors hover:text-jb-700 pointer-coarse:min-h-11"
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
