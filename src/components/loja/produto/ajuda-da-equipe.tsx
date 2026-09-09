import Link from "next/link";
import { ArrowUpRight, Clock, Mail, MessageCircle, Phone } from "lucide-react";

import { telHref, whatsappHref } from "@/lib/format";

/* ============================================================================
   Falar com a equipe

   Equipamento caro é compra consultiva. O atendimento precisa parecer parte da
   experiência de produto, e não um rodapé de contatos: WhatsApp vira ação
   principal, telefone uma ação direta e a pergunta por escrito fica como
   alternativa discreta.
   ============================================================================ */

export function AjudaDaEquipe({
  nomeDoProduto,
  sku,
  telefone,
  whatsapp,
  email,
  horario,
}: {
  nomeDoProduto: string;
  sku: string;
  telefone: string;
  whatsapp: string;
  email: string;
  horario: string;
}) {
  const mensagem = `Olá! Tenho uma dúvida sobre o equipamento ${nomeDoProduto} (SKU ${sku}).`;
  const linkWhatsapp = whatsapp ? whatsappHref(whatsapp, mensagem) : "";
  const linkTelefone = telefone ? telHref(telefone) : "";

  if (!linkWhatsapp && !linkTelefone && !email) return null;

  return (
    <section
      aria-labelledby="falar-com-a-equipe"
      className="relative overflow-hidden rounded-2xl border border-jb-100 bg-[linear-gradient(145deg,#ffffff_0%,#fffafa_62%,#fff4f4_100%)] text-graf-950 shadow-[0_18px_42px_-34px_rgba(112,10,17,0.32)]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-[3px] rounded-full bg-gradient-to-r from-transparent via-jb-500 to-transparent"
      />

      <div className="p-5 sm:p-6">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-jb-700">
          Atendimento especializado
        </p>
        <h2
          id="falar-com-a-equipe"
          className="mt-1.5 text-lg font-bold tracking-[-0.015em] text-graf-950"
        >
          Fale com quem entende do equipamento
        </h2>
        <p className="mt-2 text-sm leading-6 text-graf-600">
          Medidas, instalação, voltagem, prazo ou compatibilidade da clínica — a conversa já
          começa com este produto identificado.
        </p>

        <div className="mt-5 space-y-2.5">
          {linkWhatsapp ? (
            <a
              href={linkWhatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="foco-jb group flex min-h-12 items-center justify-between gap-3 rounded-xl bg-jb-600 px-4 text-[0.9375rem] font-bold text-white shadow-[0_14px_28px_-20px_rgba(154,8,18,0.62)] transition-[transform,background-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:bg-jb-700 hover:shadow-[0_18px_32px_-20px_rgba(154,8,18,0.68)]"
            >
              <span className="flex items-center gap-2.5">
                <MessageCircle className="size-[18px] shrink-0 text-white" aria-hidden />
                Chamar no WhatsApp
              </span>
              <ArrowUpRight
                className="size-4 text-white/80 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            </a>
          ) : null}

          {linkTelefone ? (
            <a
              href={linkTelefone}
              className="foco-jb flex min-h-12 items-center gap-2.5 rounded-xl border border-jb-100 bg-white px-4 text-[0.9375rem] font-semibold text-graf-900 shadow-[0_10px_24px_-22px_rgba(92,8,14,0.28)] transition-[background-color,border-color,transform] hover:-translate-y-0.5 hover:border-jb-200 hover:bg-jb-50"
            >
              <Phone className="size-[18px] shrink-0 text-jb-600" aria-hidden />
              {telefone}
            </a>
          ) : null}
        </div>

        {email ? (
          <Link
            href="/contato"
            className="foco-jb mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-graf-700 transition-colors hover:text-jb-700"
          >
            <Mail className="size-4 text-jb-600" aria-hidden />
            Prefiro enviar uma pergunta por escrito
          </Link>
        ) : null}
      </div>

      {horario ? (
        <div className="flex items-start gap-2 border-t border-jb-100 bg-jb-50/60 px-5 py-3.5 text-[0.75rem] leading-5 text-graf-600 sm:px-6">
          <Clock className="mt-0.5 size-3.5 shrink-0 text-jb-600" aria-hidden />
          {horario}
        </div>
      ) : null}
    </section>
  );
}
