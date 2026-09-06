"use client";

import { useState } from "react";
import { FlaskConical } from "lucide-react";

import {
  CabecalhoDoProntuario,
  LinhaDoTempo,
  Serial,
  type EventoDaTimeline,
  type ResumoDoProntuario,
} from "@/components/dominio/prontuario";
import { LinkBotao } from "@/components/ui/button";
import { Secao } from "@/components/ui/secao";
import { TituloSecao } from "@/components/ui/data";
import { formatarData } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Demonstração pública do Prontuário Técnico JB

   "Ver como funciona o prontuário" precisava abrir alguma coisa. Este é o
   alguma coisa: os mesmos componentes da ficha real, com dados ilustrativos,
   navegável sem conta.

   As regras que governam este arquivo, e que são a razão de ele existir
   separado da ficha real:

   1. **Nada aqui vem do banco.** Os dados são constantes deste arquivo. Não
      há consulta, não há cliente, não há equipamento real — e é impossível
      que haja, porque o componente não recebe nem lê nada.

   2. **O rótulo é permanente e visível.** "Demonstração com dados
      ilustrativos" fica no topo, dentro da moldura, não num rodapé em cinza
      claro. Quem chega no meio da página precisa saber o que está vendo.

   3. **Nomes e números são obviamente fictícios.** "Clínica Exemplo",
      serial começando em "DEMO". Um nome plausível de cliente seria uma
      afirmação sobre alguém que não autorizou nada.

   4. **Os componentes são os mesmos.** Se a ficha real mudar, esta muda
      junto. Uma demonstração desenhada à parte vira propaganda de um produto
      que não existe assim.

   O que ela NÃO faz: pedir conta para explorar. Só ao decidir começar de
   verdade é que aparece o caminho para o cadastro.
   ============================================================================ */

/** Datas relativas a hoje, para a demonstração não envelhecer sozinha. */
function diasAtras(dias: number) {
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
}
function diasAFrente(dias: number) {
  return new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
}

const RESUMO: ResumoDoProntuario = {
  nome: "Autoclave 21 litros",
  marca: "Marca Exemplo",
  modelo: "Linha 21L",
  serial: "DEMO-21L-0042",
  estado: "operacional",
  origem: "compra_jb",
  garantiaAte: diasAFrente(210),
  proximaPreventiva: diasAFrente(74),
  local: "Sala 2 · Clínica Exemplo",
};

const HISTORICO: EventoDaTimeline[] = [
  {
    id: "compra",
    titulo: "Compra confirmada",
    detalhe: "Equipamento registrado no prontuário, com garantia e documentos.",
    data: diasAtras(288),
    autor: "Pedido JB-EXEMPLO",
  },
  {
    id: "instalacao",
    titulo: "Instalação concluída",
    detalhe: "Ponto elétrico conferido, ciclo de teste executado e aprovado.",
    data: diasAtras(281),
    autor: "Técnico da JB",
  },
  {
    id: "preventiva",
    titulo: "Preventiva realizada",
    detalhe: "Guarnição inspecionada, filtro trocado, teste biológico aprovado.",
    data: diasAtras(106),
    autor: "Técnico da JB",
  },
  {
    id: "chamado",
    titulo: "Chamado atendido — não aquecia",
    detalhe: "Resistência substituída após aprovação do orçamento. Testes finais aprovados.",
    data: diasAtras(38),
    autor: "OS-EXEMPLO",
  },
  {
    id: "proxima",
    titulo: "Próxima preventiva",
    detalhe: "Programada pela periodicidade do contrato.",
    // sem data preenchida: é etapa prevista, e a linha do tempo a desenha
    // diferente de tudo o que já aconteceu
    data: null,
  },
];

const DOCUMENTOS = [
  { id: "nf", nome: "Nota fiscal", detalhe: `Emitida em ${formatarData(diasAtras(288))}` },
  { id: "manual", nome: "Manual do fabricante", detalhe: "PDF · Linha 21L" },
  { id: "os", nome: "Ordem de serviço", detalhe: `Concluída em ${formatarData(diasAtras(38))}` },
  { id: "laudo", nome: "Teste biológico", detalhe: `Aprovado em ${formatarData(diasAtras(106))}` },
];

type Aba = "resumo" | "historico" | "documentos";

const ABAS: { chave: Aba; rotulo: string }[] = [
  { chave: "resumo", rotulo: "Resumo" },
  { chave: "historico", rotulo: "Histórico" },
  { chave: "documentos", rotulo: "Documentos" },
];

