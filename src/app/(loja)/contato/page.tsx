import type { Metadata } from "next";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { FormContato } from "@/components/cliente/form-contato";
import { enderecoCompleto, getSettings } from "@/lib/settings";
import { telHref, whatsappHref } from "@/lib/format";

export const metadata: Metadata = {
  title: "Contato",
  description: "Fale com a JB Soluções Odontológicas sobre equipamentos, assistência técnica, pedidos e pós-venda.",
};

export default async function ContatoPage() {
  const s = await getSettings();

  return (
    <>
      <section className="relative overflow-hidden border-b border-graf-200 bg-graf-50/70">
        <div className="field-orbit pointer-events-none absolute inset-0 opacity-20" aria-hidden />
        <div className="container-jb relative py-14 lg:py-20">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-jb-600">Contato</p>
          <h1 className="mt-4 max-w-4xl text-display leading-[1.03]">Fale direto com a JB.</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-graf-600 lg:text-lg">
            Equipamentos, assistência, pedidos ou pós-venda. Escolha um canal rápido ou envie sua mensagem pelo formulário.
          </p>
        </div>
      </section>

      <section className="container-jb section-jb">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start lg:gap-12 xl:gap-16">
          <div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {s.whatsapp ? (
                <a
                  href={whatsappHref(s.whatsapp, "Olá! Vim pelo site da JB e gostaria de falar com a equipe.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover-lift rounded-2xl border border-graf-200 bg-white p-6"
                >
                  <MessageCircle className="size-5 text-jb-600" aria-hidden />
                  <p className="mt-4 text-base font-extrabold text-graf-950">WhatsApp</p>
                  <p className="mt-1 text-sm text-graf-600">{s.whatsapp}</p>
                  <p className="mt-3 text-xs font-bold text-jb-700">Iniciar conversa →</p>
                </a>
              ) : null}

              {s.telefone ? (
                <a href={telHref(s.telefone)} className="hover-lift rounded-2xl border border-graf-200 bg-white p-6">
                  <Phone className="size-5 text-jb-600" aria-hidden />
                  <p className="mt-4 text-base font-extrabold text-graf-950">Telefone</p>
                  <p className="mt-1 text-sm text-graf-600">{s.telefone}</p>
                  <p className="mt-3 text-xs font-bold text-jb-700">Ligar para a JB →</p>
                </a>
              ) : null}

              <a href={`mailto:${s.email}`} className="hover-lift rounded-2xl border border-graf-200 bg-white p-6">
                <Mail className="size-5 text-jb-600" aria-hidden />
                <p className="mt-4 text-base font-extrabold text-graf-950">E-mail</p>
                <p className="mt-1 break-all text-sm text-graf-600">{s.email}</p>
                <p className="mt-3 text-xs font-bold text-jb-700">Enviar e-mail →</p>
              </a>
            </div>

            <div className="mt-5 rounded-2xl bg-graf-950 p-6 text-white">
              <div className="flex gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-jb-400" aria-hidden />
                <div>
                  <p className="text-sm font-extrabold text-white">Endereço</p>
                  <p className="mt-2 text-sm leading-6 text-graf-400">{enderecoCompleto(s)}</p>
                </div>
              </div>
              <div className="mt-5 flex gap-3 border-t border-white/10 pt-5">
                <Clock className="mt-0.5 size-5 shrink-0 text-jb-400" aria-hidden />
                <div>
                  <p className="text-sm font-extrabold text-white">Atendimento</p>
                  <p className="mt-1 text-sm text-graf-400">{s.horario}</p>
                </div>
              </div>
            </div>
          </div>

          <FormContato />
        </div>
      </section>
    </>
  );
}
