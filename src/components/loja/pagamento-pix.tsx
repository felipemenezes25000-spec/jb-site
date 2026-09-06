"use client";

import { useEffect, useState } from "react";
import { Clock, FlaskConical, QrCode, Smartphone } from "lucide-react";

import { Aviso } from "@/components/ui/aviso";
import { BotaoCopiar } from "@/components/ui/copiar";
import { Etiqueta } from "@/components/ui/data";
import { formatarDataHora, formatarPreco } from "@/lib/format";

/* ============================================================================
   Pix

   Sobre a imagem do QR: quem gera é o serviço de pagamento. Se ele devolver a
   figura pronta (data URI em base64), ela é exibida; se devolver só o payload
   copia-e-cola, mostramos o código com botão de copiar e não desenhamos
   nada — inventar um QR a partir do texto exigiria uma biblioteca nova, e um
   QR errado na tela é pior que nenhum QR.

   O relógio só existe no navegador: renderizar "faltam 12 min" no servidor
   daria diferença na hidratação e um número velho já na primeira pintura.
   ============================================================================ */

/**
 * Passos numerados do Pix.
 *
 * O mesmo desenho na explicação do checkout e nas instruções da tela do
 * pedido: quem leu no fechamento reconhece a lista na hora de pagar.
 */
function PassosDoPix({ passos }: { passos: string[] }) {
  return (
    <ol className="space-y-3 text-sm leading-relaxed text-graf-700">
      {passos.map((passo, i) => (
        <li key={passo} className="flex gap-3">
          <span
            aria-hidden
            className="tabular flex size-6 shrink-0 items-center justify-center rounded-full border border-jb-200 bg-white text-xs font-extrabold text-jb-600"
          >
            {i + 1}
          </span>
          <span className="min-w-0 pt-0.5">{passo}</span>
        </li>
      ))}
    </ol>
  );
}

