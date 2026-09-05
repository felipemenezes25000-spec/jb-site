import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FormularioCadastro } from "@/components/conta/formulario-cadastro";
import { MolduraAutenticacao } from "@/components/conta/moldura-autenticacao";
import { sessaoCliente } from "@/lib/auth-cliente";

export const metadata: Metadata = {
  title: "Criar conta",
  description: "Crie sua conta na JB para acompanhar pedidos, garantias e assistência técnica.",
  robots: { index: false, follow: false },
};

type Busca = Promise<{ [chave: string]: string | string[] | undefined }>;

function texto(valor: string | string[] | undefined) {
  return typeof valor === "string" ? valor : "";
}

function destinoDaUrl(bruto: string) {
  if (!bruto.startsWith("/") || bruto.startsWith("//")) return "";
  return bruto;
}

export default async function CadastroPage({ searchParams }: { searchParams: Busca }) {
  const [sessao, params] = await Promise.all([sessaoCliente(), searchParams]);
  if (sessao) redirect("/minha-jb");

  const destino = destinoDaUrl(texto(params.destino) || texto(params.voltar));
  const emailInicial = texto(params.email);

  return (
    <MolduraAutenticacao
      etapa="Área da Clínica"
      titulo="Criar sua conta"
      subtitulo="Uma conta guarda seus pedidos, as garantias dos equipamentos e o histórico de cada chamado de assistência."
      rodape={
        <p>
          Já tem cadastro?{" "}
          <Link
            href={destino ? `/entrar?destino=${encodeURIComponent(destino)}` : "/entrar"}
            className="font-semibold text-jb-700 underline-offset-4 hover:underline"
          >
            Entrar na sua conta
          </Link>
        </p>
      }
    >
      <FormularioCadastro destino={destino} emailInicial={emailInicial} />
    </MolduraAutenticacao>
  );
}
