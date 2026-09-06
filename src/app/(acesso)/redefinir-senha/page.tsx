import type { Metadata } from "next";
import Link from "next/link";
import { Link2Off } from "lucide-react";

import { FormularioRedefinir } from "@/components/conta/formulario-redefinir";
import { MolduraAutenticacao } from "@/components/conta/moldura-autenticacao";
import { LinkBotao } from "@/components/ui/button";
import { Vazio } from "@/components/ui/data";

export const metadata: Metadata = {
  title: "Redefinir senha",
  description: "Cadastre uma nova senha para sua conta na JB.",
  robots: { index: false, follow: false },
  // o endereço desta página carrega o código do e-mail: nenhum link clicado
  // aqui pode levar esse endereço junto no cabeçalho de origem
  referrer: "no-referrer",
};

type Busca = Promise<{ [chave: string]: string | string[] | undefined }>;

export default async function RedefinirSenhaPage({ searchParams }: { searchParams: Busca }) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token.trim() : "";
  /* O servidor revalida com `destinoSeguro`; aqui basta repassar. */
  const voltar = typeof params.voltar === "string" ? params.voltar : undefined;

  if (!token) {
    return (
      <MolduraAutenticacao
        etapa="Área da Clínica"
        titulo="Link de redefinição incompleto"
        subtitulo="O endereço aberto não traz o código de verificação. Isso costuma acontecer quando o link do e-mail é copiado pela metade."
        rodape={
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0">Já lembrou a senha?</p>
            <LinkBotao href="/entrar" variante="secundario" className="sm:shrink-0">
              Voltar para entrar
            </LinkBotao>
          </div>
        }
      >
        <Vazio
          icone={Link2Off}
          titulo="Não conseguimos identificar o pedido"
          descricao="Peça um novo link de redefinição. Ele serve uma vez só e vale por 1 hora."
          acao={<LinkBotao href="/recuperar-senha">Pedir um novo link</LinkBotao>}
        />
      </MolduraAutenticacao>
    );
  }

  return (
    <MolduraAutenticacao
      etapa="Área da Clínica"
      titulo="Cadastrar nova senha"
      subtitulo="Escolha uma senha nova. Assim que ela for salva, você já entra na Área da Clínica e o link deixa de valer."
      rodape={
        <p>
          Não foi você que pediu?{" "}
          <Link
            href="/contato"
            className="font-semibold text-jb-700 underline-offset-4 hover:underline"
          >
            Avise a equipe da JB
          </Link>{" "}
          — sua senha atual continua valendo enquanto o link não for usado.
        </p>
      }
    >
      <FormularioRedefinir token={token} destino={voltar} />
    </MolduraAutenticacao>
  );
}