/** Explicação curta usada na etapa de pagamento do checkout. */
export function ResumoPix({ simulado }: { simulado?: boolean }) {
  const passos = [
    "Você confirma o pedido e o código Pix aparece na página do pedido.",
    "Paga pelo app do banco, lendo o QR Code ou colando o código.",
    "A confirmação chega sozinha e a página do pedido se atualiza.",
  ];

  return (
    <div className="rounded-xl border border-graf-200 bg-graf-50 p-4 sm:p-5">
      <p className="flex items-center gap-2 text-base font-bold text-graf-950">
        <Smartphone className="size-[18px] shrink-0 text-graf-500" aria-hidden />
        Como funciona o Pix aqui
      </p>

      <div className="mt-4">
        <PassosDoPix passos={passos} />
      </div>

      <p className="mt-4 text-sm leading-relaxed text-graf-600">
        O código vale por tempo limitado. Se expirar, você gera outro na própria página do pedido,
        sem refazer nada.
      </p>

      {simulado ? (
        <p className="mt-4 flex items-start gap-2.5 border-t border-graf-200 pt-4 text-sm leading-relaxed text-warn-700">
          <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <strong className="font-bold">Nesta demonstração</strong>, o código Pix é de exemplo:
            não abre cobrança em banco nenhum e nada é debitado.
          </span>
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------ contagem regressiva */

function restante(ate: number) {
  return Math.max(0, ate - Date.now());
}

function emMinutos(ms: number) {
  const total = Math.floor(ms / 1000);
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = total % 60;
  const doisDigitos = (n: number) => String(n).padStart(2, "0");
  return horas > 0
    ? `${horas}h ${doisDigitos(minutos)}min`
    : `${doisDigitos(minutos)}:${doisDigitos(segundos)}`;
}

export function ContagemRegressiva({ expiraEm }: { expiraEm: string }) {
  const alvo = new Date(expiraEm).getTime();
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(alvo)) return;
    setMs(restante(alvo));
    const relogio = setInterval(() => setMs(restante(alvo)), 1000);
    return () => clearInterval(relogio);
  }, [alvo]);

  if (!Number.isFinite(alvo)) return null;

  // antes do primeiro tique não há número confiável para mostrar
  if (ms === null) {
    return (
      <p className="flex items-center gap-2 text-sm text-graf-600">
        <Clock className="size-4 shrink-0 text-graf-400" aria-hidden />
        Válido até {formatarDataHora(expiraEm)}
      </p>
    );
  }

  if (ms === 0) {
    return (
      <p className="flex items-center gap-2 text-sm font-semibold text-jb-700">
        <Clock className="size-4 shrink-0" aria-hidden />
        Este código expirou em {formatarDataHora(expiraEm)}
      </p>
    );
  }

  const acabando = ms < 5 * 60_000;

  return (
    <p
      className={`flex items-center gap-2 text-sm ${acabando ? "font-semibold text-warn-700" : "text-graf-600"}`}
    >
      <Clock
        className={`size-4 shrink-0 ${acabando ? "" : "text-graf-400"}`}
        aria-hidden
      />
      <span>
        Expira em <span className="tabular">{emMinutos(ms)}</span>
        <span className="text-graf-500"> · {formatarDataHora(expiraEm)}</span>
      </span>
      <span aria-live="polite" className="sr-only">
        {acabando ? `Faltam ${Math.ceil(ms / 60_000)} minutos para o código expirar.` : ""}
      </span>
    </p>
  );
}

/* -------------------------------------------------- bloco da tela do pedido */

export function PagamentoPix({
  qrCode,
  copiaECola,
  expiraEm,
  valorCents,
  simulado,
}: {
  /** Imagem pronta do serviço de pagamento. Só é usada quando vem como data URI. */
  qrCode: string | null;
  copiaECola: string | null;
  expiraEm: string | null;
  valorCents: number;
  /** Loja em demonstração: o código não é uma cobrança de verdade. */
  simulado?: boolean;
}) {
  const imagem = qrCode && qrCode.startsWith("data:image") ? qrCode : null;

  const passos = [
    "Abra o app do seu banco e escolha Pix.",
    imagem
      ? "Leia o QR Code ou cole o código copia e cola."
      : "Escolha “Pix copia e cola” e cole o código.",
    "Confira o valor e conclua o pagamento.",
  ];

  if (!imagem && !copiaECola) {
    return (
      <Aviso tom="atencao" titulo="O código Pix ainda não chegou">
        A cobrança foi aberta e o código deve aparecer em alguns segundos. Atualize a página — se
        continuar assim, gere uma nova cobrança abaixo.
      </Aviso>
    );
  }

  return (
    <div className="space-y-5">
      {simulado ? (
        <Aviso tom="atencao" titulo="Código de demonstração">
          Esta loja está em ambiente de demonstração. O código abaixo serve para mostrar a tela e
          não gera cobrança em banco nenhum — não tente pagar por ele.
        </Aviso>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start sm:gap-8">
        {imagem ? (
          <div className="mx-auto w-fit rounded-xl border border-graf-200 bg-white p-3 sm:mx-0">
            {/* data URI: o otimizador do next/image não tem o que fazer aqui */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagem}
              alt="QR Code para pagar este pedido por Pix"
              width={224}
              height={224}
              className="size-[224px] object-contain"
            />
          </div>
        ) : (
          <div className="mx-auto flex size-[224px] flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-graf-300 bg-graf-50 p-4 text-center sm:mx-0">
            <QrCode className="size-7 text-graf-500" aria-hidden />
            <p className="text-[0.8125rem] leading-relaxed text-graf-600">
              Esta cobrança não tem QR Code. Use a opção “Pix copia e cola” no app do seu banco.
            </p>
          </div>
        )}

        <div className="min-w-0">
          <p className="text-sm font-semibold text-graf-600">Valor a pagar</p>
          <p className="mt-0.5 text-3xl font-extrabold tabular tracking-tight text-graf-950">
            {formatarPreco(valorCents)}
          </p>

          {expiraEm ? (
            <div className="mt-2.5">
              <ContagemRegressiva expiraEm={expiraEm} />
            </div>
          ) : null}

          {copiaECola ? (
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold text-graf-800">Pix copia e cola</p>
              <code className="block max-h-24 overflow-y-auto break-all rounded-lg border border-graf-200 bg-graf-50 p-3 text-[0.8125rem] leading-relaxed text-graf-700">
                {copiaECola}
              </code>
              <div className="mt-3">
                <BotaoCopiar
                  texto={copiaECola}
                  rotulo="Copiar código Pix"
                  rotuloCopiado="Código copiado"
                  variante="primario"
                  tamanho="md"
                  className="w-full sm:w-auto"
                />
              </div>
            </div>
          ) : null}

          <div className="mt-6 border-t border-graf-200 pt-5">
            <PassosDoPix passos={passos} />
          </div>

          <p className="mt-5">
            <Etiqueta tom="andamento" ponto>
              Aguardando o pagamento
            </Etiqueta>
          </p>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-graf-500">
            A confirmação chega direto do meio de pagamento — não é preciso enviar comprovante.
          </p>
        </div>
      </div>
    </div>
  );
}
