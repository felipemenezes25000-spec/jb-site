import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FormularioCadastro } from "@/components/conta/formulario-cadastro";
import { MolduraAutenticacao } from "@/components/conta/moldura-autenticacao";
import { LinkBotao } from "@/components/ui/button";
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
      // são oito campos em três blocos: a coluna larga deixa o par de senhas
      // caber lado a lado no tablet, em vez de virar uma fila sem fim
      largura="ampla"
      titulo="Criar sua conta"
      subtitulo="Uma conta guarda seus pedidos, as garantias dos equipamentos e o histórico de cada chamado de assistência."
      rodape={
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-graf-900">Já tem cadastro na JB?</p>
            <p className="mt-1">Use o mesmo e-mail e senha de sempre.</p>
          </div>
          <LinkBotao
            href={destino ? `/entrar?destino=${encodeURIComponent(destino)}` : "/entrar"}
            variante="secundario"
            className="sm:shrink-0"
          >
            Entrar na minha conta
          </LinkBotao>
        </div>
      }
    >
      <FormularioCadastro destino={destino} emailInicial={emailInicial} />
    </MolduraAutenticacao>
  );
}
