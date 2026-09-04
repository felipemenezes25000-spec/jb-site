"use client";

import { useActionState } from "react";
import { toast } from "sonner";

import { atualizarCadastro, excluirCadastro, type FormState } from "@/app/admin/actions";
import { Area, Salvar, Selecao } from "@/components/admin/ui";

export type Cadastro = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  obs: string;
  news: boolean;
  status: string;
  notas: string;
  recebidoEm: string;
};

const STATUS = [
  { valor: "novo", rotulo: "Novo" },
  { valor: "em_andamento", rotulo: "Em andamento" },
  { valor: "concluido", rotulo: "Concluído" },
  { valor: "arquivado", rotulo: "Arquivado" },
];

export function CadastroItem({ cadastro, podeExcluir }: { cadastro: Cadastro; podeExcluir: boolean }) {
  const [, action] = useActionState<FormState, FormData>(async (anterior, formData) => {
    const resultado = await atualizarCadastro(anterior, formData);
    if (resultado.ok) toast.success(resultado.ok);
    if (resultado.erro) toast.error(resultado.erro);
    return resultado;
  }, {});

  const endereco = [
    cadastro.endereco,
    cadastro.bairro,
    [cadastro.cidade, cadastro.estado].filter(Boolean).join("/"),
    cadastro.cep,
  ]
    .filter(Boolean)
    .join(" — ");

  return (
    <details id={cadastro.id} className="group overflow-hidden rounded-lg border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-slate-50">
        <span className="font-semibold text-slate-900">{cadastro.nome}</span>
        <span className="text-sm text-slate-500">{cadastro.email}</span>
        {cadastro.telefone ? (
          <span className="text-sm text-slate-500">{cadastro.telefone}</span>
        ) : null}
        <span className="ml-auto text-xs text-slate-400">{cadastro.recebidoEm}</span>
      </summary>

      <div className="grid gap-6 border-t border-slate-100 p-6 lg:grid-cols-2">
        <dl className="space-y-3 text-sm">
          {endereco ? (
            <div>
              <dt className="font-semibold text-slate-700">Endereço</dt>
              <dd className="text-slate-600">{endereco}</dd>
            </div>
          ) : null}
          <div>
            <dt className="font-semibold text-slate-700">Comentários</dt>
            <dd className="whitespace-pre-wrap text-slate-600">{cadastro.obs || "—"}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-700">Quer receber informações</dt>
            <dd className="text-slate-600">{cadastro.news ? "Sim" : "Não"}</dd>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href={`mailto:${cadastro.email}`}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm transition-colors hover:border-slate-400"
            >
              Responder por e-mail
            </a>
            {cadastro.telefone ? (
              <a
                href={`tel:${cadastro.telefone.replace(/\D/g, "")}`}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm transition-colors hover:border-slate-400"
              >
                Ligar
              </a>
            ) : null}
          </div>
        </dl>

        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={cadastro.id} />
          <Selecao label="Situação" name="status" defaultValue={cadastro.status}>
            {STATUS.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.rotulo}
              </option>
            ))}
          </Selecao>
          <Area
            label="Anotações internas"
            name="notas"
            defaultValue={cadastro.notas}
            rows={4}
            hint="Só aparece aqui no painel."
          />
          <div className="flex items-center gap-4">
            <Salvar>Atualizar</Salvar>
            {podeExcluir ? (
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm("Excluir este cadastro? A ação não pode ser desfeita.")) return;
                  await excluirCadastro(cadastro.id);
                  toast.success("Cadastro excluído.");
                }}
                className="text-sm text-red-700 underline underline-offset-2 hover:text-red-900"
              >
                Excluir
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </details>
  );
}
