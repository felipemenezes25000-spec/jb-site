import type { Metadata } from "next";
import Link from "next/link";

import { FormularioRecuperar } from "@/components/conta/formulario-recuperar";
import { MolduraAutenticacao } from "@/components/conta/moldura-autenticacao";

export const metadata: Metadata = {
  title: "Recuperar senha",
  description: "Peça o link de redefinição de senha da sua conta na JB.",
  robots: { index: false, follow: false },
};

type Busca = Promise<{ [chave: string]: string | string[] | undefined }>;

export default async function RecuperarSenhaPage({ searchParams }: { searchParams: Busca }) {
  const params = await searchParams;
  const emailInicial = typeof params.email === "string" ? params.email : "";

  return (
    <MolduraAutenticacao
      titulo="Recuperar o acesso"
      subtitulo="Informe o e-mail da conta. Se ele estiver cadastrado, enviamos um link para você cadastrar uma senha nova."
      rodape={
        <p>
          Não usa mais esse e-mail?{" "}
          <Link href="/contato" className="font-semibold text-jb-700 underline-offset-4 hover:underline">
            Fale com a equipe da JB
          </Link>{" "}
          para atualizar o cadastro.
        </p>
      }
    >
      <FormularioRecuperar emailInicial={emailInicial} />
    </MolduraAutenticacao>
  );
}
