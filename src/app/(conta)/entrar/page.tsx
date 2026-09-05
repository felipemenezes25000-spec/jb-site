import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";

import { FormularioEntrar } from "@/components/conta/formulario-entrar";
import { MolduraAutenticacao } from "@/components/conta/moldura-autenticacao";
import { sessaoCliente } from "@/lib/auth-cliente";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse a Minha JB para acompanhar pedidos, chamados e manutenções.",
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
      titulo="Entrar na Minha JB"
      subtitulo="Acompanhe pedidos, chamados de assistência, orçamentos e o histórico dos seus equipamentos."
      aviso={
        destino ? (
          <p className="flex items-start gap-2.5 rounded-lg border border-info-500/25 bg-info-50 px-4 py-3 text-sm leading-relaxed text-graf-700">
            <LockKeyhole className="mt-0.5 size-4 shrink-0 text-info-700" aria-hidden />
            <span>Esta página é da área do cliente. Entre para continuar de onde parou.</span>
          </p>
        ) : null
      }
      rodape={
        <p>
          Ainda não tem conta?{" "}
          <Link
            href={
              destino ? `/cadastro?destino=${encodeURIComponent(destino)}` : "/cadastro"
            }
            className="font-semibold text-jb-700 underline-offset-4 hover:underline"
          >
            Criar minha conta
          </Link>{" "}
          — leva menos de um minuto e não é preciso ter conta para comprar.
        </p>
      }
    >
      <FormularioEntrar destino={destino} emailInicial={emailInicial} />
    </MolduraAutenticacao>
  );
}
