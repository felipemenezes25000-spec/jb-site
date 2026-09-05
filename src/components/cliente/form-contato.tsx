"use client";

import { useActionState } from "react";
import { CheckCircle2, Send } from "lucide-react";

import { enviarContato, type EstadoContato } from "@/app/acoes/contato";

const inicial: EstadoContato = {};
const input = "h-12 w-full rounded-xl border border-graf-300 bg-white px-4 text-sm text-graf-950 outline-none transition placeholder:text-graf-400 hover:border-graf-400 focus:border-jb-500 focus:ring-4 focus:ring-jb-500/10";

export function FormContato() {
  const [estado, acao, pendente] = useActionState(enviarContato, inicial);

  if (estado.ok) {
    return (
      <div className="rounded-[1.75rem] border border-ok-500/20 bg-white p-8 text-center shadow-raised">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-ok-50 text-ok-700">
          <CheckCircle2 className="size-7" aria-hidden />
        </span>
        <h2 className="mt-5 text-2xl font-extrabold tracking-[-0.04em] text-graf-950">Mensagem recebida.</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-graf-600">{estado.ok}</p>
        {estado.protocolo ? <p className="mx-auto mt-5 inline-flex rounded-lg bg-graf-100 px-3 py-2 label-mono text-graf-700">Referência {estado.protocolo}</p> : null}
      </div>
    );
  }

  return (
    <form action={acao} className="rounded-[1.75rem] border border-graf-200 bg-white p-5 shadow-raised sm:p-7 lg:p-8">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-jb-600">Enviar mensagem</p>
      <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-graf-950">Fale com a equipe.</h2>
      <p className="mt-2 text-sm leading-6 text-graf-600">Explique o assunto e deixe um canal para retorno.</p>

      {estado.erro ? <div role="alert" className="mt-5 rounded-xl border border-jb-200 bg-jb-50 px-4 py-3 text-sm font-semibold text-jb-800">{estado.erro}</div> : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold text-graf-800">Nome</span><input name="nome" required autoComplete="name" className={input} /></label>
        <label><span className="mb-2 block text-sm font-bold text-graf-800">E-mail</span><input name="email" type="email" required autoComplete="email" className={input} /></label>
        <label><span className="mb-2 block text-sm font-bold text-graf-800">Telefone / WhatsApp</span><input name="telefone" autoComplete="tel" className={input} /></label>
        <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold text-graf-800">Assunto</span><select name="assunto" required defaultValue="" className={input}><option value="" disabled>Selecione</option><option>Equipamentos</option><option>Assistência técnica</option><option>Pedido ou entrega</option><option>Área da Clínica / acesso</option><option>Financeiro</option><option>Outro assunto</option></select></label>
        <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold text-graf-800">Mensagem</span><textarea name="mensagem" required minLength={10} rows={6} className="w-full rounded-xl border border-graf-300 bg-white px-4 py-3 text-sm text-graf-950 outline-none transition placeholder:text-graf-400 hover:border-graf-400 focus:border-jb-500 focus:ring-4 focus:ring-jb-500/10" placeholder="Como podemos ajudar?" /></label>
      </div>

      <button type="submit" disabled={pendente} className="mt-6 inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-jb-600 px-6 text-sm font-extrabold text-white transition hover:bg-jb-500 disabled:cursor-wait disabled:opacity-60">
        {pendente ? "Enviando…" : "Enviar mensagem"}
        {!pendente ? <Send className="size-4" aria-hidden /> : null}
      </button>
    </form>
  );
}
