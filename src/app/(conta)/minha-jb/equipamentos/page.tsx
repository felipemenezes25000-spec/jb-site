import type { Metadata } from "next";
import type { EquipmentStatus } from "@prisma/client";
import { Plus, Stethoscope } from "lucide-react";

import { CartaoEquipamento } from "@/components/conta/mj-cartao-equipamento";
import { Filtros, primeiroValor, type GrupoFiltro } from "@/components/conta/mj-filtros";
import { Topo } from "@/components/conta/mj-topo";
import { LinkBotao } from "@/components/ui/button";
import { Vazio } from "@/components/ui/data";
import { exigirCliente } from "@/lib/auth-cliente";
import { ROTULO_EQUIPAMENTO, equipamentosDoCliente } from "@/lib/equipamento";
import { somenteDigitos } from "@/lib/format";

export const metadata: Metadata = {
  title: "Meus equipamentos",
  description: "Prontuário dos equipamentos da sua clínica.",
  robots: { index: false, follow: false },
};

const STATUS: EquipmentStatus[] = [
  "operacional",
  "em_manutencao",
  "aguardando_peca",
  "inoperante",
  "desativado",
];

function ehStatus(valor: string): valor is EquipmentStatus {
  return (STATUS as string[]).includes(valor);
}

/** Busca sem acento e sem pontuação: "autoclave" acha "Autoclave Vitale". */
function normalizar(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

type Busca = Promise<{ [chave: string]: string | string[] | undefined }>;

export default async function EquipamentosPage({ searchParams }: { searchParams: Busca }) {
  const [cliente, params] = await Promise.all([
    exigirCliente("/minha-jb/equipamentos"),
    searchParams,
  ]);

  const status = primeiroValor(params.status);
  const termo = primeiroValor(params.q).slice(0, 60);

  const todos = await equipamentosDoCliente(cliente.id);

  const alvo = normalizar(termo);
  const digitos = somenteDigitos(termo);

  const lista = todos.filter((equipamento) => {
    if (ehStatus(status) && equipamento.status !== status) return false;
    if (!alvo) return true;

    const texto = normalizar(
      [
        equipamento.name,
        equipamento.brandName,
        equipamento.modelName,
        equipamento.serialNumber,
        equipamento.location?.name ?? "",
        equipamento.room,
      ].join(" "),
    );

    if (texto.includes(alvo)) return true;
    return digitos.length >= 3 && somenteDigitos(equipamento.serialNumber).includes(digitos);
  });

  const contagem = new Map<EquipmentStatus, number>();
  for (const equipamento of todos) {
    contagem.set(equipamento.status, (contagem.get(equipamento.status) ?? 0) + 1);
  }

  const grupos: GrupoFiltro[] = [
    {
      nome: "status",
      rotulo: "Situação do equipamento",
      opcoes: [
        { valor: "", rotulo: "Todos", quantidade: todos.length },
        ...STATUS.filter((chave) => (contagem.get(chave) ?? 0) > 0).map((chave) => ({
          valor: chave,
          rotulo: ROTULO_EQUIPAMENTO[chave],
          quantidade: contagem.get(chave) ?? 0,
        })),
      ],
    },
  ];

  const filtrando = Boolean(status || termo);

  return (
    <div>
      <Topo
        titulo="Meus equipamentos"
        descricao="O prontuário da clínica: cada equipamento com garantia, histórico de manutenção e chamados. Vale para o que foi comprado na JB e para o que já estava aí."
        acoes={
          <LinkBotao href="/minha-jb/equipamentos/novo" tamanho="sm">
            <Plus className="size-4" aria-hidden />
            Cadastrar equipamento
          </LinkBotao>
        }
      />

      {todos.length > 0 ? (
        <Filtros
          base="/minha-jb/equipamentos"
          parametros={{ status, q: termo }}
          grupos={grupos}
          busca={{
            nome: "q",
            rotulo: "Buscar equipamento",
            placeholder: "Nome, marca, modelo ou nº de série",
          }}
        />
      ) : null}

      {lista.length === 0 ? (
        <Vazio
          icone={Stethoscope}
          titulo={
            filtrando
              ? "Nenhum equipamento neste recorte"
              : "Você ainda não cadastrou equipamentos"
          }
          descricao={
            filtrando
              ? "Tente outro filtro ou limpe a busca para ver todos os equipamentos da conta."
              : "Cadastrando o equipamento, você passa a ter num lugar só a garantia, o histórico de manutenção e os chamados dele — e a abertura de chamado já vem preenchida."
          }
          acao={
            filtrando ? (
              <LinkBotao href="/minha-jb/equipamentos" variante="secundario">
                Ver todos
              </LinkBotao>
            ) : (
              <LinkBotao href="/minha-jb/equipamentos/novo">
                <Plus className="size-4" aria-hidden />
                Cadastrar equipamento
              </LinkBotao>
            )
          }
        />
      ) : (
        <>
          <p className="sr-only" role="status">
            {lista.length} equipamento(s) na lista.
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {lista.map((equipamento) => (
              <li key={equipamento.id} className="flex">
                <CartaoEquipamento equipamento={equipamento} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
