"use client";

import { useActionState, useState } from "react";
import {
  Banknote,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  MapPin,
  PackageCheck,
  QrCode,
  Truck,
  UserRound,
} from "lucide-react";

import { finalizarCheckout, type EstadoCheckout } from "@/app/acoes/checkout";

export type DadosCheckout = {
  nome: string;
  email: string;
  telefone: string;
  tipo: "fisica" | "juridica";
  documento: string;
  empresa: string;
};

const inicial: EstadoCheckout = {};
const input =
  "h-12 w-full rounded-xl border border-graf-300 bg-white px-4 text-sm text-graf-950 outline-none transition placeholder:text-graf-400 hover:border-graf-400 focus:border-jb-500 focus:ring-4 focus:ring-jb-500/10";
const textarea =
  "w-full rounded-xl border border-graf-300 bg-white px-4 py-3 text-sm text-graf-950 outline-none transition placeholder:text-graf-400 hover:border-graf-400 focus:border-jb-500 focus:ring-4 focus:ring-jb-500/10";

function TituloBloco({
  numero,
  titulo,
  descricao,
  icone: Icone,
}: {
  numero: string;
  titulo: string;
  descricao: string;
  icone: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="mb-6 flex gap-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-jb-50 text-jb-700 ring-1 ring-inset ring-jb-100">
        <Icone className="size-5" />
      </span>
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-jb-600">
          Etapa {numero}
        </p>
        <h2 className="mt-1 text-xl font-extrabold tracking-[-0.03em] text-graf-950">{titulo}</h2>
        <p className="mt-1 text-sm leading-6 text-graf-600">{descricao}</p>
      </div>
    </div>
  );
}

