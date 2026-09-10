import Link from "next/link";
import { ArrowUpRight, Clock, Mail, MessageCircle, Phone } from "lucide-react";

import { telHref, whatsappHref } from "@/lib/format";

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
  const mensagem = `Olá! Tenho uma dúvida sobre o produto ${nomeDoProduto} (SKU ${sku}).`;
  const linkWhatsapp = whatsapp ? whatsappHref(whatsapp, mensagem) : "";
  const linkTelefone = telefone ? telHref(telefone) : "";

  if (!linkWhatsapp && !linkTelefone && !email) return null;

  return (
    <section aria-labelledby="falar-com-a-equipe" className="border-y border-graf-200 py-3.5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
        <div className="min-w-0">
          <h3 id="falar-com-a-equipe" className="text-sm font-extrabold text-graf-950">
            Precisa de ajuda para decidir?
          </h3>
          <p className="mt-0.5 max-w-xl text-xs leading-5 text-graf-500">
            Fale com a equipe JB já com este produto identificado.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 lg:shrink-0 lg:justify-end">
          {linkWhatsapp ? (
            <a
              href={linkWhatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="foco-jb group inline-flex min-h-10 items-center gap-2 rounded-lg bg-jb-600 px-3.5 text-xs font-bold text-white transition-colors hover:bg-jb-700"
            >
              <MessageCircle className="size-4 shrink-0" aria-hidden />
              WhatsApp
              <ArrowUpRight className="size-3.5 text-white/80" aria-hidden />
            </a>
          ) : null}

          {linkTelefone ? (
            <a
              href={linkTelefone}
              className="foco-jb inline-flex min-h-10 items-center gap-2 rounded-lg border border-graf-250 bg-white px-3.5 text-xs font-semibold text-graf-800 hover:bg-graf-50"
            >
              <Phone className="size-4 shrink-0 text-jb-600" aria-hidden />
              {telefone}
            </a>
          ) : null}

          {email ? (
            <Link
              href="/contato"
              className="foco-jb inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-graf-700 hover:bg-graf-50 hover:text-jb-700"
            >
              <Mail className="size-4 text-jb-600" aria-hidden />
              Escrever
            </Link>
          ) : null}
        </div>
      </div>

      {horario ? (
        <p className="mt-3 flex items-start gap-2 border-t border-graf-150 pt-2.5 text-[0.6875rem] leading-4 text-graf-500">
          <Clock className="mt-px size-3.5 shrink-0" aria-hidden />
          {horario}
        </p>
      ) : null}
    </section>
  );
}
