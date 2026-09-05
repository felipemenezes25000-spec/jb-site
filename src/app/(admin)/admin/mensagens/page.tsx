import { Suspense } from "react";
import type { Metadata } from "next";
import { MailWarning, Send } from "lucide-react";

import { BotaoProcessarFila, BotaoReenviar } from "@/app/(admin)/admin/mensagens/acoes-fila";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { FiltrosLista } from "@/components/admin/filtros-lista";
import { Aviso } from "@/components/ui/aviso";
import { Esqueleto, Etiqueta, Vazio, type Tom } from "@/components/ui/data";
import { Paginacao } from "@/components/ui/paginacao";
import { diagnosticoDeEmail } from "@/lib/email";
import { MODELOS_DISPONIVEIS, modeloConhecido, rotuloDeModelo } from "@/lib/email/registro";
import { formatarDataHora, plural } from "@/lib/format";
import {
  LIMITE_PADRAO,
  MARCA_RESERVA,
  STATUS_DA_FILA,
  contarPorStatus,
  ehStatusDaFila,
  type StatusDaFila,
} from "@/lib/mensageria";
import { CANAIS } from "@/lib/notificacoes";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

/**
 * A fila de saída na tela.
 *
 * Sem esta página a JB não tinha como saber que uma mensagem não saiu: a fila
 * só existia no banco. Aqui aparecem status, destinatário, modelo, erro e
 * data, com filtro, reenvio de uma linha e o botão que roda o lote na hora —
 * sem esperar o cron de `vercel.json`.
 *
 * ÁREA DE PERMISSÃO: `configuracoes`, que hoje é só do administrador. O certo
 * seria uma área própria ("mensagens"), mas `@/lib/permissoes` não é editável
 * neste bloco. Por isso a tela também não aparece no menu lateral, que é
 * montado a partir de `AREAS` — está registrado como pendência.
 */

export const metadata: Metadata = {
  title: "Fila de mensagens",
};

const POR_PAGINA = 30;

const TOM_DO_STATUS: Record<StatusDaFila, Tom> = {
  pendente: "aguardando",
  enviando: "andamento",
  enviado: "ok",
  simulado: "neutro",
  falhou: "alerta",
};

/** Reserva do worker também mora na coluna `error` — não é erro, é estado. */
function ehMarcaDeReserva(texto: string) {
  return texto.startsWith(MARCA_RESERVA);
}

