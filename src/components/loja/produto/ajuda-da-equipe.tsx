import Link from "next/link";
import { ArrowUpRight, Clock, Mail, MessageCircle, Phone } from "lucide-react";

import { telHref, whatsappHref } from "@/lib/format";

/* ============================================================================
   Falar com a equipe

   Atendimento consultivo continua importante, mas esta área não precisa virar
   um segundo hero dentro de "Entrega, garantia e suporte". O bloco funciona
   como faixa compacta: contexto à esquerda, ações à direita e horário discreto.
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
      className="overflow-hidden rounded-xl border border-jb-100 bg-[linear-gradient(145deg,#ffffff_0%,#fff8f8_100%)]"
    >
      <div className="p-4 sm:p-5 lg:flex lg:items-center lg:justify-between lg:gap-6">
        <div className="min-w-0 lg:max-w-xl">
          <p className="text-[0.625rem] font-bold uppercase tracking-[0.09em] text-jb-700">
            Atendimento especializado
          </p>
          <h3
            id="falar-com-a-equipe"
            className="mt-0.5 text-[0.9375rem] font-extrabold tracking-[-0.01em] text-graf-950"
          >
            Ficou alguma dúvida técnica?
          </h3>
          <p className="mt-1 text-[0.8125rem] leading-5 text-graf-600">
            A conversa já começa com este equipamento identificado, incluindo SKU e contexto da compra.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 lg:mt-0 lg:shrink-0 lg:justify-end">
          {linkWhatsapp ? (
            <a
              href={linkWhatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="foco-jb group inline-flex min-h-11 items-center gap-2 rounded-lg bg-jb-600 px-3.5 text-[0.8125rem] font-bold text-white transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-jb-700"
            >
              <MessageCircle className="size-4 shrink-0" aria-hidden />
              WhatsApp
              <ArrowUpRight
                className="size-3.5 text-white/80 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            </a>
          ) : null}

          {linkTelefone ? (
            <a
              href={linkTelefone}
              className="foco-jb inline-flex min-h-11 items-center gap-2 rounded-lg border border-jb-100 bg-white px-3.5 text-[0.8125rem] font-semibold text-graf-900 transition-colors hover:border-jb-200 hover:bg-jb-50"
            >
              <Phone className="size-4 shrink-0 text-jb-600" aria-hidden />
              {telefone}
            </a>
          ) : null}

          {email ? (
            <Link
              href="/contato"
              className="foco-jb inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-[0.8125rem] font-semibold text-graf-700 transition-colors hover:bg-white hover:text-jb-700"
            >
              <Mail className="size-4 text-jb-600" aria-hidden />
              Escrever
            </Link>
          ) : null}
        </div>
      </div>

      {horario ? (
        <div className="flex items-start gap-2 border-t border-jb-100 bg-white/65 px-4 py-2.5 text-[0.6875rem] leading-4 text-graf-500 sm:px-5">
          <Clock className="mt-px size-3.5 shrink-0 text-jb-600" aria-hidden />
          {horario}
        </div>
      ) : null}
    </section>
  );
}
