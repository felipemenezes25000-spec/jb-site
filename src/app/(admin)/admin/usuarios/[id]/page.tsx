import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { StaffRole } from "@prisma/client";

import { gerarSenhaTemporaria, salvarUsuario } from "@/app/acoes/admin-conteudo";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import {
  BotaoNovaSenha,
  FormularioUsuario,
} from "@/components/admin/conteudo/formulario-usuario";
import { rotuloEntidade } from "@/components/admin/conteudo/rotulos";
import { Cartao, CabecalhoCartao, Etiqueta } from "@/components/ui/data";
import { historicoDe, rotuloAcao } from "@/lib/auditoria";
import { formatarDataHora } from "@/lib/format";
import { DESCRICAO_PAPEL, ROTULO_PAPEL, exigirArea } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

const PAPEIS: StaffRole[] = ["admin", "gestor", "comercial", "tecnico", "editor"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pessoa = await prisma.user.findUnique({ where: { id }, select: { name: true } });
  return { title: pessoa ? `${pessoa.name} · Usuários` : "Usuário" };
}

export default async function PaginaEditarUsuario({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await exigirArea("usuarios");
  const { id } = await params;

  const pessoa = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  if (!pessoa) notFound();

  const outrosAdmins = await prisma.user.count({
    where: { role: "admin", active: true, id: { not: pessoa.id } },
  });

  const historico = await historicoDe("usuario", pessoa.id, 10);

  return (
    <div className="space-y-6">
      <CabecalhoDeSecao
        trilha={[{ rotulo: "Usuários", href: "/admin/usuarios" }, { rotulo: pessoa.name }]}
        titulo={pessoa.name}
        descricao={
          <>
            {ROTULO_PAPEL[pessoa.role]} · {DESCRICAO_PAPEL[pessoa.role]}
          </>
        }
        etiqueta={
          pessoa.active ? (
            <Etiqueta tom="ok" ponto>
              Acesso ativo
            </Etiqueta>
          ) : (
            <Etiqueta tom="neutro" ponto>
              Acesso desativado
            </Etiqueta>
          )
        }
      />

      <FormularioUsuario
        acao={salvarUsuario}
        usuario={{
          id: pessoa.id,
          name: pessoa.name,
          email: pessoa.email,
          role: pessoa.role,
          phone: pessoa.phone ?? "",
          active: pessoa.active,
        }}
        papeis={PAPEIS.map((papel) => ({
          valor: papel,
          rotulo: ROTULO_PAPEL[papel],
          descricao: DESCRICAO_PAPEL[papel],
        }))}
        ehVoceMesmo={pessoa.id === usuario.id}
        ehUltimoAdmin={pessoa.role === "admin" && pessoa.active && outrosAdmins === 0}
      />

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <Cartao>
          <CabecalhoCartao
            titulo="Senha"
            descricao="O painel não consegue mostrar a senha atual — ela é guardada só como hash."
          />
          <div className="px-5 py-4">
            <BotaoNovaSenha acao={gerarSenhaTemporaria} id={pessoa.id} nome={pessoa.name} />
            <p className="mt-4 text-xs leading-relaxed text-graf-500">
              Gerar uma nova senha invalida a anterior na hora. A pessoa entra com a temporária e
              troca a senha em Minha conta (/admin/conta) — o painel não obriga a troca no
              primeiro acesso.
            </p>
          </div>
        </Cartao>

        <Cartao>
          <CabecalhoCartao
            titulo="Histórico deste acesso"
            descricao="Alterações registradas na trilha de auditoria."
          />
          {historico.length === 0 ? (
            <p className="px-5 py-6 text-sm text-graf-500">
              Nenhuma alteração registrada desde a criação do acesso.
            </p>
          ) : (
            <ul className="divide-y divide-graf-100">
              {historico.map((linha) => (
                <li key={linha.id} className="px-5 py-3">
                  <p className="text-sm text-graf-800">
                    <span className="font-semibold">{rotuloAcao(linha.action)}</span>{" "}
                    {rotuloEntidade(linha.entity).toLowerCase()}
                    {linha.user ? ` · por ${linha.user.name}` : ""}
                  </p>
                  {linha.summary ? (
                    <p className="mt-0.5 text-xs text-graf-500">{linha.summary}</p>
                  ) : null}
                  <p className="mt-0.5 text-xs text-graf-500">
                    {formatarDataHora(linha.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-graf-200 bg-graf-50 px-5 py-3">
            <Link
              href={`/admin/auditoria?busca=${encodeURIComponent(pessoa.id)}`}
              className="text-sm font-semibold text-jb-700 underline underline-offset-2"
            >
              Ver tudo na auditoria
            </Link>
          </div>
        </Cartao>
      </div>

      <p className="text-xs text-graf-500">
        Acesso criado em {formatarDataHora(pessoa.createdAt)}
        {pessoa.lastLoginAt
          ? ` · último acesso em ${formatarDataHora(pessoa.lastLoginAt)}`
          : " · a pessoa nunca entrou no painel"}
        .
      </p>
    </div>
  );
}