export default async function PaginaMensagens({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    modelo?: string;
    busca?: string;
    pagina?: string;
  }>;
}) {
  const usuario = await exigirArea("mensagens");
  const podeAgir = podeEditar(usuario, "mensagens");

  const parametros = await searchParams;
  const numeroDaPagina = Math.max(1, Number(parametros.pagina) || 1);

  const status = parametros.status && ehStatusDaFila(parametros.status) ? parametros.status : null;
  const modelo = parametros.modelo?.trim() || null;
  const busca = parametros.busca?.trim() || null;

  const filtro = {
    ...(status ? { status } : {}),
    ...(modelo ? { template: modelo } : {}),
    ...(busca ? { to: { contains: busca, mode: "insensitive" as const } } : {}),
  };

  const [total, linhas, contagem] = await Promise.all([
    prisma.outboundMessage.count({ where: filtro }),
    prisma.outboundMessage.findMany({
      where: filtro,
      orderBy: { createdAt: "desc" },
      skip: (numeroDaPagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    contarPorStatus(),
  ]);

  const diagnostico = diagnosticoDeEmail();
  const pendentes = contagem.pendente ?? 0;
  const falhas = contagem.falhou ?? 0;

  return (
    <div className="space-y-5">
      <CabecalhoDeSecao
        titulo="Fila de mensagens"
        descricao="Tudo que a plataforma tenta mandar por e-mail passa por aqui: recuperação de senha, confirmação de pedido, orçamento, chamado e lembrete de manutenção. O texto é remontado pelo modelo na hora do envio."
        etiqueta={
          <Etiqueta tom={pendentes > 0 ? "aguardando" : "ok"}>
            {plural(pendentes, "mensagem na fila", "mensagens na fila")}
          </Etiqueta>
        }
        acoes={podeAgir ? <BotaoProcessarFila limite={LIMITE_PADRAO} /> : null}
      />

      <Aviso
        tom={diagnostico.entrega ? "info" : "atencao"}
        titulo={
          diagnostico.entrega
            ? `Provedor de envio: ${diagnostico.provedor}`
            : "Nenhum e-mail está saindo deste ambiente"
        }
      >
        <p>{diagnostico.motivo}</p>
        {diagnostico.remetente ? (
          <p className="mt-1">
            Remetente configurado: <span className="label-mono">{diagnostico.remetente}</span>
          </p>
        ) : null}
        {!diagnostico.entrega ? (
          <p className="mt-1">
            As mensagens continuam sendo montadas e ficam marcadas como{" "}
            <strong>{STATUS_DA_FILA.simulado}</strong> — o conteúdo completo vai para o log do
            servidor. Configure <span className="label-mono">RESEND_API_KEY</span> e{" "}
            <span className="label-mono">EMAIL_FROM</span> para o envio começar.
          </p>
        ) : null}
      </Aviso>

      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(STATUS_DA_FILA) as StatusDaFila[]).map((chave) => (
          <Etiqueta key={chave} tom={TOM_DO_STATUS[chave]}>
            {STATUS_DA_FILA[chave]}: {contagem[chave] ?? 0}
          </Etiqueta>
        ))}
      </div>

      {falhas > 0 ? (
        <Aviso tom="erro" titulo={plural(falhas, "mensagem falhou", "mensagens falharam")}>
          Cada linha guarda o motivo. Corrija o que causou a falha e use o botão “Reenviar” da
          própria linha — a mensagem volta para a fila e é entregue na hora.
        </Aviso>
      ) : null}

      <FiltrosLista
        campos={[
          {
            tipo: "busca",
            nome: "busca",
            rotulo: "Destinatário",
            placeholder: "Trecho do e-mail de destino",
          },
          {
            tipo: "selecao",
            nome: "status",
            rotulo: "Status",
            todos: "Todos",
            opcoes: (Object.keys(STATUS_DA_FILA) as StatusDaFila[]).map((chave) => ({
              valor: chave,
              rotulo: STATUS_DA_FILA[chave],
            })),
          },
          {
            tipo: "selecao",
            nome: "modelo",
            rotulo: "Modelo",
            todos: "Todos",
            opcoes: MODELOS_DISPONIVEIS.map((item) => ({
              valor: item.chave,
              rotulo: item.rotulo,
            })),
          },
        ]}
      />

      {linhas.length === 0 ? (
        <Vazio
          icone={Send}
          titulo="Nenhuma mensagem com esses filtros"
          descricao="A fila recebe uma linha a cada e-mail que a plataforma decide mandar. Se está vazia, nada foi enfileirado ainda — ou os filtros estão estreitos demais."
        />
      ) : (
        <ol className="space-y-2">
          {linhas.map((linha) => {
            const situacao = ehStatusDaFila(linha.status) ? linha.status : null;
            const reservada = ehMarcaDeReserva(linha.error);
            const desconhecido = !modeloConhecido(linha.template);

            return (
              <li
                key={linha.id}
                className="rounded-xl border border-graf-200 bg-white p-4 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Etiqueta tom={situacao ? TOM_DO_STATUS[situacao] : "neutro"}>
                        {situacao ? STATUS_DA_FILA[situacao] : linha.status}
                      </Etiqueta>
                      <span className="text-sm font-semibold text-graf-900">
                        {rotuloDeModelo(linha.template)}
                      </span>
                      {desconhecido ? (
                        <Etiqueta tom="alerta">Modelo sem texto definido</Etiqueta>
                      ) : null}
                    </div>

                    <p className="mt-2 text-sm text-graf-700">
                      {CANAIS[linha.channel as keyof typeof CANAIS] ?? linha.channel} para{" "}
                      <span className="font-semibold text-graf-900">{linha.to}</span>
                    </p>

                    {linha.error && !reservada ? (
                      <p
                        className={
                          linha.status === "falhou"
                            ? "mt-2 text-sm leading-relaxed text-jb-700"
                            : "mt-2 text-sm leading-relaxed text-graf-700"
                        }
                      >
                        {linha.error}
                      </p>
                    ) : null}

                    {reservada ? (
                      <p className="mt-2 text-sm leading-relaxed text-graf-500">
                        Reservada por uma execução do worker. Se travar, volta sozinha para a fila
                        em até 10 minutos.
                      </p>
                    ) : null}

                    <p className="mt-2 text-xs text-graf-500">
                      Enfileirada em {formatarDataHora(linha.createdAt)}
                      {" · "}
                      <span className="label-mono">{linha.template}</span>
                    </p>
                  </div>

                  {podeAgir ? <BotaoReenviar id={linha.id} destinatario={linha.to} /> : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {total > POR_PAGINA ? (
        <Suspense fallback={<Esqueleto className="h-11" />}>
          <Paginacao
            pagina={numeroDaPagina}
            porPagina={POR_PAGINA}
            total={total}
            rotuloSingular="mensagem"
            rotuloPlural="mensagens"
          />
        </Suspense>
      ) : null}

      <p className="text-sm text-graf-500">
        <MailWarning className="mr-1.5 inline size-4 align-text-bottom" aria-hidden />O cron
        definido em <span className="label-mono">vercel.json</span> chama{" "}
        <span className="label-mono">/api/fila</span> a cada dez minutos e processa até{" "}
        {LIMITE_PADRAO} mensagens por execução. O botão acima faz a mesma coisa, na hora.
      </p>
    </div>
  );
}
