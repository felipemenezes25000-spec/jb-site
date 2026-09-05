"use client";

import { CircleCheck } from "lucide-react";

import { concluirOrdemDeServico } from "@/app/acoes/admin-servico";
import { AnexoUnico } from "@/components/admin/servico/anexos";
import { AreaAcao, CampoAcao } from "@/components/admin/servico/campos";
import { Oculto } from "@/components/admin/servico/formulario";
import { PainelAcao } from "@/components/admin/servico/painel-acao";
import { Marcador } from "@/components/ui/form";
import { paraInputDate } from "@/lib/format";

/* ============================================================================
   Conclusão da ordem de serviço

   Fecha a OS de verdade: recalcula os totais pelos itens, carimba o aceite,
   atualiza o prontuário do equipamento e encerra o chamado de origem.

   Sobre a assinatura: é nome e data digitados por quem recebeu o equipamento,
   não desenho. O registro guarda exatamente isso (`acceptedByName`,
   `acceptedAt`, `acceptedIp`) e a OS impressa diz "recebido por", que é o que
   de fato aconteceu.

   Sobre o laudo: só vira documento na área do cliente quando existe arquivo.
   Sem PDF anexado, o laudo continua vivendo na própria OS — não se cria uma
   linha de documento apontando para o vazio.

   SOBRE O STORAGE: o PDF sobe na pasta `documentos`, que é PRIVADA em
   `@/lib/upload` — o endereço guardado em `storageKey` não abre no navegador.
   O laudo só sai pelas rotas que conferem quem está pedindo:
   /admin/documentos/[id]/baixar para a equipe e /minha-jb/documentos/[id]/baixar
   para o cliente dono. Não troque esta pasta por uma pública: o laudo traz nome
   e endereço de clínica, e a URL voltaria a ser a única barreira.
   ============================================================================ */

export function ConcluirOS({
  ordemId,
  numero,
  diagnostico,
  servicoExecutado,
  testeFinal,
  garantiaDias,
  temChamado,
  temItens,
}: {
  ordemId: string;
  numero: string;
  diagnostico: string;
  servicoExecutado: string;
  testeFinal: string;
  garantiaDias: number | null;
  temChamado: boolean;
  temItens: boolean;
}) {
  return (
    <PainelAcao
      rotulo="Concluir OS"
      icone={<CircleCheck className="size-4" aria-hidden />}
      variante="primario"
      tamanho="md"
      titulo={`Concluir a OS ${numero}`}
      descricao="Confirme o que foi feito e quem recebeu o equipamento."
      acao={concluirOrdemDeServico}
      rotuloConfirmar="Concluir e encerrar"
      tamanhoPainel="lg"
    >
      <div className="space-y-4">
        <Oculto nome="ordemId" valor={ordemId} />

        {!temItens ? (
          <p className="rounded-lg bg-warn-50 px-3 py-2.5 text-sm text-warn-700 ring-1 ring-inset ring-warn-500/25">
            Nenhum item lançado: a OS será concluída com total de R$ 0,00. Se houve peça,
            mão de obra ou deslocamento, lance antes de fechar.
          </p>
        ) : null}

        <AreaAcao
          rotulo="Diagnóstico"
          name="diagnostico"
          rows={3}
          defaultValue={diagnostico}
          ajuda="Causa encontrada. Vai para o laudo e para a OS impressa."
        />

        <AreaAcao
          rotulo="Serviço executado"
          name="servicoExecutado"
          rows={3}
          defaultValue={servicoExecutado}
          ajuda="O que foi feito e o que foi trocado."
        />

        <AreaAcao
          rotulo="Teste final"
          name="testeFinal"
          rows={2}
          defaultValue={testeFinal}
          ajuda="Como o equipamento foi testado antes da entrega."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoAcao
            rotulo="Garantia do serviço (dias)"
            name="garantiaDias"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            defaultValue={garantiaDias ?? ""}
            ajuda="Deixe em branco se não há garantia acordada."
          />
          <CampoAcao
            rotulo="Data do aceite"
            name="aceiteData"
            type="date"
            defaultValue={paraInputDate(new Date())}
          />
        </div>

        <CampoAcao
          rotulo="Recebido por (nome de quem assinou)"
          name="aceiteNome"
          required
          maxLength={180}
          autoComplete="off"
          placeholder="Nome completo do responsável na clínica"
          ajuda="Nome e data conferidos na entrega. Não é assinatura digitalizada."
        />

        <AreaAcao
          rotulo="Observação do encerramento"
          name="nota"
          rows={2}
          ajuda="Aparece no histórico da OS."
        />

        <AnexoUnico
          prefixo="laudo"
          pasta="documentos"
          rotulo="Laudo assinado (PDF)"
          aceita="application/pdf"
          ajuda="Opcional. Com arquivo, o laudo aparece nos documentos do cliente; sem arquivo, fica só nesta OS."
        />

        {temChamado ? (
          <Marcador
            name="encerrarChamado"
            defaultChecked
            rotulo="Encerrar também o chamado de origem"
            ajuda="O cliente recebe o aviso de conclusão na área Área da Clínica."
          />
        ) : null}
      </div>
    </PainelAcao>
  );
}
