import type { Metadata } from "next";

import { criarArtigo } from "@/app/acoes/admin-central";
import { FormularioArtigo } from "@/components/admin/central/formulario-artigo";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { bibliotecaDeImagens } from "@/components/admin/conteudo/consultas";
import { Aviso } from "@/components/ui/aviso";
import { equipeQuePodeAssinar } from "@/lib/equipe-editorial";
import { exigirEdicao } from "@/lib/permissoes";

export const metadata: Metadata = { title: "Novo artigo · Central Técnica" };

export default async function PaginaNovoArtigo() {
  await exigirEdicao("central");
  const [equipe, biblioteca] = await Promise.all([
    equipeQuePodeAssinar(),
    bibliotecaDeImagens(),
  ]);

  return (
    <div className="space-y-6">
      <CabecalhoDeSecao
        trilha={[
          { rotulo: "Conteúdo", href: "/admin/conteudo" },
          { rotulo: "Central Técnica", href: "/admin/central-tecnica" },
          { rotulo: "Novo artigo" },
        ]}
        titulo="Novo artigo"
        descricao="Nasce como rascunho. A publicação vem depois, e só com autor e revisor definidos."
      />

      {/* Com uma pessoa só cadastrada, autor e revisor seriam a mesma — e a
          publicação seria recusada mais tarde, com o texto já pronto. É melhor
          dizer agora, antes de alguém escrever duas mil palavras. */}
      {equipe.length < 2 ? (
        <Aviso tom="atencao" titulo="A equipe cadastrada não permite revisão">
          A Central exige autor e revisor diferentes, e hoje há menos de duas pessoas com acesso
          de conteúdo no sistema. O texto pode ser escrito, mas não vai poder ser publicado
          enquanto isso não mudar.
        </Aviso>
      ) : null}

      <FormularioArtigo acao={criarArtigo} equipe={equipe} capa={null} biblioteca={biblioteca} />
    </div>
  );
}
