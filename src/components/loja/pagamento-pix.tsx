"use client";

import { useEffect, useState } from "react";
import { Clock, FlaskConical, QrCode, Smartphone } from "lucide-react";

import { Aviso } from "@/components/ui/aviso";
import { BotaoCopiar } from "@/components/ui/copiar";
import { Etiqueta } from "@/components/ui/data";
import { formatarDataHora, formatarPreco } from "@/lib/format";

function PassosDoPix({ passos }: { passos: string[] }) {
  return (
    <ol className="space-y-3 text-sm leading-relaxed text-graf-700">
      {passos.map((passo, i) => (
        <li key={passo} className="flex min-w-0 gap-3">
          <span aria-hidden className="tabular flex size-6 shrink-0 items-center justify-center rounded-full border border-jb-200 bg-white text-xs font-extrabold text-jb-600">
            {i + 1}
          </span>
          <span className="min-w-0 pt-0.5">{passo}</span>
        </li>
      ))}
    </ol>
  );
}

export function ResumoPix({ simulado }: { simulado?: boolean }) {
  const passos = [
    "Você confirma o pedido e o código Pix aparece na página do pedido.",
    "Paga pelo app do banco, lendo o QR Code ou colando o código.",
    "A confirmação chega sozinha e a página do pedido se atualiza.",
  ];

  return (
    <div className="min-w-0 rounded-xl border border-graf-200 bg-graf-50 p-4 sm:p-5">
      <p className="flex items-center gap-2 text-base font-bold text-graf-950">
        <Smartphone className="size-[18px] shrink-0 text-graf-500" aria-hidden />
        Como funciona o Pix aqui
      </p>
      <div className="mt-4"><PassosDoPix passos={passos} /></div>
      <p className="mt-4 text-sm leading-relaxed text-graf-600">
        O código vale por tempo limitado. Se expirar, você gera outro na própria página do pedido, sem refazer a compra.
      </p>
      {simulado ? (
        <p className="mt-4 flex items-start gap-2.5 border-t border-graf-200 pt-4 text-sm leading-relaxed text-warn-700">
          <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span><strong className="font-bold">Nesta demonstração</strong>, o código Pix é de exemplo e não gera cobrança real.</span>
        </p>
      ) : null}
    </div>
  );
}

function restante(ate: number) {
  return Math.max(0, ate - Date.now());
}

function emMinutos(ms: number) {
  const total = Math.floor(ms / 1000);
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = total % 60;
  const doisDigitos = (n: number) => String(n).padStart(2, "0");
  return horas > 0 ? `${horas}h ${doisDigitos(minutos)}min` : `${doisDigitos(minutos)}:${doisDigitos(segundos)}`;
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
  if (ms === null) {
    return <p className="flex min-w-0 items-center gap-2 text-sm text-graf-600"><Clock className="size-4 shrink-0 text-graf-500" aria-hidden /><span className="min-w-0">Válido até {formatarDataHora(expiraEm)}</span></p>;
  }
  if (ms === 0) {
    return <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-jb-700"><Clock className="size-4 shrink-0" aria-hidden /><span className="min-w-0">Este código expirou em {formatarDataHora(expiraEm)}</span></p>;
  }

  const acabando = ms < 5 * 60_000;
  return (
    <p className={`flex min-w-0 items-start gap-2 text-sm ${acabando ? "font-semibold text-warn-700" : "text-graf-600"}`}>
      <Clock className={`mt-0.5 size-4 shrink-0 ${acabando ? "" : "text-graf-500"}`} aria-hidden />
      <span className="min-w-0">
        Expira em <span className="tabular">{emMinutos(ms)}</span>
        <span className="text-graf-500"> · {formatarDataHora(expiraEm)}</span>
      </span>
      <span aria-live="polite" className="sr-only">{acabando ? `Faltam ${Math.ceil(ms / 60_000)} minutos para o código expirar.` : ""}</span>
    </p>
  );
}

export function PagamentoPix({
  qrCode,
  copiaECola,
  expiraEm,
  valorCents,
  simulado,
}: {
  qrCode: string | null;
  copiaECola: string | null;
  expiraEm: string | null;
  valorCents: number;
  simulado?: boolean;
}) {
  const imagem = qrCode && qrCode.startsWith("data:image") ? qrCode : null;
  const passos = [
    "Abra o app do seu banco e escolha Pix.",
    imagem ? "Leia o QR Code ou cole o código copia e cola." : "Escolha “Pix copia e cola” e cole o código.",
    "Confira o valor e conclua o pagamento.",
  ];

  if (!imagem && !copiaECola) {
    return (
      <Aviso tom="atencao" titulo="O código Pix ainda não chegou">
        A cobrança foi aberta e o código deve aparecer em alguns segundos. Atualize a página e, se continuar assim, gere uma nova cobrança abaixo.
      </Aviso>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      {simulado ? (
        <Aviso tom="atencao" titulo="Código de demonstração">
          O código abaixo serve apenas para demonstrar a tela e não gera cobrança real.
        </Aviso>
      ) : null}

      <div className="grid min-w-0 gap-6 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:items-start sm:gap-8">
        {imagem ? (
          <div className="mx-auto w-full max-w-56 rounded-xl border border-graf-200 bg-white p-3 sm:mx-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagem} alt="QR Code para pagar este pedido por Pix" width={224} height={224} className="aspect-square h-auto w-full object-contain" />
          </div>
        ) : (
          <div className="mx-auto flex aspect-square w-full max-w-56 flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-graf-300 bg-graf-50 p-4 text-center sm:mx-0">
            <QrCode className="size-7 text-graf-500" aria-hidden />
            <p className="text-apoio leading-relaxed text-graf-600">Esta cobrança não tem QR Code. Use “Pix copia e cola” no app do seu banco.</p>
          </div>
        )}

        <div className="min-w-0">
          <p className="text-sm font-semibold text-graf-600">Valor a pagar</p>
          <p className="mt-0.5 break-words text-[clamp(1.75rem,7vw,2.25rem)] font-extrabold tabular tracking-tight text-graf-950">{formatarPreco(valorCents)}</p>
          {expiraEm ? <div className="mt-2.5"><ContagemRegressiva expiraEm={expiraEm} /></div> : null}

          {copiaECola ? (
            <div className="mt-5 min-w-0">
              <p className="mb-2 text-sm font-semibold text-graf-800">Pix copia e cola</p>
              <code className="block max-h-24 max-w-full overflow-auto break-all rounded-lg border border-graf-200 bg-graf-50 p-3 text-apoio leading-relaxed text-graf-700">{copiaECola}</code>
              <div className="mt-3">
                <BotaoCopiar texto={copiaECola} rotulo="Copiar código Pix" rotuloCopiado="Código copiado" variante="primario" tamanho="md" className="w-full sm:w-auto" />
              </div>
            </div>
          ) : null}

          <div className="mt-6 border-t border-graf-200 pt-5"><PassosDoPix passos={passos} /></div>
          <p className="mt-5"><Etiqueta tom="andamento" ponto>Aguardando o pagamento</Etiqueta></p>
          <p className="mt-2 text-apoio leading-relaxed text-graf-500">A confirmação chega direto do meio de pagamento — não é preciso enviar comprovante.</p>
        </div>
      </div>
    </div>
  );
}
