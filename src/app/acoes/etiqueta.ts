"use server";

import { headers } from "next/headers";

import { sessaoCliente } from "@/lib/auth-cliente";
import { armazenamentoEmMemoria, checarLimiteEm, chaveDeIp } from "@/lib/limite";
import { detectarTipo } from "@/lib/midia-real";
import { lerEtiqueta } from "@/lib/ocr";
import { AVISO_DE_CONFERENCIA, LIMITE_DO_OCR } from "@/lib/ocr/interpretar";
import type { CamposDaEtiqueta, MotivoDaFalha } from "@/lib/ocr/tipos";
import { EXPLICACAO_DA_FALHA } from "@/lib/ocr/tipos";
import { ipDoPedido } from "@/lib/seguranca";

/* ============================================================================
   Leitura de etiqueta — a ação

   Ela lê e devolve. **Não grava nada.** Nenhum caminho deste arquivo escreve
   no banco, e é por isso que ele pode ser chamado a partir de um formulário
   que ainda não existe como registro.

   A foto não é armazenada. Ela chega, é lida e é descartada — o que evita a
   pergunta "onde foi parar a foto da etiqueta do cliente" e evita o custo de
   guardar imagem que ninguém vai olhar de novo.

   O limite de taxa é o mesmo mecanismo do resto do projeto, e existe por dois
   motivos: custo por leitura num provedor pago, e o padrão de uso que a tela
   induz — quem não gosta do resultado tira outra foto, e outra.
   ============================================================================ */

export type SugestaoDaEtiqueta =
  | {
      ok: true;
      campos: CamposDaEtiqueta;
      mecanismo: string;
      aviso: string;
      limite: string;
    }
  | { ok: false; motivo: MotivoDaFalha; texto: string };

/** Seis leituras por minuto por IP. O suficiente para tentar de novo com
 *  outra luz, e pouco para virar conta. */
const LIMITE = { janelaMs: 60_000, limite: 6 };

export async function lerEtiquetaDaFoto(formData: FormData): Promise<SugestaoDaEtiqueta> {
  const arquivo = formData.get("foto");

  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, motivo: "imagem_ilegivel", texto: "Nenhuma foto foi enviada." };
  }

  const cabecalhos = await headers();
  const cliente = await sessaoCliente();

  /* A chave prefere a sessão: um consultório inteiro atrás do mesmo IP não
     pode ficar sem leitura porque uma pessoa tentou seis vezes. */
  const chave = cliente ? `ocr:cliente:${cliente.id}` : chaveDeIp(ipDoPedido(cabecalhos), "ocr");

  const limite = await checarLimiteEm(armazenamentoEmMemoria, chave, LIMITE);
  if (!limite.ok) {
    return {
      ok: false,
      motivo: "limite_atingido",
      texto: EXPLICACAO_DA_FALHA.limite_atingido,
    };
  }

  const bytes = Buffer.from(await arquivo.arrayBuffer());

  /* Tipo real pelos bytes, e não pelo que o navegador declarou — o mesmo
     cuidado do envio de mídia da fase 9. Um arquivo que se diz JPEG e não é
     nunca chega ao provedor. */
  const tipo = detectarTipo(bytes);
  if (tipo.especie !== "foto") {
    return {
      ok: false,
      motivo: "imagem_ilegivel",
      texto: "O arquivo enviado não é uma imagem.",
    };
  }

  const leitura = await lerEtiqueta(bytes, tipo.mime);

  if (!leitura.ok) {
    return { ok: false, motivo: leitura.motivo, texto: EXPLICACAO_DA_FALHA[leitura.motivo] };
  }

  return {
    ok: true,
    campos: leitura.campos,
    mecanismo: leitura.mecanismo,
    aviso: AVISO_DE_CONFERENCIA,
    limite: LIMITE_DO_OCR,
  };
}
