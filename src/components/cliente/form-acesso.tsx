"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";

import { cadastrarCliente, entrarCliente, type EstadoCliente } from "@/app/acoes/cliente";

const inicial: EstadoCliente = {};

function Erro({ mensagem }: { mensagem?: string }) {
  return mensagem ? (
    <div role="alert" className="rounded-xl border border-jb-200 bg-jb-50 px-4 py-3 text-sm font-semibold text-jb-800">
      {mensagem}
    </div>
  ) : null;
}

const input = "h-12 w-full rounded-xl border border-graf-300 bg-white px-4 text-sm text-graf-900 outline-none transition placeholder:text-graf-400 focus:border-jb-500 focus:ring-4 focus:ring-jb-500/10";

export function FormEntrar({ voltar }: { voltar?: string }) {
  const [estado, acao, pendente] = useActionState(entrarCliente, inicial);

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="voltar" value={voltar ?? "/minha-jb"} />
      <Erro mensagem={estado.erro} />
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-graf-800">E-mail</span>
        <span className="relative block">
          <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-graf-400" aria-hidden />
          <input name="email" type="email" autoComplete="email" required placeholder="voce@clinica.com.br" className={`${input} pl-11`} />
        </span>
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-graf-800">Senha</span>
        <span className="relative block">
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-graf-400" aria-hidden />
          <input name="senha" type="password" autoComplete="current-password" required placeholder="Sua senha" className={`${input} pl-11`} />
        </span>
      </label>
      <div className="flex justify-end">
        <Link href="/esqueci-minha-senha" className="text-xs font-bold text-jb-700 hover:text-jb-500">Esqueci minha senha</Link>
      </div>
      <button disabled={pendente} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-jb-600 px-5 text-sm font-extrabold text-white transition hover:bg-jb-500 disabled:cursor-wait disabled:opacity-60">
        {pendente ? "Entrando…" : "Entrar na Área da Clínica"}
        {!pendente ? <ArrowRight className="size-4" aria-hidden /> : null}
      </button>
    </form>
  );
}

export function FormCadastro() {
  const [estado, acao, pendente] = useActionState(cadastrarCliente, inicial);

  return (
    <form action={acao} className="space-y-4">
      <Erro mensagem={estado.erro} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-2 block text-sm font-bold text-graf-800">Nome completo</span>
          <span className="relative block">
            <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-graf-400" aria-hidden />
            <input name="nome" required autoComplete="name" className={`${input} pl-11`} placeholder="Seu nome" />
          </span>
        </label>
        <label>
          <span className="mb-2 block text-sm font-bold text-graf-800">E-mail</span>
          <input name="email" type="email" required autoComplete="email" className={input} placeholder="voce@clinica.com.br" />
        </label>
        <label>
          <span className="mb-2 block text-sm font-bold text-graf-800">Telefone / WhatsApp</span>
          <input name="telefone" autoComplete="tel" className={input} placeholder="(11) 99999-9999" />
        </label>
        <label>
          <span className="mb-2 block text-sm font-bold text-graf-800">Tipo de cadastro</span>
          <select name="tipo" defaultValue="fisica" className={input}>
            <option value="fisica">Pessoa física</option>
            <option value="juridica">Pessoa jurídica / clínica</option>
          </select>
        </label>
        <label>
          <span className="mb-2 block text-sm font-bold text-graf-800">CPF ou CNPJ</span>
          <input name="documento" className={input} placeholder="Opcional neste momento" />
        </label>
        <label className="sm:col-span-2">
          <span className="mb-2 block text-sm font-bold text-graf-800">Nome da clínica / razão social</span>
          <span className="relative block">
            <Building2 className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-graf-400" aria-hidden />
            <input name="empresa" className={`${input} pl-11`} placeholder="Se aplicável" />
          </span>
        </label>
        <label className="sm:col-span-2">
          <span className="mb-2 block text-sm font-bold text-graf-800">Crie uma senha</span>
          <input name="senha" type="password" minLength={8} required autoComplete="new-password" className={input} placeholder="Pelo menos 8 caracteres" />
        </label>
      </div>
      <button disabled={pendente} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-jb-600 px-5 text-sm font-extrabold text-white transition hover:bg-jb-500 disabled:cursor-wait disabled:opacity-60">
        {pendente ? "Criando conta…" : "Criar minha Área da Clínica"}
        {!pendente ? <ArrowRight className="size-4" aria-hidden /> : null}
      </button>
      <p className="text-center text-xs leading-5 text-graf-500">
        Ao criar sua conta, seus pedidos e equipamentos vinculados à JB podem ser organizados no mesmo ambiente.
      </p>
    </form>
  );
}
