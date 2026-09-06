import type { Metadata } from "next";
import Link from "next/link";

import { FormularioRecuperar } from "@/components/conta/formulario-recuperar";
import { MolduraAutenticacao } from "@/components/conta/moldura-autenticacao";
import { LinkBotao } from "@/components/ui/button";

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
      etapa="Área da Clínica"
      titulo="Recuperar o acesso"
      subtitulo="Informe o e-mail da conta. Se ele estiver cadastrado, enviamos um link para você criar uma senha nova."
      rodape={
        /* O rodapé fica fora do formulário de propósito: depois do envio o
           formulário some e dá lugar à confirmação, e o caminho de volta para
           a tela de entrar precisa continuar na página. */
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 font-semibold text-graf-900">Lembrou a senha?</p>
            <LinkBotao href="/entrar" variante="secundario" className="sm:shrink-0">
              Voltar para entrar
            </LinkBotao>
          </div>
          <p className="mt-5">
            Não usa mais esse e-mail?{" "}
            <Link
              href="/contato"
              className="font-semibold text-jb-700 underline-offset-4 hover:underline"
            >
              Fale com a equipe da JB
            </Link>{" "}
            para atualizar o cadastro.
          </p>
        </>
      }
    >
      <FormularioRecuperar emailInicial={emailInicial} />
    </MolduraAutenticacao>
  );
}
