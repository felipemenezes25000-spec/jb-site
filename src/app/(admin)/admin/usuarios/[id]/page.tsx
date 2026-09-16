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

/*
 * Toda tela do painel lê a sessão do staff antes de qualquer outra coisa, e
 * sessão é dado de requisição: nenhuma delas prerenderiza, nem deveria.
 *
 * `instant = false` é a saída documentada, e o guia é explícito em que ela vale
 * para o SEGMENTO que levanta a validação — não cascateia do layout
 * (node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md,
 * "Adopting incrementally"). Sem esta linha em cada página, a validação dispara
 * na compilação sob demanda e o vigia de console do E2E derruba o teste que
 * estiver rodando na hora.
 */
export const instant = false;

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

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Cartao>
          <CabecalhoCartao
            titulo="Senha"
            descricao="A senha atual não pode ser exibida por ninguém, nem por um administrador."
          />
          <div className="px-5 py-4">
            <BotaoNovaSenha acao={gerarSenhaTemporaria} id={pessoa.id} nome={pessoa.name} />
            <p className="mt-4 text-[0.8125rem] leading-relaxed text-graf-500">
              Gerar uma nova senha invalida a anterior na hora. A pessoa entra com a temporária
              e troca a senha em Minha conta. O painel não obriga a troca no primeiro acesso, então
              vale avisar.
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
                    <p className="mt-0.5 text-[0.8125rem] text-graf-500">{linha.summary}</p>
                  ) : null}
                  <p className="mt-0.5 text-[0.8125rem] text-graf-500">
                    {formatarDataHora(linha.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-graf-200 bg-graf-50 px-5 py-3">
            <Link
              href={`/admin/auditoria?busca=${encodeURIComponent(pessoa.id)}`}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-jb-700 underline underline-offset-2 hover:text-jb-500"
            >
              Ver tudo na auditoria
            </Link>
          </div>
        </Cartao>
      </div>

      <p className="text-[0.8125rem] text-graf-500">
        Acesso criado em {formatarDataHora(pessoa.createdAt)}
        {pessoa.lastLoginAt
          ? ` · último acesso em ${formatarDataHora(pessoa.lastLoginAt)}`
          : " · a pessoa nunca entrou no painel"}
        .
      </p>
    </div>
  );
}
