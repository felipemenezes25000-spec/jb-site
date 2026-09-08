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
      className="overflow-hidden rounded-2xl border border-graf-200 bg-graf-950 text-white shadow-[0_10px_30px_rgba(15,23,42,0.12)]"
    >
      <div className="p-5 sm:p-6">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-jb-300">
          Atendimento especializado
        </p>
        <h2 id="falar-com-a-equipe" className="mt-1.5 text-lg font-bold tracking-[-0.015em] text-white">
          Fale com quem entende do equipamento
        </h2>
        <p className="mt-2 text-sm leading-6 text-white/65">
          Medidas, instalação, voltagem, prazo ou compatibilidade da clínica — a conversa já
          começa com este produto identificado.
        </p>

        <div className="mt-5 space-y-2.5">
          {linkWhatsapp ? (
            <a
              href={linkWhatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="foco-jb group flex min-h-12 items-center justify-between gap-3 rounded-xl bg-white px-4 text-[0.9375rem] font-bold text-graf-950 transition-transform duration-150 hover:-translate-y-0.5"
            >
              <span className="flex items-center gap-2.5">
                <MessageCircle className="size-[18px] shrink-0 text-ok-700" aria-hidden />
                Chamar no WhatsApp
              </span>
              <ArrowUpRight className="size-4 text-graf-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
            </a>
          ) : null}

          {linkTelefone ? (
            <a
              href={linkTelefone}
              className="foco-jb flex min-h-12 items-center gap-2.5 rounded-xl border border-white/15 bg-white/7 px-4 text-[0.9375rem] font-semibold text-white transition-colors hover:bg-white/12"
            >
              <Phone className="size-[18px] shrink-0 text-white/70" aria-hidden />
              {telefone}
            </a>
          ) : null}
        </div>

        {email ? (
          <Link
            href="/contato"
            className="foco-jb mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-white/70 transition-colors hover:text-white"
          >
            <Mail className="size-4" aria-hidden />
            Prefiro enviar uma pergunta por escrito
          </Link>
        ) : null}
      </div>

      {horario ? (
        <div className="flex items-start gap-2 border-t border-white/10 bg-white/5 px-5 py-3.5 text-[0.75rem] leading-5 text-white/55 sm:px-6">
          <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {horario}
        </div>
      ) : null}
    </section>
  );
}
