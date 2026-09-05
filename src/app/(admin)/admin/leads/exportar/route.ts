import { montarFiltroDeLeads } from "@/components/admin/conteudo/consultas";
import { rotuloLead } from "@/components/admin/conteudo/rotulos";
import { registrarAuditoria } from "@/lib/auditoria";
import { sessaoStaff } from "@/lib/auth";
import { formatarDataHora, formatarTelefone } from "@/lib/format";
import { podeVer } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

/**
 * Exportação dos leads em CSV.
 *
 * O arquivo respeita os MESMOS filtros da tela: os parâmetros da query são os
 * da listagem, então o que a pessoa vê é o que ela baixa. Sem filtro nenhum,
 * sai a base inteira, com teto para não derrubar a memória do servidor.
 *
 * Três cuidados de formato, porque o destino real é o Excel em português:
 *   - separador `;`, que é o que o Excel pt-BR espera;
 *   - BOM UTF-8 no começo, senão acento vira caractere estranho;
 *   - célula que começa com `=`, `+`, `-` ou `@` é prefixada com aspas simples,
 *     senão o Excel interpreta o texto como fórmula (injeção de CSV).
 */

const LIMITE = 5000;

const COLUNAS = [
  "Recebido em",
  "Situação",
  "Nome",
  "E-mail",
  "Telefone",
  "Endereço",
  "Bairro",
  "Cidade",
  "UF",
  "CEP",
  "Newsletter",
  "Mensagem",
  "Anotações internas",
] as const;

/** Uma célula segura: escapada para CSV e inofensiva no Excel. */
function celula(valor: string | null | undefined) {
  const texto = (valor ?? "").replace(/\r\n|\r|\n/g, " ").trim();
  const seguro = /^[=+\-@\t]/.test(texto) ? `'${texto}` : texto;
  return `"${seguro.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const usuario = await sessaoStaff();
  if (!usuario) {
    return new Response("Entre no painel para exportar.", { status: 401 });
  }
  if (!podeVer(usuario, "leads")) {
    return new Response("Seu perfil não tem acesso aos leads.", { status: 403 });
  }

  const url = new URL(request.url);
  const parametros = {
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    data_de: url.searchParams.get("data_de") ?? undefined,
    data_ate: url.searchParams.get("data_ate") ?? undefined,
  };

  const where = montarFiltroDeLeads(parametros);

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: LIMITE,
    select: {
      id: true,
      nome: true,
      email: true,
      telefone: true,
      endereco: true,
      bairro: true,
      cidade: true,
      estado: true,
      cep: true,
      news: true,
      obs: true,
      notas: true,
      status: true,
      createdAt: true,
    },
  });

  const linhas = [
    COLUNAS.map(celula).join(";"),
    ...leads.map((lead) =>
      [
        celula(formatarDataHora(lead.createdAt)),
        celula(rotuloLead(lead.status)),
        celula(lead.nome),
        celula(lead.email),
        celula(lead.telefone ? formatarTelefone(lead.telefone) : ""),
        celula(lead.endereco),
        celula(lead.bairro),
        celula(lead.cidade),
        celula(lead.estado),
        celula(lead.cep),
        celula(lead.news ? "sim" : "não"),
        celula(lead.obs),
        celula(lead.notas),
      ].join(";"),
    ),
  ];

  const corpo = `\uFEFF${linhas.join("\r\n")}\r\n`;

  const agora = new Date();
  const carimbo = `${agora.getFullYear()}${String(agora.getMonth() + 1).padStart(2, "0")}${String(agora.getDate()).padStart(2, "0")}`;

  await registrarAuditoria({
    userId: usuario.id,
    acao: "exportar",
    entidade: "lead",
    resumo: `Exportou ${leads.length} lead(s) em CSV${leads.length === LIMITE ? ` (limite de ${LIMITE} atingido)` : ""}`,
  });

  return new Response(corpo, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-jb-${carimbo}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