export function FormCheckout({ dados }: { dados: DadosCheckout }) {
  const [estado, acao, pendente] = useActionState(finalizarCheckout, inicial);
  const [entrega, setEntrega] = useState<"retirada" | "sob_orcamento">("retirada");
  const [pagamento, setPagamento] = useState<"pix" | "cartao" | "boleto">("pix");

  return (
    <form action={acao} className="space-y-6">
      {estado.erro ? (
        <div
          role="alert"
          className="rounded-2xl border border-jb-200 bg-jb-50 px-5 py-4 text-sm font-semibold leading-6 text-jb-800"
        >
          {estado.erro}
        </div>
      ) : null}

      <section className="rounded-2xl border border-graf-200 bg-white p-5 shadow-card sm:p-7 lg:p-8">
        <TituloBloco
          numero="01"
          titulo="Dados do comprador"
          descricao="Essas informações identificam o pedido e permitem que a equipe da JB fale com você quando necessário."
          icone={UserRound}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-graf-800">Nome completo</span>
            <input name="nome" required autoComplete="name" defaultValue={dados.nome} className={input} />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold text-graf-800">E-mail</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={dados.email}
              className={input}
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold text-graf-800">Telefone / WhatsApp</span>
            <input
              name="telefone"
              required
              autoComplete="tel"
              defaultValue={dados.telefone}
              className={input}
              placeholder="(11) 99999-9999"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold text-graf-800">Tipo de cadastro</span>
            <select name="tipo" defaultValue={dados.tipo} className={input}>
              <option value="fisica">Pessoa física</option>
              <option value="juridica">Pessoa jurídica / clínica</option>
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold text-graf-800">CPF ou CNPJ</span>
            <input
              name="documento"
              defaultValue={dados.documento}
              className={input}
              placeholder="Informe se aplicável"
            />
          </label>

          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-graf-800">Clínica / razão social</span>
            <span className="relative block">
              <Building2
                className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-graf-400"
                aria-hidden
              />
              <input
                name="empresa"
                defaultValue={dados.empresa}
                className={`${input} pl-11`}
                placeholder="Se aplicável"
              />
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-graf-200 bg-white p-5 shadow-card sm:p-7 lg:p-8">
        <TituloBloco
          numero="02"
          titulo="Como você quer receber"
          descricao="Escolha retirada ou solicite uma análise de entrega. Nada de frete inventado: a logística é confirmada antes do pagamento quando precisar de cotação."
          icone={Truck}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <label
            className={`cursor-pointer rounded-2xl border p-5 transition ${
              entrega === "retirada"
                ? "border-jb-400 bg-jb-50/60 ring-2 ring-jb-500/10"
                : "border-graf-200 hover:border-graf-300"
            }`}
          >
            <input
              type="radio"
              name="entrega"
              value="retirada"
              checked={entrega === "retirada"}
              onChange={() => setEntrega("retirada")}
              className="sr-only"
            />
            <div className="flex items-start justify-between gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-white text-jb-700 shadow-card">
                <PackageCheck className="size-5" aria-hidden />
              </span>
              {entrega === "retirada" ? <CheckCircle2 className="size-5 text-jb-600" aria-hidden /> : null}
            </div>
            <p className="mt-4 text-sm font-extrabold text-graf-950">Retirar na JB</p>
            <p className="mt-2 text-xs leading-5 text-graf-600">
              A equipe confirma quando o pedido estiver pronto e passa as orientações de retirada.
            </p>
          </label>

          <label
            className={`cursor-pointer rounded-2xl border p-5 transition ${
              entrega === "sob_orcamento"
                ? "border-jb-400 bg-jb-50/60 ring-2 ring-jb-500/10"
                : "border-graf-200 hover:border-graf-300"
            }`}
          >
            <input
              type="radio"
              name="entrega"
              value="sob_orcamento"
              checked={entrega === "sob_orcamento"}
              onChange={() => setEntrega("sob_orcamento")}
              className="sr-only"
            />
            <div className="flex items-start justify-between gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-white text-jb-700 shadow-card">
                <Truck className="size-5" aria-hidden />
              </span>
              {entrega === "sob_orcamento" ? <CheckCircle2 className="size-5 text-jb-600" aria-hidden /> : null}
            </div>
            <p className="mt-4 text-sm font-extrabold text-graf-950">Entrega a combinar</p>
            <p className="mt-2 text-xs leading-5 text-graf-600">
              A JB analisa endereço, equipamento e necessidade de instalação antes de fechar a logística.
            </p>
          </label>
        </div>

        {entrega === "sob_orcamento" ? (
          <div className="mt-6 rounded-2xl border border-graf-200 bg-graf-50/70 p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2.5">
              <MapPin className="size-4.5 text-jb-600" aria-hidden />
              <p className="text-sm font-extrabold text-graf-950">Endereço de entrega</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-bold text-graf-800">CEP</span>
                <input name="cep" autoComplete="postal-code" required className={input} />
              </label>
              <label>
                <span className="mb-2 block text-sm font-bold text-graf-800">Cidade</span>
                <input name="cidade" autoComplete="address-level2" required className={input} />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-2 block text-sm font-bold text-graf-800">Endereço</span>
                <input name="endereco" autoComplete="street-address" required className={input} />
              </label>
              <label>
                <span className="mb-2 block text-sm font-bold text-graf-800">Número</span>
                <input name="numero" required className={input} />
              </label>
              <label>
                <span className="mb-2 block text-sm font-bold text-graf-800">Complemento</span>
                <input name="complemento" className={input} />
              </label>
              <label>
                <span className="mb-2 block text-sm font-bold text-graf-800">Bairro</span>
                <input name="bairro" className={input} />
              </label>
              <label>
                <span className="mb-2 block text-sm font-bold text-graf-800">UF</span>
                <input name="estado" maxLength={2} autoComplete="address-level1" required className={input} />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-2 block text-sm font-bold text-graf-800">Referência</span>
                <input name="referencia" className={input} placeholder="Opcional" />
              </label>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-graf-200 bg-white p-5 shadow-card sm:p-7 lg:p-8">
        <TituloBloco
          numero="03"
          titulo="Preferência de pagamento"
          descricao="Selecione como prefere pagar. Nenhuma cobrança é feita nesta tela; a forma e as instruções de pagamento são confirmadas depois que o pedido estiver registrado."
          icone={CreditCard}
        />

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { valor: "pix" as const, titulo: "Pix", texto: "Receba as instruções para pagamento.", Icone: QrCode },
            { valor: "cartao" as const, titulo: "Cartão", texto: "Condições confirmadas pela equipe.", Icone: CreditCard },
            { valor: "boleto" as const, titulo: "Boleto", texto: "Disponibilidade confirmada no pedido.", Icone: Banknote },
          ].map(({ valor, titulo, texto, Icone }) => (
            <label
              key={valor}
              className={`cursor-pointer rounded-2xl border p-4 transition ${
                pagamento === valor
                  ? "border-jb-400 bg-jb-50/60 ring-2 ring-jb-500/10"
                  : "border-graf-200 hover:border-graf-300"
              }`}
            >
              <input
                type="radio"
                name="pagamento"
                value={valor}
                checked={pagamento === valor}
                onChange={() => setPagamento(valor)}
                className="sr-only"
              />
              <div className="flex items-center justify-between gap-3">
                <Icone className="size-5 text-jb-600" aria-hidden />
                {pagamento === valor ? <CheckCircle2 className="size-4.5 text-jb-600" aria-hidden /> : null}
              </div>
              <p className="mt-3 text-sm font-extrabold text-graf-950">{titulo}</p>
              <p className="mt-1 text-[11px] leading-5 text-graf-500">{texto}</p>
            </label>
          ))}
        </div>

        <label className="mt-6 block border-t border-graf-100 pt-6">
          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-graf-800">
            <FileText className="size-4 text-graf-400" aria-hidden />
            Observações do pedido
          </span>
          <textarea
            name="observacao"
            rows={4}
            className={textarea}
            placeholder="Ex.: horário preferencial para contato, necessidade de instalação ou outra informação importante."
          />
        </label>
      </section>

      <div className="rounded-2xl bg-graf-950 p-5 text-white sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-extrabold text-white">Pronto para registrar o pedido?</p>
            <p className="mt-1 text-xs leading-5 text-graf-400">
              Ao continuar, a JB recebe a solicitação e confirma os próximos passos de logística e pagamento conforme a opção escolhida.
            </p>
          </div>
          <button
            type="submit"
            disabled={pendente}
            className="inline-flex h-13 shrink-0 items-center justify-center gap-2 rounded-xl bg-jb-600 px-7 text-sm font-extrabold text-white transition hover:bg-jb-500 disabled:cursor-wait disabled:opacity-60"
          >
            {pendente ? "Registrando pedido…" : "Criar pedido"}
            {!pendente ? <PackageCheck className="size-4.5" aria-hidden /> : null}
          </button>
        </div>
      </div>
    </form>
  );
}
