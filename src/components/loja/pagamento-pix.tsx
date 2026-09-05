"use client";

import { useEffect, useState } from "react";
import { Clock, QrCode, Smartphone } from "lucide-react";

import { Aviso } from "@/components/ui/aviso";
import { BotaoCopiar } from "@/components/ui/copiar";
import { Etiqueta } from "@/components/ui/data";
import { formatarDataHora, formatarPreco } from "@/lib/format";

/* ============================================================================
   Pix

   Sobre a imagem do QR: quem gera é o provedor. Se ele devolver a figura
   pronta (data URI em base64), ela é exibida; se devolver só o payload
   copia-e-cola, mostramos o código com botão de copiar e não desenhamos
   nada — inventar um QR a partir do texto exigiria uma biblioteca nova, e um
   QR errado na tela é pior que nenhum QR.

   O relógio só existe no navegador: renderizar "faltam 12 min" no servidor
   daria diferença na hidratação e um número velho já na primeira pintura.
   ============================================================================ */

/** Explicação curta usada na etapa de pagamento do checkout. */
export function ResumoPix() {
  return (
    <div className="rounded-xl border border-graf-200 bg-graf-50 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-graf-900">
        <Smartphone className="size-4 shrink-0 text-graf-500" aria-hidden />
        Como funciona o Pix aqui
      </p>
      <ol className="mt-3 space-y-2 text-sm leading-relaxed text-graf-700">
        <li className="flex gap-2">
          <span className="label-mono shrink-0 text-graf-500">1</span>
          Ao finalizar, abrimos a cobrança e mostramos o código na página do pedido.
        </li>
        <li className="flex gap-2">
          <span className="label-mono shrink-0 text-graf-500">2</span>
          Você paga pelo app do banco — o código vale por tempo limitado.
        </li>
        <li className="flex gap-2">
          <span className="label-mono shrink-0 text-graf-500">3</span>
          A confirmação chega sozinha e o pedido muda de status na mesma página.
        </li>
      </ol>
      <p className="mt-3 text-xs leading-relaxed text-graf-500">
        Se o código expirar, dá para gerar outro na página do pedido sem refazer nada.
      </p>
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
      <p className="flex items-center gap-2 text-sm text-graf-500">
        <Clock className="size-4 shrink-0" aria-hidden />
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
      <Clock className="size-4 shrink-0" aria-hidden />
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
}: {
  /** Imagem pronta do provedor. Só é usada quando vem como data URI. */
  qrCode: string | null;
  copiaECola: string | null;
  expiraEm: string | null;
  valorCents: number;
}) {
  const imagem = qrCode && qrCode.startsWith("data:image") ? qrCode : null;

  if (!imagem && !copiaECola) {
    return (
      <Aviso tom="atencao" titulo="Código Pix ainda não disponível">
        A cobrança foi aberta, mas o provedor não devolveu o código. Atualize a página em alguns
        segundos — se continuar assim, gere uma nova cobrança abaixo.
      </Aviso>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
      {imagem ? (
        <div className="mx-auto w-fit rounded-xl border border-graf-200 bg-white p-3 shadow-card sm:mx-0">
          {/* data URI: o otimizador do next/image não tem o que fazer aqui */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagem}
            alt="QR Code para pagar este pedido por Pix"
            width={200}
            height={200}
            className="size-[200px] object-contain"
          />
        </div>
      ) : (
        <div className="mx-auto flex size-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-graf-300 bg-graf-50 p-4 text-center sm:mx-0">
          <QrCode className="size-7 text-graf-500" aria-hidden />
          <p className="text-xs leading-relaxed text-graf-500">
            Este provedor entrega só o código copia-e-cola. Use a opção “Pix copia e cola” no app
            do seu banco.
          </p>
        </div>
      )}

      <div className="min-w-0">
        <p className="text-sm text-graf-600">
          Valor a pagar
          <span className="ml-2 text-lg font-extrabold tabular text-graf-950">
            {formatarPreco(valorCents)}
          </span>
        </p>

        {expiraEm ? (
          <div className="mt-2">
            <ContagemRegressiva expiraEm={expiraEm} />
          </div>
        ) : null}

        {copiaECola ? (
          <div className="mt-4">
            <p className="mb-1.5 text-sm font-semibold text-graf-800">Pix copia e cola</p>
            <code className="block max-h-24 overflow-y-auto break-all rounded-lg border border-graf-200 bg-graf-50 p-3 text-xs leading-relaxed text-graf-700">
              {copiaECola}
            </code>
            <div className="mt-3">
              <BotaoCopiar
                texto={copiaECola}
                rotulo="Copiar código Pix"
                rotuloCopiado="Código copiado"
                variante="primario"
                tamanho="md"
              />
            </div>
          </div>
        ) : null}

        <ol className="mt-5 space-y-1.5 text-sm leading-relaxed text-graf-600">
          <li>1. Abra o app do seu banco e escolha Pix.</li>
          <li>2. {imagem ? "Leia o QR Code ou cole o código." : "Use “Pix copia e cola”."}</li>
          <li>3. Confirme o valor e conclua.</li>
        </ol>

        <p className="mt-4">
          <Etiqueta tom="andamento" ponto>
            Esta página atualiza sozinha quando o pagamento cair
          </Etiqueta>
        </p>
      </div>
    </div>
  );
}
