"use client";

import { useState } from "react";
import { FileText, FlaskConical, History, LayoutDashboard } from "lucide-react";

import {
  CabecalhoDoProntuario,
  LinhaDoTempo,
  type EventoDaTimeline,
  type ResumoDoProntuario,
} from "@/components/dominio/prontuario";
import { LinkBotao } from "@/components/ui/button";
import { Secao } from "@/components/ui/secao";
import { formatarData } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Demonstração pública do Prontuário Técnico JB

   O painel é exportado separado para poder morar dentro da faixa da Área da
   Clínica. Isso evita duas seções consecutivas explicando a mesma proposta.
   Os dados são deliberadamente ilustrativos e o aviso permanece visível.
   ============================================================================ */

const RESUMO: ResumoDoProntuario = {
  nome: "Autoclave 21 litros",
  marca: "Marca Exemplo",
  modelo: "Linha 21L",
  serial: "DEMO-21L-0042",
  estado: "operacional",
  origem: "compra_jb",
  garantiaAte: new Date("2027-04-12T12:00:00Z"),
  proximaPreventiva: new Date("2026-11-24T12:00:00Z"),
  local: "Sala 2 · Clínica Exemplo",
};

const HISTORICO: EventoDaTimeline[] = [
  {
    id: "compra",
    titulo: "Compra confirmada",
    detalhe: "Equipamento registrado com documentos e garantia.",
    data: new Date("2025-12-02T12:00:00Z"),
    autor: "Pedido JB-EXEMPLO",
  },
  {
    id: "instalacao",
    titulo: "Instalação concluída",
    detalhe: "Ponto elétrico conferido e ciclo de teste executado.",
    data: new Date("2025-12-09T12:00:00Z"),
    autor: "Técnico da JB",
  },
  {
    id: "preventiva",
    titulo: "Preventiva realizada",
    detalhe: "Inspeção, troca de item de desgaste e teste final registrados.",
    data: new Date("2026-05-18T12:00:00Z"),
    autor: "Técnico da JB",
  },
  {
    id: "chamado",
    titulo: "Chamado atendido",
    detalhe: "Diagnóstico, orçamento aprovado e serviço concluído.",
    data: new Date("2026-08-02T12:00:00Z"),
    autor: "OS-EXEMPLO",
  },
  {
    id: "proxima",
    titulo: "Próxima preventiva",
    detalhe: "Programada conforme o cadastro do equipamento.",
    data: null,
  },
];

const DOCUMENTOS = [
  { id: "nf", nome: "Nota fiscal", detalhe: `Emitida em ${formatarData(new Date("2025-12-02T12:00:00Z"))}` },
  { id: "manual", nome: "Manual do fabricante", detalhe: "PDF · Linha 21L" },
  { id: "os", nome: "Ordem de serviço", detalhe: `Concluída em ${formatarData(new Date("2026-08-02T12:00:00Z"))}` },
  { id: "laudo", nome: "Registro da preventiva", detalhe: `Atualizado em ${formatarData(new Date("2026-05-18T12:00:00Z"))}` },
];

type Aba = "resumo" | "historico" | "documentos";

const ABAS: { chave: Aba; rotulo: string; icone: React.ComponentType<{ className?: string }> }[] = [
  { chave: "resumo", rotulo: "Resumo", icone: LayoutDashboard },
  { chave: "historico", rotulo: "Histórico", icone: History },
  { chave: "documentos", rotulo: "Documentos", icone: FileText },
];

export function PainelDemonstracaoProntuario() {
  const [aba, setAba] = useState<Aba>("resumo");

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-graf-200 bg-white shadow-[0_30px_80px_-36px_rgba(0,0,0,0.35)]">
      <div className="flex flex-col gap-4 border-b border-graf-200 bg-graf-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-center gap-2 text-[0.78rem] font-bold text-warn-700">
          <FlaskConical className="size-4" aria-hidden />
          Demonstração com dados ilustrativos
        </p>

        <div role="tablist" aria-label="Partes do prontuário" className="flex flex-wrap gap-1.5">
          {ABAS.map((item) => {
            const Icone = item.icone;
            return (
              <button
                key={item.chave}
                type="button"
                role="tab"
                id={`demo-aba-${item.chave}`}
                aria-selected={aba === item.chave}
                aria-controls={`demo-painel-${item.chave}`}
                onClick={() => setAba(item.chave)}
                className={cn(
                  "inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors pointer-coarse:min-h-11",
                  aba === item.chave
                    ? "bg-graf-950 text-white"
                    : "bg-white text-graf-600 ring-1 ring-inset ring-graf-200 hover:bg-graf-100",
                )}
              >
                <Icone className="size-3.5" aria-hidden />
                {item.rotulo}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-5 sm:p-6 lg:p-7">
        <div
          role="tabpanel"
          id="demo-painel-resumo"
          aria-labelledby="demo-aba-resumo"
          hidden={aba !== "resumo"}
        >
          <CabecalhoDoProntuario resumo={RESUMO} className="border-graf-200" />
        </div>

        <div
          role="tabpanel"
          id="demo-painel-historico"
          aria-labelledby="demo-aba-historico"
          hidden={aba !== "historico"}
        >
          <LinhaDoTempo eventos={HISTORICO} />
        </div>

        <div
          role="tabpanel"
          id="demo-painel-documentos"
          aria-labelledby="demo-aba-documentos"
          hidden={aba !== "documentos"}
        >
          <ul className="divide-y divide-graf-100 overflow-hidden rounded-xl border border-graf-200">
            {DOCUMENTOS.map((documento) => (
              <li key={documento.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3.5">
                <span className="text-sm font-bold text-graf-900">{documento.nome}</span>
                <span className="text-xs text-graf-500">{documento.detalhe}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Mantido para páginas/links antigos; na home o painel é incorporado à Área da Clínica. */
export function DemonstracaoDoProntuario() {
  return (
    <Secao fundo="clara" espaco="lg" separador>
      <div className="mx-auto max-w-4xl">
        <p className="sobretitulo">Prontuário Técnico JB</p>
        <h2 className="mt-3 text-section text-graf-950">A ficha viva do equipamento</h2>
        <p className="texto-guia mt-4 max-w-2xl text-graf-600">
          Um exemplo navegável de como compra, manutenção e documentos ficam ligados à mesma máquina.
        </p>
        <div className="mt-8">
          <PainelDemonstracaoProntuario />
        </div>
        <div className="mt-6">
          <LinkBotao href="/cadastro">Criar conta da clínica</LinkBotao>
        </div>
      </div>
    </Secao>
  );
}
