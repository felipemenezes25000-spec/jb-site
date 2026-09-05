import Link from "next/link";
import { CheckCircle2, ClipboardList, MessageCircle } from "lucide-react";

import { sessaoCliente } from "@/lib/auth-cliente";
import { getSettings } from "@/lib/settings";
import { whatsappHref } from "@/lib/format";

type Props = { searchParams: Promise<{ protocolo?: string }> };

export default async function SucessoAssistenciaPage({ searchParams }: Props) {
  const [{ protocolo }, cliente, s] = await Promise.all([searchParams, sessaoCliente(), getSettings()]);

  return (
    <div className="bg-graf-50/70">
      <div className="container-jb flex min-h-[650px] items-center justify-center py-14">
        <section className="w-full max-w-2xl rounded-[2rem] border border-graf-200 bg-white p-7 text-center shadow-pop sm:p-10 lg:p-12">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-ok-50 text-ok-700">
            <CheckCircle2 className="size-8" aria-hidden />
          </span>
          <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.16em] text-jb-600">Solicitação recebida</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-graf-950">Seu chamado já está com a JB.</h1>
          {protocolo ? <p className="mt-4 label-mono text-base font-bold text-graf-700">Protocolo {protocolo}</p> : null}
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-graf-600">A solicitação entrou na fila de triagem. A equipe pode entrar em contato para complementar informações antes de apresentar o próximo passo.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {cliente ? (
              <Link href="/minha-jb/assistencia" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-jb-600 px-6 text-sm font-extrabold text-white hover:bg-jb-500">
                <ClipboardList className="size-4" aria-hidden /> Acompanhar na Área da Clínica
              </Link>
            ) : (
              <Link href="/cadastro" className="inline-flex h-12 items-center justify-center rounded-xl bg-jb-600 px-6 text-sm font-extrabold text-white hover:bg-jb-500">Criar Área da Clínica</Link>
            )}
            {s.whatsapp ? (
              <a href={whatsappHref(s.whatsapp, protocolo ? `Olá! Abri o chamado ${protocolo} e gostaria de falar com a JB.` : "Olá! Acabei de abrir um chamado de assistência no site.")} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-graf-300 bg-white px-6 text-sm font-extrabold text-graf-800 hover:bg-graf-50">
                <MessageCircle className="size-4" aria-hidden /> WhatsApp
              </a>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
