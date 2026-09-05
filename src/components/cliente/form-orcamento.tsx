"use client";

import { useActionState } from "react";
import { CheckCircle2, FileCheck2, Send } from "lucide-react";

import { solicitarOrcamento, type EstadoOrcamento } from "@/app/acoes/orcamento";

const inicial: EstadoOrcamento = {};
const input =
  "h-12 w-full rounded-xl border border-graf-300 bg-white px-4 text-sm text-graf-950 outline-none transition placeholder:text-graf-400 hover:border-graf-400 focus:border-jb-500 focus:ring-4 focus:ring-jb-500/10";

export function FormOrcamento({ produto = "" }: { produto?: string }) {
  const [estado, acao, pendente] = useActionState(solicitarOrcamento, inicial);

  if (estado.ok) {
    return (
      <div className="rounded-[1.75rem] border border-ok-500/20 bg-white p-7 text-center shadow-raised sm:p-9">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-ok-50 text-ok-700">
          <CheckCircle2 className="size-7" aria-hidden />
        </span>
        <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.15em] text-ok-700">Recebido pela JB</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-graf-950">Sua solicitação foi enviada.</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-graf-600">{estado.ok}</p>
        {estado.protocolo ? (
          <p className="mx-auto mt-5 inline-flex rounded-lg bg-graf-100 px-3 py-2 label-mono text-graf-700">
            Referência {estado.protocolo}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={acao} className="rounded-[1.75rem] border border-graf-200 bg-white p-5 shadow-raised sm:p-7 lg:p-8">
      <div className="flex items-start gap-4 border-b border-graf-100 pb-6">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-jb-50 text-jb-600">
          <FileCheck2 className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-jb-600">Solicitação comercial</p>
          <h2 className="mt-1 text-xl font-extrabold tracking-[-0.03em] text-graf-950">Conte o que sua clínica precisa.</h2>
          <p className="mt-1 text-sm leading-6 text-graf-600">A equipe usa essas informações para entender a demanda antes de responder.</p>
        </div>
      </div>

      {estado.erro ? (
        <div role="alert" className="mt-5 rounded-xl border border-jb-200 bg-jb-50 px-4 py-3 text-sm font-semibold text-jb-800">
          {estado.erro}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-2 block text-sm font-bold text-graf-800">Nome</span>
          <input name="nome" required autoComplete="name" className={input} />
        </label>
        <label>
          <span className="mb-2 block text-sm font-bold text-graf-800">E-mail</span>
          <input name="email" type="email" required autoComplete="email" className={input} />
        </label>
        <label>
          <span className="mb-2 block text-sm font-bold text-graf-800">Telefone / WhatsApp</span>
          <input name="telefone" required autoComplete="tel" className={input} placeholder="(11) 99999-9999" />
        </label>
        <label>
          <span className="mb-2 block text-sm font-bold text-graf-800">O que você precisa?</span>
          <select name="assunto" defaultValue={produto ? "equipamento" : "equipamento"} className={input}>
            <option value="equipamento">Equipamento</option>
            <option value="peca">Peça ou acessório</option>
            <option value="assistencia">Assistência técnica</option>
            <option value="outro">Outra necessidade</option>
          </select>
        </label>
        <label>
          <span className="mb-2 block text-sm font-bold text-graf-800">Produto de interesse</span>
          <input name="produto" defaultValue={produto} className={input} placeholder="Opcional" />
        </label>
        <label className="sm:col-span-2">
          <span className="mb-2 block text-sm font-bold text-graf-800">Detalhes</span>
          <textarea
            name="mensagem"
            required
            rows={6}
            className="w-full rounded-xl border border-graf-300 bg-white px-4 py-3 text-sm text-graf-950 outline-none transition placeholder:text-graf-400 hover:border-graf-400 focus:border-jb-500 focus:ring-4 focus:ring-jb-500/10"
            placeholder="Ex.: equipamento desejado, quantidade, cidade, se precisa de instalação, peça específica ou problema que precisa resolver."
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={pendente}
        className="mt-6 inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-jb-600 px-6 text-sm font-extrabold text-white transition hover:bg-jb-500 disabled:cursor-wait disabled:opacity-60"
      >
        {pendente ? "Enviando…" : "Enviar solicitação"}
        {!pendente ? <Send className="size-4" aria-hidden /> : null}
      </button>
      <p className="mt-3 text-center text-[11px] leading-5 text-graf-500">O envio não gera cobrança nem compromisso de compra.</p>
    </form>
  );
}
