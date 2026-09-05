import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ScrollText } from "lucide-react";

import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { dataDoParametro } from "@/components/admin/conteudo/consultas";
import { rotuloEntidade } from "@/components/admin/conteudo/rotulos";
import { FiltrosLista } from "@/components/admin/filtros-lista";
import { Esqueleto, Etiqueta, Vazio, type Tom } from "@/components/ui/data";
import { Paginacao } from "@/components/ui/paginacao";
import { ACOES, listarAuditoria, rotuloAcao } from "@/lib/auditoria";
import { formatarDataHora, plural } from "@/lib/format";
import { ROTULO_PAPEL, exigirArea, podeVer, type AreaAdmin } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Auditoria",
};

const POR_PAGINA = 40;

/** Cor da linha pelo peso da ação: apagar é vermelho, criar é verde. */
const TOM_DA_ACAO: Record<string, Tom | undefined> = {
  criar: "ok",
  editar: "andamento",
  excluir: "alerta",
  cancelar: "alerta",
  publicar: "ok",
  arquivar: "neutro",
  restaurar: "ok",
  status: "aguardando",
  pagamento: "ok",
  atribuir: "andamento",
  enviar: "andamento",
  importar: "neutro",
  exportar: "neutro",
  entrar: "neutro",
  sair: "neutro",
};

/**
 * Para onde a linha aponta, quando o registro tem tela própria — e sob qual
 * área essa tela vive.
 *
 * A área importa porque a auditoria é mais aberta que várias das telas que ela
 * cita: gestor lê a trilha inteira, mas não abre Usuários, que é só do
 * administrador. Sem esta conferência, "Abrir registro" levaria o gestor
 * direto para o aviso de sem permissão. Link que não abre não é link.
 */
const ROTA_DA_ENTIDADE: Record<
  string,
  { area: AreaAdmin; href: (id: string) => string } | undefined
> = {
  pagina: { area: "conteudo", href: (id) => `/admin/conteudo/paginas/${id}` },
  secao_home: { area: "conteudo", href: (id) => `/admin/conteudo/home/${id}` },
  slide: { area: "conteudo", href: (id) => `/admin/conteudo/slides/${id}` },
  faq: { area: "conteudo", href: (id) => `/admin/conteudo/faq/${id}` },
  lead: { area: "leads", href: (id) => `/admin/leads/${id}` },
  ticket: { area: "suporte", href: (id) => `/admin/suporte/${id}` },
  usuario: { area: "usuarios", href: (id) => `/admin/usuarios/${id}` },
  User: { area: "usuarios", href: (id) => `/admin/usuarios/${id}` },
  cliente: { area: "clientes", href: (id) => `/admin/clientes/${id}` },
  pedido: { area: "pedidos", href: (id) => `/admin/pedidos/${id}` },
  produto: { area: "produtos", href: (id) => `/admin/produtos/${id}` },
  chamado: { area: "assistencia", href: (id) => `/admin/assistencia/${id}` },
  ordem_servico: { area: "os", href: (id) => `/admin/os/${id}` },
  orcamento: { area: "orcamentos", href: (id) => `/admin/orcamentos/${id}` },
};

/**
 * `AuditLog.summary` guarda o diff em texto: "preço: R$ 1,00 → R$ 2,00; IP 10.0.0.1".
 * Aqui ele volta a ser uma lista legível, com o IP separado do resto.
 */
function lerResumo(summary: string) {
  const partes = summary.split(" · ");
  const ip = partes.find((parte) => parte.startsWith("IP "));
  const corpo = partes.filter((parte) => !parte.startsWith("IP ")).join(" · ");
  const mudancas = corpo
    .split(";")
    .map((trecho) => trecho.trim())
    .filter(Boolean);

  return { ip: ip ? ip.slice(3) : "", mudancas };
}

