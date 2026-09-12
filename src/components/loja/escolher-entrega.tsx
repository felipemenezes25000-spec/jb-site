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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
      <div className="space-y-6">
        <section className="border-y border-graf-200 bg-white py-5 sm:rounded-xl sm:border sm:px-5">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-jb-50 text-jb-700">
              <MapPin className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-graf-950">Informe o CEP</h2>
              <p className="mt-1 text-sm leading-5 text-graf-600">
                Veja preço e prazo das modalidades disponíveis para este pedido.
              </p>
            </div>
          </div>

          <form action={consultar} className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-end">
            <div className="w-full sm:max-w-52">
              <CampoCep name="cep" required valorInicial={estado.cep ?? cepInicial ?? ""} buscarEndereco={false} />
            </div>
            <Botao type="submit" carregando={consultando} className="sm:mb-px">
              Calcular entrega
            </Botao>
          </form>

          {estado.erro ? (
            <Aviso tom="atencao" titulo="Não foi possível calcular" className="mt-4">
              {estado.erro}
            </Aviso>
          ) : null}
        </section>

        {estado.opcoes?.length ? (
          <section>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-graf-200 pb-3">
              <h2 className="text-lg font-extrabold text-graf-950">Opções de entrega</h2>
              <p className="text-apoio text-graf-500">Escolha uma para continuar</p>
            </div>

            <div className="overflow-hidden rounded-xl border border-graf-200 bg-white">
              {estado.opcoes.map((opcao, indice) => (
                <form
                  key={opcao.key}
                  action={escolherEntrega}
                  className={indice > 0 ? "border-t border-graf-200" : undefined}
                >
                  <input type="hidden" name="cep" value={estado.cep ?? ""} />
                  <input type="hidden" name="escolha" value={opcao.key} />
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-graf-50 text-graf-600">
                        <Truck className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-graf-950">{opcao.companyName}</p>
                        <p className="mt-0.5 text-apoio text-graf-600">{opcao.serviceName}</p>
                        {opcao.quotedLater ? (
                          <p className="mt-1 text-[0.75rem] font-semibold text-warn-700">
                            Valor confirmado antes do despacho
                          </p>
                        ) : opcao.deliveryDays ? (
                          <p className="mt-1 text-[0.75rem] text-graf-500">
                            até {plural(opcao.deliveryDays, "dia útil", "dias úteis")}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                      <div className="text-right">
                        <p className="text-[0.625rem] font-bold uppercase tracking-[0.07em] text-graf-500">Frete</p>
                        <p className="text-lg font-extrabold tabular text-graf-950">
                          {opcao.quotedLater
                            ? "A combinar"
                            : opcao.priceCents === 0
                              ? "Grátis"
                              : formatarPreco(opcao.priceCents)}
                        </p>
                      </div>
                      <Botao type="submit" tamanho="sm">Escolher</Botao>
                    </div>
                  </div>
                </form>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <aside className="space-y-3 lg:sticky lg:top-28">
        {retiradaDisponivel ? (
          <form action={escolherEntrega} className="rounded-xl border border-graf-200 bg-white p-4">
            <input type="hidden" name="escolha" value="retirada" />
            <div className="flex items-start gap-3">
              <Store className="mt-0.5 size-4 shrink-0 text-jb-700" aria-hidden />
              <div>
                <h2 className="text-sm font-bold text-graf-950">Retirar na JB</h2>
                <p className="mt-1 text-apoio leading-5 text-graf-600">
                  Sem custo de frete. A retirada é combinada após a confirmação do pedido.
                </p>
              </div>
            </div>
            <Botao type="submit" variante="secundario" tamanho="sm" className="mt-3 w-full">
              Escolher retirada
            </Botao>
          </form>
        ) : null}

        <div className="rounded-xl border border-graf-200 bg-surface-muted p-4">
          <PackageCheck className="size-4 text-jb-700" aria-hidden />
          <p className="mt-2 text-sm font-bold text-graf-900">Cotação vinculada ao pedido</p>
          <p className="mt-1 text-apoio leading-5 text-graf-600">
            Peso, dimensões, quantidade e CEP entram no cálculo. O valor escolhido é conferido novamente antes do pagamento.
          </p>
        </div>
      </aside>
    </div>
  );
}
