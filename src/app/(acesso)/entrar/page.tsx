import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";

import { FormularioEntrar } from "@/components/conta/formulario-entrar";
import { MolduraAutenticacao } from "@/components/conta/moldura-autenticacao";
import { LinkBotao } from "@/components/ui/button";
import { sessaoCliente } from "@/lib/auth-cliente";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse a Área da Clínica para acompanhar pedidos, chamados e manutenções.",
  robots: { index: false, follow: false },
};

type Busca = Promise<{ [chave: string]: string | string[] | undefined }>;

function texto(valor: string | string[] | undefined) {
  return typeof valor === "string" ? valor : "";
}

/** Caminho interno para voltar depois do login. O servidor revalida na ação. */
function destinoDaUrl(bruto: string) {
  if (!bruto.startsWith("/") || bruto.startsWith("//")) return "";
  return bruto;
}

export default async function EntrarPage({ searchParams }: { searchParams: Busca }) {
  const [sessao, params] = await Promise.all([sessaoCliente(), searchParams]);
  if (sessao) redirect("/minha-jb");

  // exigirCliente manda `voltar`; links internos podem usar `destino`
  const destino = destinoDaUrl(texto(params.destino) || texto(params.voltar));
  const emailInicial = texto(params.email);

  return (
    <MolduraAutenticacao
      etapa="Área da Clínica"
      titulo="Entrar na sua conta"
      subtitulo="Acompanhe pedidos, chamados de assistência, orçamentos e o histórico dos seus equipamentos."
      aviso={
        destino ? (
          <p className="flex items-start gap-2.5 rounded-lg border border-info-500/25 bg-info-50 px-4 py-3 text-sm leading-relaxed text-graf-700">
            <LockKeyhole className="mt-0.5 size-4 shrink-0 text-info-700" aria-hidden />
            <span>
              Esta página é da Área da Clínica. Entre com a sua conta para continuar de onde parou.
            </span>
          </p>
        ) : null
      }
      rodape={
        /* O caminho para o cadastro precisa ser visível sem leitura: quem
           chega aqui sem conta não pode ter de caçar um link no meio da
           frase. Por isso vira botão, e não texto sublinhado. */
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-graf-900">Ainda não tem conta?</p>
            <p className="mt-1">Criar leva menos de um minuto — e dá para comprar sem conta.</p>
          </div>
          <LinkBotao
            href={destino ? `/cadastro?destino=${encodeURIComponent(destino)}` : "/cadastro"}
            variante="secundario"
            className="sm:shrink-0"
          >
            Criar minha conta
          </LinkBotao>
        </div>
      }
    >
      <FormularioEntrar destino={destino} emailInicial={emailInicial} />
    </MolduraAutenticacao>
  );
}
