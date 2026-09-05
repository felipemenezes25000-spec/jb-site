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
};

type Busca = Promise<{ [chave: string]: string | string[] | undefined }>;

export default async function RedefinirSenhaPage({ searchParams }: { searchParams: Busca }) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token.trim() : "";

  if (!token) {
    return (
      <MolduraAutenticacao
        titulo="Link de redefinição incompleto"
        subtitulo="O endereço aberto não traz o código de verificação. Isso costuma acontecer quando o link do e-mail é copiado pela metade."
      >
        <Vazio
          icone={Link2Off}
          titulo="Não conseguimos identificar o pedido"
          descricao="Peça um novo link de redefinição: ele chega em instantes e vale por 1 hora."
          acao={<LinkBotao href="/recuperar-senha">Pedir um novo link</LinkBotao>}
        />
      </MolduraAutenticacao>
    );
  }

  return (
    <MolduraAutenticacao
      titulo="Cadastrar nova senha"
      subtitulo="Escolha uma senha nova. Assim que ela for salva, você já entra na Minha JB e o link deixa de valer."
      rodape={
        <p>
          Não foi você que pediu?{" "}
          <Link href="/contato" className="font-semibold text-jb-700 underline-offset-4 hover:underline">
            Avise a equipe da JB
          </Link>{" "}
          — sua senha atual continua valendo enquanto o link não for usado.
        </p>
      }
    >
      <FormularioRedefinir token={token} />
    </MolduraAutenticacao>
  );
}
