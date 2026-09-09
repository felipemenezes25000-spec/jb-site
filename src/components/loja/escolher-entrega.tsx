"use client";

import { useActionState } from "react";
import { MapPin, PackageCheck, Store, Truck } from "lucide-react";

import {
  consultarOpcoesEntrega,
  escolherEntrega,
  type EstadoOpcoesEntrega,
} from "@/app/acoes/frete-checkout";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/button";
import { CampoCep } from "@/components/ui/campos-br";
import { formatarPreco, plural } from "@/lib/format";

const INICIAL: EstadoOpcoesEntrega = {};

export function EscolherEntrega({
  retiradaDisponivel,
  cepInicial,
}: {
  retiradaDisponivel: boolean;
  cepInicial?: string;
}) {
  const [estado, consultar, consultando] = useActionState(consultarOpcoesEntrega, INICIAL);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="space-y-6">
        <div className="rounded-2xl border border-graf-200 bg-white p-5 shadow-xs sm:p-7">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-jb-50 text-jb-700">
              <MapPin className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-bold text-graf-950">Para onde vamos enviar?</h2>
              <p className="mt-1 text-sm leading-relaxed text-graf-600">
                Digite o CEP. A JB consulta as transportadoras em tempo real e mostra preço e prazo antes do pagamento.
              </p>
            </div>
          </div>

          <form action={consultar} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full sm:max-w-52">
              <CampoCep name="cep" required valorInicial={estado.cep ?? cepInicial ?? ""} buscarEndereco={false} />
            </div>
            <Botao type="submit" carregando={consultando} className="sm:mb-px">
              Calcular frete
            </Botao>
          </form>

          {estado.erro ? (
            <Aviso tom="atencao" titulo="Não foi possível calcular" className="mt-5">
              {estado.erro}
            </Aviso>
          ) : null}
        </div>

        {estado.opcoes?.length ? (
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-bold text-graf-950">Escolha como quer receber</h2>
              <p className="mt-1 text-sm text-graf-600">
                O checkout recalcula a modalidade escolhida no servidor antes de cobrar.
              </p>
            </div>

            {estado.opcoes.map((opcao) => (
              <form
                key={opcao.key}
                action={escolherEntrega}
                className="rounded-2xl border border-graf-200 bg-white p-5 shadow-xs transition hover:border-jb-300 hover:shadow-card"
              >
                <input type="hidden" name="cep" value={estado.cep ?? ""} />
                <input type="hidden" name="escolha" value={opcao.key} />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-graf-50 text-graf-600">
                      <Truck className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-graf-950">{opcao.companyName}</p>
                      <p className="mt-0.5 text-sm text-graf-600">{opcao.serviceName}</p>
                      {opcao.quotedLater ? (
                        <p className="mt-1 text-xs font-semibold text-warn-700">Valor confirmado pela equipe antes do despacho</p>
                      ) : opcao.deliveryDays ? (
                        <p className="mt-1 text-xs text-graf-500">
                          Prazo estimado: até {plural(opcao.deliveryDays, "dia útil", "dias úteis")}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wider text-graf-500">Frete</p>
                      <p className="text-xl font-extrabold tabular text-graf-950">
                        {opcao.quotedLater
                          ? "A combinar"
                          : opcao.priceCents === 0
                            ? "Grátis"
                            : formatarPreco(opcao.priceCents)}
                      </p>
                    </div>
                    <Botao type="submit">Escolher</Botao>
                  </div>
                </div>
              </form>
            ))}
          </div>
        ) : null}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-28">
        {retiradaDisponivel ? (
          <form action={escolherEntrega} className="rounded-2xl border border-graf-200 bg-white p-5 shadow-xs">
            <input type="hidden" name="escolha" value="retirada" />
            <div className="flex items-start gap-3">
              <Store className="mt-0.5 size-5 shrink-0 text-jb-700" aria-hidden />
              <div>
                <h2 className="font-bold text-graf-950">Retirar na JB</h2>
                <p className="mt-1 text-sm leading-relaxed text-graf-600">
                  Sem custo de frete. A retirada é combinada depois da confirmação do pedido.
                </p>
              </div>
            </div>
            <Botao type="submit" variante="secundario" className="mt-4 w-full">
              Escolher retirada
            </Botao>
          </form>
        ) : null}

        <div className="rounded-2xl bg-graf-950 p-5 text-white">
          <PackageCheck className="size-6 text-white/80" aria-hidden />
          <p className="mt-3 font-bold">Cotação real, não estimativa fixa</p>
          <p className="mt-1 text-sm leading-relaxed text-white/70">
            Peso, dimensões, quantidade, origem e CEP entram no cálculo. O valor é conferido novamente ao fechar a compra.
          </p>
        </div>
      </aside>
    </div>
  );
}