export function DemonstracaoDoProntuario() {
  const [aba, setAba] = useState<Aba>("resumo");

  return (
    <Secao fundo="clara" espaco="lg" separador>
      <TituloSecao
        sobretitulo="Prontuário Técnico JB"
        titulo="A ficha viva do equipamento"
        descricao="Depois da compra, cada máquina da clínica ganha uma ficha como esta. Abaixo, um exemplo navegável — sem precisar de conta."
        className="mb-8"
      />

      <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-graf-300 bg-white shadow-raised">
        {/* O rótulo fica DENTRO da moldura e no topo: quem chega rolando a
            página precisa saber o que está vendo antes de ler os dados. */}
        <p className="flex items-center gap-2 border-b border-graf-200 bg-warn-50 px-5 py-3 text-[0.8125rem] font-semibold text-warn-700">
          <FlaskConical className="size-4 shrink-0" aria-hidden />
          Demonstração com dados ilustrativos
        </p>

        <div className="p-5 sm:p-6">
          {/* Abas de verdade: papel, estado e navegação por seta. Três botões
              estilizados dariam a mesma aparência e nenhuma semântica. */}
          {/* `flex-wrap` e não uma linha só: em 320px — o mínimo que a WCAG
              2.2 manda suportar — os três botões somavam mais que a largura
              da tela e o último saía para fora. Encontrado pelo
              `scripts/responsivo.mjs`. */}
          <div
            role="tablist"
            aria-label="Partes do prontuário"
            className="flex flex-wrap gap-1.5"
          >
            {ABAS.map((item) => (
              <button
                key={item.chave}
                type="button"
                role="tab"
                id={`demo-aba-${item.chave}`}
                aria-selected={aba === item.chave}
                aria-controls={`demo-painel-${item.chave}`}
                onClick={() => setAba(item.chave)}
                className={cn(
                  "min-h-11 rounded-lg px-4 text-sm font-semibold transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
                  aba === item.chave
                    ? "bg-graf-950 text-white"
                    : "bg-graf-100 text-graf-700 hover:bg-graf-200",
                )}
              >
                {item.rotulo}
              </button>
            ))}
          </div>

          {/*
            Os três painéis existem sempre; o que muda é qual está visível.

            Antes só o painel da aba corrente era renderizado, e o
            `aria-controls` das outras duas apontava para um id que não existia
            na página — o que a auditoria de acessibilidade acusou. Para um
            leitor de tela, uma aba que controla o nada é uma aba quebrada.

            `hidden` e não `display:none` por classe: o atributo tira o painel
            da árvore de acessibilidade e do fluxo, que é exatamente o
            comportamento do padrão de abas.
          */}
          <div
            role="tabpanel"
            id="demo-painel-resumo"
            aria-labelledby="demo-aba-resumo"
            hidden={aba !== "resumo"}
            className="mt-5"
          >
            <CabecalhoDoProntuario resumo={RESUMO} className="border-graf-200" />
          </div>

          <div
            role="tabpanel"
            id="demo-painel-historico"
            aria-labelledby="demo-aba-historico"
            hidden={aba !== "historico"}
            className="mt-5"
          >
            <LinhaDoTempo eventos={HISTORICO} />
          </div>

          <div
            role="tabpanel"
            id="demo-painel-documentos"
            aria-labelledby="demo-aba-documentos"
            hidden={aba !== "documentos"}
            className="mt-5"
          >
            <ul className="divide-y divide-graf-100 rounded-xl border border-graf-200">
              {DOCUMENTOS.map((documento) => (
                <li
                  key={documento.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3.5"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-graf-950">
                      {documento.nome}
                    </span>
                    <span className="block text-[0.8125rem] text-graf-500">
                      {documento.detalhe}
                    </span>
                  </span>
                  {/* Sem botão de baixar: não há arquivo, e um botão que não
                      baixa nada é exatamente o controle inerte que o escopo
                      proíbe. O que a demonstração mostra é a organização. */}
                  <span className="shrink-0 text-[0.8125rem] italic text-graf-500">
                    disponível na sua Área da Clínica
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-graf-200 pt-5">
            <LinkBotao href="/cadastro" tamanho="sm">
              Criar a conta da clínica
            </LinkBotao>
            <LinkBotao href="/minha-jb" variante="secundario" tamanho="sm">
              Já sou cliente
            </LinkBotao>
            <p className="w-full text-[0.8125rem] leading-relaxed text-graf-500 sm:w-auto">
              O serial <Serial numero="DEMO-21L-0042" className="align-middle" /> é de
              exemplo.
            </p>
          </div>
        </div>
      </div>
    </Secao>
  );
}
