"use client";

import { useActionState, useMemo } from "react";
import { Save } from "lucide-react";

import type { AcaoDeFormulario, EstadoAcao } from "@/components/admin/conteudo/botao-acao";
import {
  BarraDeSalvar,
  Bloco,
  MensagemDoFormulario,
  erroDoCampo,
} from "@/components/admin/conteudo/formulario-base";
import {
  DESCRICAO_GRUPO_CONFIG,
  ROTULO_GRUPO_CONFIG,
} from "@/components/admin/conteudo/rotulos";
import { Botao } from "@/components/ui/button";
import { Area, Campo, Marcador, Selecao } from "@/components/ui/form";

/* ============================================================================
   Configurações do site

   O formulário é gerado a partir da lista de campos que o servidor entrega —
   que por sua vez sai de SETTING_FIELDS. Nenhuma chave é escrita à mão aqui:
   acrescentar uma configuração é acrescentar uma linha naquela lista, e a tela
   se ajusta sozinha.
   ============================================================================ */

export type CampoDeConfiguracao = {
  chave: string;
  rotulo: string;
  grupo: string;
  tipo: "text" | "textarea" | "url" | "email" | "tel" | "boolean" | "select";
  ajuda?: string;
  valor: string;
  opcoes?: { value: string; label: string }[];
};

const VAZIO: EstadoAcao = {};

const TIPO_DE_INPUT: Record<string, string> = {
  text: "text",
  url: "url",
  email: "email",
  tel: "tel",
};

function ligado(valor: string) {
  return ["sim", "true", "1", "on"].includes(valor.trim().toLowerCase());
}

export function FormularioConfiguracoes({
  acao,
  campos,
}: {
  acao: AcaoDeFormulario;
  campos: CampoDeConfiguracao[];
}) {
  const [estado, executar, pendente] = useActionState(acao, VAZIO);

  const grupos = useMemo(() => {
    const mapa = new Map<string, CampoDeConfiguracao[]>();
    for (const campo of campos) {
      const lista = mapa.get(campo.grupo);
      if (lista) lista.push(campo);
      else mapa.set(campo.grupo, [campo]);
    }
    return [...mapa.entries()];
  }, [campos]);

  return (
    <form action={executar} className="space-y-5">
      <MensagemDoFormulario estado={estado} />

      <div className="grid gap-5 xl:grid-cols-2 xl:items-start">
        {grupos.map(([grupo, itens]) => (
          <Bloco
            key={grupo}
            titulo={ROTULO_GRUPO_CONFIG[grupo] ?? grupo}
            descricao={DESCRICAO_GRUPO_CONFIG[grupo]}
          >
            {itens.map((campo) => {
              const erro = erroDoCampo(estado, campo.chave);

              if (campo.tipo === "boolean") {
                return (
                  <div key={campo.chave}>
                    <Marcador
                      rotulo={campo.rotulo}
                      name={campo.chave}
                      defaultChecked={ligado(campo.valor)}
                      ajuda={campo.ajuda}
                    />
                    {erro ? (
                      <p className="mt-1.5 text-sm text-jb-700" role="alert">
                        {erro}
                      </p>
                    ) : null}
                  </div>
                );
              }

              if (campo.tipo === "select" && campo.opcoes) {
                return (
                  <Selecao
                    key={campo.chave}
                    rotulo={campo.rotulo}
                    name={campo.chave}
                    defaultValue={campo.valor}
                    ajuda={campo.ajuda}
                    erro={erro}
                  >
                    {campo.opcoes.map((opcao) => (
                      <option key={opcao.value} value={opcao.value}>
                        {opcao.label}
                      </option>
                    ))}
                  </Selecao>
                );
              }

              if (campo.tipo === "textarea") {
                return (
                  <Area
                    key={campo.chave}
                    rotulo={campo.rotulo}
                    name={campo.chave}
                    rows={3}
                    defaultValue={campo.valor}
                    ajuda={campo.ajuda}
                    erro={erro}
                  />
                );
              }

              return (
                <Campo
                  key={campo.chave}
                  rotulo={campo.rotulo}
                  name={campo.chave}
                  type={TIPO_DE_INPUT[campo.tipo] ?? "text"}
                  defaultValue={campo.valor}
                  ajuda={campo.ajuda}
                  erro={erro}
                  autoComplete="off"
                />
              );
            })}
          </Bloco>
        ))}
      </div>

      <BarraDeSalvar aviso="Estes dados aparecem no cabeçalho, no rodapé e nas páginas de contato do site.">
        <Botao type="submit" carregando={pendente}>
          <Save className="size-4" aria-hidden />
          Salvar configurações
        </Botao>
      </BarraDeSalvar>
    </form>
  );
}
