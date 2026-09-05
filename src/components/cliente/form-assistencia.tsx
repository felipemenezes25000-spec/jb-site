"use client";

import { useActionState, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Building2, Mail, MapPin, Phone, Stethoscope, UserRound, Wrench } from "lucide-react";

import { solicitarAssistencia, type EstadoCliente } from "@/app/acoes/cliente";

const inicial: EstadoCliente = {};
const input = "h-12 w-full rounded-xl border border-graf-300 bg-white px-4 text-sm text-graf-900 outline-none transition placeholder:text-graf-400 focus:border-jb-500 focus:ring-4 focus:ring-jb-500/10";

export type EquipamentoOpcao = { id: string; nome: string; detalhe: string };
export type CategoriaOpcao = { id: string; nome: string };

export function FormAssistencia({
  nome,
  email,
  telefone,
  equipamentos,
  categorias,
}: {
  nome?: string;
  email?: string;
  telefone?: string;
  equipamentos: EquipamentoOpcao[];
  categorias: CategoriaOpcao[];
}) {
  const [estado, acao, pendente] = useActionState(solicitarAssistencia, inicial);
  const [etapa, setEtapa] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);

  function avancar() {
    const bloco = formRef.current?.querySelector<HTMLElement>(`[data-etapa="${etapa}"]`);
    if (!bloco) return;
    const campos = Array.from(bloco.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea"));
    for (const campo of campos) {
      if (!campo.checkValidity()) {
        campo.reportValidity();
        campo.focus();
        return;
      }
    }
    setEtapa((v) => Math.min(3, v + 1));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <form ref={formRef} action={acao} className="overflow-hidden rounded-2xl border border-graf-200 bg-white shadow-card scroll-mt-32">
      <div className="border-b border-graf-200 bg-graf-50 px-5 py-4 sm:px-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-jb-600">Abrir chamado</p>
            <p className="mt-1 text-sm text-graf-600">Preencha o essencial. A equipe complementa a triagem se precisar.</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-graf-600 shadow-card">Etapa {etapa} de 3</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2" aria-hidden>
          {[1, 2, 3].map((n) => <span key={n} className={`h-1 rounded-full ${n <= etapa ? "bg-jb-500" : "bg-graf-200"}`} />)}
        </div>
      </div>

      <div className="p-5 sm:p-7 lg:p-8">
        {estado.erro ? (
          <div role="alert" className="mb-5 flex gap-3 rounded-xl border border-jb-200 bg-jb-50 p-4 text-sm font-semibold text-jb-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {estado.erro}
          </div>
        ) : null}

        <div data-etapa="1" className={etapa === 1 ? "block" : "hidden"}>
          <div className="mb-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-jb-50 text-jb-600"><UserRound className="size-5" aria-hidden /></div>
            <h2 className="mt-4 text-xl font-extrabold text-graf-950">Quem precisa do atendimento?</h2>
            <p className="mt-2 text-sm leading-6 text-graf-600">Esses dados serão usados para contato sobre o chamado.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Nome</span><input name="nome" required defaultValue={nome} autoComplete="name" className={input} /></label>
            <label><span className="mb-2 block text-sm font-bold">E-mail</span><span className="relative block"><Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-graf-400" aria-hidden /><input name="email" type="email" required defaultValue={email} autoComplete="email" className={`${input} pl-11`} /></span></label>
            <label><span className="mb-2 block text-sm font-bold">Telefone / WhatsApp</span><span className="relative block"><Phone className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-graf-400" aria-hidden /><input name="telefone" required minLength={8} defaultValue={telefone} autoComplete="tel" className={`${input} pl-11`} /></span></label>
          </div>
        </div>

        <div data-etapa="2" className={etapa === 2 ? "block" : "hidden"}>
          <div className="mb-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-jb-50 text-jb-600"><Stethoscope className="size-5" aria-hidden /></div>
            <h2 className="mt-4 text-xl font-extrabold text-graf-950">Qual equipamento apresentou problema?</h2>
            <p className="mt-2 text-sm leading-6 text-graf-600">Se já estiver na Área da Clínica, selecione-o. Caso contrário, informe o que souber.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {equipamentos.length > 0 ? (
              <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Equipamento já cadastrado</span><select name="equipamentoId" className={input} defaultValue=""><option value="">Outro equipamento / não sei</option>{equipamentos.map((e) => <option value={e.id} key={e.id}>{e.nome} — {e.detalhe}</option>)}</select></label>
            ) : null}
            <label><span className="mb-2 block text-sm font-bold">Categoria</span><select name="categoriaId" className={input} defaultValue=""><option value="">Selecione se souber</option>{categorias.map((c) => <option value={c.id} key={c.id}>{c.nome}</option>)}</select></label>
            <label><span className="mb-2 block text-sm font-bold">Marca</span><input name="marca" className={input} placeholder="Ex.: Schuster" /></label>
            <label><span className="mb-2 block text-sm font-bold">Modelo</span><input name="modelo" className={input} /></label>
            <label><span className="mb-2 block text-sm font-bold">Número de série</span><input name="serie" className={input} /></label>
            <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Tipo de problema</span><input name="problema" className={input} placeholder="Ex.: não aquece, perda de pressão, ruído anormal…" /></label>
            <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">O que está acontecendo?</span><textarea name="descricao" required minLength={10} rows={5} className="w-full rounded-xl border border-graf-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-graf-400 focus:border-jb-500 focus:ring-4 focus:ring-jb-500/10" placeholder="Descreva os sintomas, quando começou e qualquer informação que ajude na triagem." /></label>
            <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Urgência</span><select name="urgencia" defaultValue="normal" className={input}><option value="baixa">Baixa — pode ser programado</option><option value="normal">Normal</option><option value="alta">Alta — está afetando os atendimentos</option><option value="parado">Equipamento parado</option></select></label>
          </div>
        </div>

        <div data-etapa="3" className={etapa === 3 ? "block" : "hidden"}>
          <div className="mb-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-jb-50 text-jb-600"><MapPin className="size-5" aria-hidden /></div>
            <h2 className="mt-4 text-xl font-extrabold text-graf-950">Onde está o equipamento?</h2>
            <p className="mt-2 text-sm leading-6 text-graf-600">Informe o local para que a JB consiga organizar a triagem e, se necessário, a visita técnica.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className="mb-2 block text-sm font-bold">CEP</span><input name="cep" autoComplete="postal-code" className={input} /></label>
            <label><span className="mb-2 block text-sm font-bold">Cidade</span><input name="cidade" autoComplete="address-level2" className={input} /></label>
            <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Endereço</span><span className="relative block"><Building2 className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-graf-400" aria-hidden /><input name="endereco" autoComplete="street-address" className={`${input} pl-11`} /></span></label>
            <label><span className="mb-2 block text-sm font-bold">Número</span><input name="numero" className={input} /></label>
            <label><span className="mb-2 block text-sm font-bold">Complemento</span><input name="complemento" className={input} /></label>
            <label><span className="mb-2 block text-sm font-bold">Bairro</span><input name="bairro" className={input} /></label>
            <label><span className="mb-2 block text-sm font-bold">UF</span><input name="estado" maxLength={2} autoComplete="address-level1" className={input} /></label>
            <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Melhores dias/horários para contato ou visita</span><textarea name="disponibilidade" rows={3} className="w-full rounded-xl border border-graf-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-jb-500 focus:ring-4 focus:ring-jb-500/10" /></label>
          </div>
          <div className="mt-6 rounded-xl border border-graf-200 bg-graf-50 p-4 text-xs leading-6 text-graf-600">
            <strong className="text-graf-900">O que acontece depois:</strong> a solicitação entra na triagem da JB. A equipe pode pedir informações adicionais e, quando houver orçamento, nada é executado sem aprovação.
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-graf-100 pt-6">
          {etapa > 1 ? <button type="button" onClick={() => setEtapa((v) => Math.max(1, v - 1))} className="h-11 rounded-xl border border-graf-300 bg-white px-5 text-sm font-bold text-graf-800 hover:bg-graf-50">Voltar</button> : <span />}
          {etapa < 3 ? (
            <button type="button" onClick={avancar} className="inline-flex h-11 items-center gap-2 rounded-xl bg-graf-950 px-5 text-sm font-extrabold text-white hover:bg-graf-800">Continuar <ArrowRight className="size-4" aria-hidden /></button>
          ) : (
            <button type="submit" disabled={pendente} className="inline-flex h-11 items-center gap-2 rounded-xl bg-jb-600 px-5 text-sm font-extrabold text-white hover:bg-jb-500 disabled:cursor-wait disabled:opacity-60">{pendente ? "Enviando…" : "Enviar chamado"}<Wrench className="size-4" aria-hidden /></button>
          )}
        </div>
      </div>
    </form>
  );
}