export default async function PaginaAuditoria({
  searchParams,
}: {
  searchParams: Promise<{
    busca?: string;
    entidade?: string;
    usuario?: string;
    acao?: string;
    data_de?: string;
    data_ate?: string;
    pagina?: string;
  }>;
}) {
  const usuario = await exigirArea("auditoria");
  const parametros = await searchParams;
  const numeroDaPagina = Math.max(1, Number(parametros.pagina) || 1);

  const [entidades, pessoas] = await Promise.all([
    prisma.auditLog.findMany({
      distinct: ["entity"],
      orderBy: { entity: "asc" },
      select: { entity: true },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
  ]);

  const { registros, total, paginas } = await listarAuditoria({
    busca: parametros.busca,
    entidade: parametros.entidade,
    userId: parametros.usuario,
    acao: parametros.acao,
    de: dataDoParametro(parametros.data_de) ?? undefined,
    ate: dataDoParametro(parametros.data_ate, true) ?? undefined,
    pagina: numeroDaPagina,
    porPagina: POR_PAGINA,
  });

  return (
    <div className="space-y-5">
      <CabecalhoDeSecao
        titulo="Trilha de auditoria"
        descricao="Quem alterou o quê e quando. O registro guarda só os campos que mudaram — senha, token e hash nunca aparecem com valor."
        etiqueta={
          <Etiqueta tom="neutro">{plural(total, "registro", "registros")} no filtro</Etiqueta>
        }
      />

      <FiltrosLista
        campos={[
          {
            tipo: "busca",
            nome: "busca",
            rotulo: "Buscar",
            placeholder: "Trecho do resumo ou identificador do registro",
          },
          {
            tipo: "selecao",
            nome: "entidade",
            rotulo: "Tipo de registro",
            todos: "Todos",
            opcoes: entidades.map((linha) => ({
              valor: linha.entity,
              rotulo: rotuloEntidade(linha.entity),
            })),
          },
          {
            tipo: "selecao",
            nome: "usuario",
            rotulo: "Quem fez",
            todos: "Qualquer pessoa",
            opcoes: pessoas.map((pessoa) => ({
              valor: pessoa.id,
              rotulo: `${pessoa.name} · ${ROTULO_PAPEL[pessoa.role]}`,
            })),
          },
          {
            tipo: "selecao",
            nome: "acao",
            rotulo: "Ação",
            todos: "Todas",
            opcoes: Object.entries(ACOES).map(([chave, rotulo]) => ({
              valor: chave,
              rotulo,
            })),
          },
          { tipo: "periodo", nome: "data", rotulo: "Período" },
        ]}
      />

      {registros.length === 0 ? (
        <Vazio
          icone={ScrollText}
          titulo="Nenhum registro com esses filtros"
          descricao="A trilha guarda criações, alterações, exclusões, mudanças de status e entradas no painel. Amplie o período ou limpe os filtros."
        />
      ) : (
        <ol className="space-y-2">
          {registros.map((registro) => {
            const resumo = lerResumo(registro.summary);
            const rota = ROTA_DA_ENTIDADE[registro.entity];
            const href =
              rota && registro.entityId && podeVer(usuario, rota.area)
                ? rota.href(registro.entityId)
                : null;

            return (
              <li
                key={registro.id}
                className="rounded-xl border border-graf-200 bg-white p-4 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Etiqueta tom={TOM_DA_ACAO[registro.action] ?? "neutro"}>
                        {rotuloAcao(registro.action)}
                      </Etiqueta>
                      <span className="text-sm font-semibold text-graf-900">
                        {rotuloEntidade(registro.entity)}
                      </span>
                      {registro.entityId ? (
                        <span className="label-mono text-xs text-graf-500">
                          {registro.entityId}
                        </span>
                      ) : null}
                    </div>

                    {resumo.mudancas.length > 0 ? (
                      <ul className="mt-2 space-y-0.5">
                        {resumo.mudancas.map((mudanca, indice) => (
                          <li
                            key={`${registro.id}-${indice}`}
                            className="text-sm leading-relaxed text-graf-700"
                          >
                            {mudanca}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-graf-500">
                        Sem detalhe registrado para esta ação.
                      </p>
                    )}

                    <p className="mt-2 text-xs text-graf-500">
                      {registro.user
                        ? `${registro.user.name} · ${ROTULO_PAPEL[registro.user.role]}`
                        : "Sem usuário identificado"}
                      {` · ${formatarDataHora(registro.createdAt)}`}
                      {resumo.ip ? ` · IP ${resumo.ip}` : ""}
                    </p>
                  </div>

                  {href ? (
                    <Link
                      href={href}
                      className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-jb-700 transition-colors hover:bg-jb-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                    >
                      Abrir registro
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {paginas > 1 || total > POR_PAGINA ? (
        <Suspense fallback={<Esqueleto className="h-11" />}>
          <Paginacao
            pagina={numeroDaPagina}
            porPagina={POR_PAGINA}
            total={total}
            rotuloSingular="registro"
            rotuloPlural="registros"
          />
        </Suspense>
      ) : null}
    </div>
  );
}
