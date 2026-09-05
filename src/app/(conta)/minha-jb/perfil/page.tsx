import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KeyRound, MessageCircle, Phone, ShieldCheck } from "lucide-react";

import {
  FormularioPerfil,
  FormularioSenha,
} from "@/components/conta/mj-formulario-perfil";
import { Topo } from "@/components/conta/mj-topo";
import { Cartao, CabecalhoCartao } from "@/components/ui/data";
import { exigirCliente } from "@/lib/auth-cliente";
import { formatarDataExtensa, formatarTelefone, telHref, whatsappHref } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Meus dados",
  description: "Dados cadastrais, senha e preferências de contato.",
  robots: { index: false, follow: false },
};

export default async function PerfilPage() {
  const sessao = await exigirCliente("/minha-jb/perfil");

  const [cliente, s] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: sessao.id },
      select: {
        name: true,
        email: true,
        phone: true,
        personType: true,
        document: true,
        companyName: true,
        tradeName: true,
        stateRegistry: true,
        marketingOptInAt: true,
        createdAt: true,
        lastLoginAt: true,
      },
    }),
    getSettings(),
  ]);

  if (!cliente) notFound();

  const zap = whatsappHref(
    s.whatsapp,
    `Olá! Sou cliente da JB e preciso atualizar o e-mail de acesso da minha conta (${cliente.email}).`,
  );

  return (
    <div>
      <Topo
        titulo="Meus dados"
        descricao={`Cliente desde ${formatarDataExtensa(cliente.createdAt)}.`}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="space-y-6">
          <Cartao>
            <CabecalhoCartao
              titulo="Dados cadastrais"
              descricao="É o que sai na nota fiscal e o que a equipe usa para falar com você."
            />
            <div className="p-5">
              <FormularioPerfil
                dados={{
                  nome: cliente.name,
                  email: cliente.email,
                  telefone: cliente.phone,
                  tipoPessoa: cliente.personType,
                  documento: cliente.document,
                  razaoSocial: cliente.companyName,
                  nomeFantasia: cliente.tradeName,
                  inscricaoEstadual: cliente.stateRegistry,
                  aceitaNovidades: cliente.marketingOptInAt !== null,
                }}
              />
            </div>
          </Cartao>

          <Cartao>
            <CabecalhoCartao
              titulo="Trocar senha"
              descricao="Pedimos a senha atual para garantir que é você."
            />
            <div className="p-5">
              <FormularioSenha />
            </div>
          </Cartao>
        </div>

        <div className="space-y-6">
          <Cartao>
            <CabecalhoCartao titulo="Segurança da conta" />
            <div className="space-y-3 p-5 text-sm">
              <p className="flex items-start gap-2.5 leading-relaxed text-graf-600">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ok-700" aria-hidden />
                <span>
                  Sua senha é guardada cifrada. Ninguém da JB consegue lê-la — nem para
                  ajudar por telefone.
                </span>
              </p>
              <p className="flex items-start gap-2.5 leading-relaxed text-graf-600">
                <KeyRound className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
                <span>
                  {cliente.lastLoginAt
                    ? `Último acesso registrado em ${formatarDataExtensa(cliente.lastLoginAt)}.`
                    : "Este é o seu primeiro acesso registrado."}
                </span>
              </p>
            </div>
          </Cartao>

          <Cartao>
            <CabecalhoCartao titulo="Precisa trocar o e-mail?" />
            <div className="space-y-2.5 p-5 text-sm">
              <p className="leading-relaxed text-graf-600">
                A troca do e-mail de acesso é feita pela equipe, com confirmação — assim
                ninguém perde o acesso à conta por engano.
              </p>
              {s.telefone ? (
                <a
                  href={telHref(s.telefone)}
                  className="flex min-h-11 items-center gap-2 font-semibold text-graf-900 hover:text-jb-700"
                >
                  <Phone className="size-4 shrink-0 text-graf-500" aria-hidden />
                  {formatarTelefone(s.telefone)}
                </a>
              ) : null}
              {zap ? (
                <a
                  href={zap}
                  className="flex min-h-11 items-center gap-2 font-semibold text-graf-900 hover:text-jb-700"
                >
                  <MessageCircle className="size-4 shrink-0 text-graf-500" aria-hidden />
                  WhatsApp {formatarTelefone(s.whatsapp)}
                </a>
              ) : null}
              <p className="text-xs text-graf-500">{s.horario}</p>
            </div>
          </Cartao>
        </div>
      </div>
    </div>
  );
}
