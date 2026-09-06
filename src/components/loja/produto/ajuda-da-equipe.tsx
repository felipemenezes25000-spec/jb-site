import Link from "next/link";
import { Clock, Mail, MessageCircle, Phone } from "lucide-react";

import { telHref, whatsappHref } from "@/lib/format";

/* ============================================================================
   Falar com a equipe

   Equipamento caro raramente é comprado sem uma conversa. Este bloco fecha a
   coluna de compra com os canais reais da JB — nada de formulário genérico de
   "fale conosco" e nada de canal que não esteja configurado.

   Sem moldura, pelo mesmo motivo das condições de compra: a coluna já tem uma
   caixa, a de comprar. O resto corre em fio fino.
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

  const linha =
    "foco-jb flex min-h-11 items-center gap-3 py-3 text-[0.9375rem] font-semibold text-graf-800 transition-colors duration-150 hover:text-jb-700";

  return (
    <section aria-labelledby="falar-com-a-equipe">
      <h2
        id="falar-com-a-equipe"
        className="text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-graf-500"
      >
        Falar com a equipe
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-graf-600">
        Dúvida de medida, instalação, voltagem ou prazo: a mensagem já sai com este
        equipamento identificado.
      </p>

      <ul className="mt-3 divide-y divide-graf-200 border-t border-graf-200">
        {linkWhatsapp ? (
          <li>
            <a
              href={linkWhatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className={linha}
            >
              <MessageCircle className="size-[18px] shrink-0 text-ok-700" aria-hidden />
              WhatsApp {whatsapp}
            </a>
          </li>
        ) : null}

        {linkTelefone ? (
          <li>
            <a href={linkTelefone} className={linha}>
              <Phone className="size-[18px] shrink-0 text-graf-500" aria-hidden />
              {telefone}
            </a>
          </li>
        ) : null}

        {email ? (
          <li>
            <Link href="/contato" className={linha}>
              <Mail className="size-[18px] shrink-0 text-graf-500" aria-hidden />
              Enviar uma pergunta por escrito
            </Link>
          </li>
        ) : null}
      </ul>

      {horario ? (
        <p className="mt-3 flex items-start gap-2 text-[0.8125rem] leading-relaxed text-graf-500">
          <Clock className="mt-0.5 size-3.5 shrink-0 text-graf-400" aria-hidden />
          {horario}
        </p>
      ) : null}
    </section>
  );
}
