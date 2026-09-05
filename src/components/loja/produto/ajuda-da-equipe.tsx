import Link from "next/link";
import { Clock, Mail, MessageCircle, Phone } from "lucide-react";

import { telHref, whatsappHref } from "@/lib/format";

/* ============================================================================
   Falar com a equipe

   Equipamento caro raramente é comprado sem uma conversa. Este bloco fica logo
   abaixo da caixa de compra com os canais reais da JB — nada de formulário
   genérico de "fale conosco" e nada de canal que não esteja configurado.
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
    <div className="rounded-xl border border-graf-200 bg-graf-50 p-5 sm:p-6">
      <h2 className="text-base font-bold text-graf-950">
        Quer conferir alguma coisa antes de comprar?
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-graf-600">
        A equipe responde sobre medida, instalação, voltagem e prazo. A mensagem já sai
        com este equipamento identificado.
      </p>

      <ul className="mt-4 space-y-2">
        {linkWhatsapp ? (
          <li>
            <a
              href={linkWhatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="foco-jb flex min-h-11 items-center gap-3 rounded-lg border border-graf-200 bg-white px-4 py-2.5 text-sm font-semibold text-graf-800 transition-colors duration-150 hover:border-graf-400 hover:text-jb-700"
            >
              <MessageCircle className="size-4 shrink-0 text-ok-700" aria-hidden />
              WhatsApp {whatsapp}
            </a>
          </li>
        ) : null}

        {linkTelefone ? (
          <li>
            <a
              href={linkTelefone}
              className="foco-jb flex min-h-11 items-center gap-3 rounded-lg border border-graf-200 bg-white px-4 py-2.5 text-sm font-semibold text-graf-800 transition-colors duration-150 hover:border-graf-400 hover:text-jb-700"
            >
              <Phone className="size-4 shrink-0 text-graf-500" aria-hidden />
              {telefone}
            </a>
          </li>
        ) : null}

        {email ? (
          <li>
            <Link
              href="/contato"
              className="foco-jb flex min-h-11 items-center gap-3 rounded-lg border border-graf-200 bg-white px-4 py-2.5 text-sm font-semibold text-graf-800 transition-colors duration-150 hover:border-graf-400 hover:text-jb-700"
            >
              <Mail className="size-4 shrink-0 text-graf-500" aria-hidden />
              Enviar uma pergunta por escrito
            </Link>
          </li>
        ) : null}
      </ul>

      {horario ? (
        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-graf-500">
          <Clock className="mt-px size-3.5 shrink-0 text-graf-400" aria-hidden />
          {horario}
        </p>
      ) : null}
    </div>
  );
}
