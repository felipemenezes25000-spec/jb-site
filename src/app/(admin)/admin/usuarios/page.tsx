import type { Metadata } from "next";
import type { StaffRole } from "@prisma/client";
import { Plus, ShieldCheck, UserCog } from "lucide-react";

import { alternarUsuarioAtivo } from "@/app/acoes/admin-conteudo";
import { BotaoAcao } from "@/components/admin/conteudo/botao-acao";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { Aviso } from "@/components/ui/aviso";
import { LinkBotao } from "@/components/ui/button";
import { Etiqueta, Vazio, type Tom } from "@/components/ui/data";
import { formatarDataHora, formatarTelefone, plural } from "@/lib/format";
import { DESCRICAO_PAPEL, ROTULO_PAPEL, exigirArea } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

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

export const metadata: Metadata = {
  title: "Usuários",
};

const TOM_PAPEL: Record<StaffRole, Tom> = {
  admin: "marca",
  gestor: "andamento",
  comercial: "ok",
  tecnico: "aguardando",
  editor: "neutro",
};

export default async function PaginaUsuarios() {
  const usuario = await exigirArea("usuarios");

  const usuarios = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
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

  const ativos = usuarios.filter((pessoa) => pessoa.active).length;
  const admins = usuarios.filter((pessoa) => pessoa.active && pessoa.role === "admin").length;

  return (
    <div className="space-y-6">
      <CabecalhoDeSecao
        titulo="Equipe interna"
        descricao="Quem entra no painel e o que cada pessoa enxerga. Nenhuma senha é exibida aqui — nem para um administrador."
        etiqueta={
          <Etiqueta tom={ativos > 0 ? "ok" : "alerta"}>
            {plural(ativos, "acesso ativo", "acessos ativos")}
          </Etiqueta>
        }
        acoes={
          <LinkBotao href="/admin/usuarios/novo">
            <Plus className="size-4" aria-hidden />
            Novo acesso
          </LinkBotao>
        }
      />

      {admins <= 1 ? (
        <Aviso tom="atencao" titulo="Só existe um administrador ativo">
          Enquanto for assim, esse acesso não pode ser rebaixado nem desativado. Crie um segundo
          administrador para não ficar sem ninguém capaz de abrir Usuários e Configurações.
        </Aviso>
      ) : null}

      {usuarios.length === 0 ? (
        <Vazio
          icone={UserCog}
          titulo="Nenhum usuário cadastrado"
          descricao="Crie o primeiro acesso da equipe."
          acao={
            <LinkBotao href="/admin/usuarios/novo">
              <Plus className="size-4" aria-hidden />
              Novo acesso
            </LinkBotao>
          }
        />
      ) : (
        <ul className="space-y-3">
          {usuarios.map((pessoa) => {
            const ehVoce = pessoa.id === usuario.id;
            const ultimoAdmin = pessoa.role === "admin" && pessoa.active && admins <= 1;

            return (
              <li
                key={pessoa.id}
                className={cn(
                  "rounded-xl border bg-white p-4 shadow-card",
                  pessoa.active
                    ? "border-graf-200"
                    : "border-dashed border-graf-300 bg-graf-50/60",
                )}
              >
                <div className="flex flex-wrap items-start gap-4">
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                      pessoa.active ? "bg-jb-50 text-jb-700" : "bg-graf-100 text-graf-500",
                    )}
                  >
                    {pessoa.name.slice(0, 2).toUpperCase()}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-graf-950">{pessoa.name}</h2>
                      <Etiqueta tom={TOM_PAPEL[pessoa.role]}>
                        {pessoa.role === "admin" ? (
                          <ShieldCheck className="size-3" aria-hidden />
                        ) : null}
                        {ROTULO_PAPEL[pessoa.role]}
                      </Etiqueta>
                      {pessoa.active ? null : <Etiqueta tom="neutro" ponto>Desativado</Etiqueta>}
                      {ehVoce ? <Etiqueta tom="andamento">Você</Etiqueta> : null}
                    </div>

                    <p className="mt-0.5 break-all text-sm text-graf-600">{pessoa.email}</p>
                    <p className="mt-1 text-apoio text-graf-500">
                      {DESCRICAO_PAPEL[pessoa.role]}
                      {pessoa.phone ? ` · ${formatarTelefone(pessoa.phone)}` : ""}
                    </p>
                    <p className="mt-1 text-apoio text-graf-500">
                      {pessoa.lastLoginAt
                        ? `Último acesso em ${formatarDataHora(pessoa.lastLoginAt)}`
                        : "Nunca entrou no painel"}
                      {` · cadastrado em ${formatarDataHora(pessoa.createdAt)}`}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <BotaoAcao
                      acao={alternarUsuarioAtivo}
                      valores={{ id: pessoa.id, ativar: pessoa.active ? "0" : "1" }}
                      rotulo={pessoa.active ? "Desativar" : "Ativar"}
                      variante={pessoa.active ? "perigo" : "secundario"}
                      desabilitado={pessoa.active && (ehVoce || ultimoAdmin)}
                    />
                    <LinkBotao
                      href={`/admin/usuarios/${pessoa.id}`}
                      variante="secundario"
                      tamanho="sm"
                    >
                      Abrir
                    </LinkBotao>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
