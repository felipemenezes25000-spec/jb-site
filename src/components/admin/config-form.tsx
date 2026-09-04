"use client";

import { useActionState } from "react";
import { toast } from "sonner";

import { salvarConfiguracoes, type FormState } from "@/app/admin/actions";
import { Area, Aviso, Campo, Salvar } from "@/components/admin/ui";

export type CampoConfig = {
  key: string;
  label: string;
  value: string;
  type: string;
  hint: string | null;
  group: string;
};

const TITULOS: Record<string, string> = {
  geral: "Geral",
  contato: "Contato e endereço",
  social: "Redes sociais",
};

export function ConfigForm({ campos }: { campos: CampoConfig[] }) {
  const [state, action] = useActionState<FormState, FormData>(async (anterior, formData) => {
    const resultado = await salvarConfiguracoes(anterior, formData);
    if (resultado.ok) toast.success(resultado.ok);
    if (resultado.erro) toast.error(resultado.erro);
    return resultado;
  }, {});

  const grupos = [...new Set(campos.map((c) => c.group))];

  return (
    <form action={action} className="space-y-8">
      {grupos.map((grupo) => (
        <section key={grupo} className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-5 font-semibold text-slate-900">{TITULOS[grupo] ?? grupo}</h2>
          <div className="space-y-5">
            {campos
              .filter((c) => c.group === grupo)
              .map((campo) =>
                campo.type === "textarea" || campo.type === "html" ? (
                  <Area
                    key={campo.key}
                    label={campo.label}
                    name={campo.key}
                    defaultValue={campo.value}
                    hint={campo.hint ?? undefined}
                    rows={campo.type === "html" ? 8 : 4}
                  />
                ) : (
                  <Campo
                    key={campo.key}
                    label={campo.label}
                    name={campo.key}
                    defaultValue={campo.value}
                    hint={campo.hint ?? undefined}
                    type={campo.type === "email" ? "email" : campo.type === "url" ? "url" : "text"}
                  />
                ),
              )}
          </div>
        </section>
      ))}

      <Aviso erro={state.erro} ok={state.ok} />

      <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/90 px-4 py-4 backdrop-blur lg:-mx-8 lg:px-8">
        <Salvar>Salvar configurações</Salvar>
      </div>
    </form>
  );
}
