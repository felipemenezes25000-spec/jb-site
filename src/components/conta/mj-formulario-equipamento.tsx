"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import {
  cadastrarEquipamento,
  editarEquipamento,
  type EstadoMinhaJb,
} from "@/app/acoes/minha-jb";
import { Anexos } from "@/components/conta/mj-anexos";
import { Botao, LinkBotao } from "@/components/ui/button";
import { Area, Campo, Selecao } from "@/components/ui/form";

/**
 * Cadastro e edição de equipamento do prontuário.
 *
 * O mesmo formulário serve para os dois casos — muda a ação e o texto do
 * botão. Só o nome é obrigatório: quem está montando o prontuário raramente
 * tem número de série, ano e nota fiscal na mão no mesmo momento, e travar o
 * cadastro por isso significa não ter prontuário nenhum.
 *
 * A validação de verdade é a do servidor; aqui os campos só ajudam (tipos de
 * teclado certos no celular, datas em campo de data, intervalo numérico).
 */

export type OpcaoSimples = { id: string; nome: string };

export type ValoresEquipamento = {
  nome: string;
  categoriaId: string;
  marca: string;
  modelo: string;
  serie: string;
  voltagem: string;
  unidadeId: string;
  sala: string;
  compradoEm: string;
  instaladoEm: string;
  garantiaAte: string;
  intervaloDias: string;
  notas: string;
};

const VAZIO: ValoresEquipamento = {
  nome: "",
  categoriaId: "",
  marca: "",
  modelo: "",
  serie: "",
  voltagem: "",
  unidadeId: "",
  sala: "",
  compradoEm: "",
  instaladoEm: "",
  garantiaAte: "",
  intervaloDias: "",
  notas: "",
};

export function FormularioEquipamento({
  modo,
  id,
  categorias,
  unidades,
  valores = VAZIO,
  cancelarHref,
}: {
  modo: "novo" | "editar";
  /** Obrigatório no modo editar — o servidor confere se é da sua conta. */
  id?: string;
  categorias: OpcaoSimples[];
  unidades: OpcaoSimples[];
  valores?: ValoresEquipamento;
  cancelarHref: string;
}) {
  const [estado, acao, enviando] = useActionState<EstadoMinhaJb, FormData>(
    modo === "novo" ? cadastrarEquipamento : editarEquipamento,
    {},
  );

  const erroDe = (campo: string) => (estado.campo === campo ? estado.erro : undefined);
  const erroGeral = estado.erro && !estado.campo ? estado.erro : null;

  return (
    <form action={acao} noValidate className="space-y-6">
      {modo === "editar" && id ? <input type="hidden" name="id" value={id} /> : null}

      <p aria-live="polite" className="sr-only">
        {estado.campo ? estado.erro : (estado.ok ?? "")}
      </p>

      {erroGeral ? (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-jb-200 bg-jb-50 px-4 py-3 text-sm leading-relaxed text-jb-800"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{erroGeral}</span>
        </p>
      ) : null}

      {estado.ok ? (
        <p
          role="status"
          className="flex items-start gap-2.5 rounded-lg border border-ok-500/25 bg-ok-50 px-4 py-3 text-sm leading-relaxed text-ok-700"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{estado.ok}</span>
        </p>
      ) : null}

      <fieldset className="rounded-xl border border-graf-200 bg-white p-5 shadow-card">
        <legend className="px-1 text-sm font-bold text-graf-950">Identificação</legend>

        <div className="mt-3 grid gap-5 sm:grid-cols-2">
          <Campo
            rotulo="Nome do equipamento"
            name="nome"
            required
            maxLength={120}
            defaultValue={valores.nome}
            placeholder="Ex.: Autoclave da sala 2"
            ajuda="Como você chama esse equipamento no dia a dia."
            erro={erroDe("nome")}
            className="sm:col-span-2"
          />

          <Campo
            rotulo="Marca"
            name="marca"
            maxLength={80}
            defaultValue={valores.marca}
            erro={erroDe("marca")}
          />

          <Campo
            rotulo="Modelo"
            name="modelo"
            maxLength={80}
            defaultValue={valores.modelo}
            erro={erroDe("modelo")}
          />

          <Campo
            rotulo="Número de série"
            name="serie"
            maxLength={80}
            defaultValue={valores.serie}
            ajuda="Costuma estar na etiqueta atrás ou embaixo do equipamento."
            erro={erroDe("serie")}
          />

          <Selecao
            rotulo="Tipo de equipamento"
            name="categoriaId"
            defaultValue={valores.categoriaId}
            erro={erroDe("categoriaId")}
          >
            <option value="">Não sei informar</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </option>
            ))}
          </Selecao>

          <Selecao
            rotulo="Voltagem"
            name="voltagem"
            defaultValue={valores.voltagem}
            erro={erroDe("voltagem")}
          >
            <option value="">Não sei informar</option>
            <option value="110">110V</option>
            <option value="220">220V</option>
            <option value="bivolt">Bivolt</option>
          </Selecao>

          <Campo
            rotulo="Sala ou setor"
            name="sala"
            maxLength={80}
            defaultValue={valores.sala}
            placeholder="Ex.: Consultório 1"
            erro={erroDe("sala")}
          />

          {unidades.length > 0 ? (
            <Selecao
              rotulo="Unidade"
              name="unidadeId"
              defaultValue={valores.unidadeId}
              ajuda="Clínicas cadastradas pela equipe da JB."
              erro={erroDe("unidadeId")}
              className="sm:col-span-2"
            >
              <option value="">Sem unidade específica</option>
              {unidades.map((unidade) => (
                <option key={unidade.id} value={unidade.id}>
                  {unidade.nome}
                </option>
              ))}
            </Selecao>
          ) : null}
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-graf-200 bg-white p-5 shadow-card">
        <legend className="px-1 text-sm font-bold text-graf-950">
          Datas e manutenção
        </legend>
        <p className="mt-1 text-sm leading-relaxed text-graf-500">
          Preencha o que souber. Campo em branco fica em branco — nada é estimado.
        </p>

        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Campo
            rotulo="Comprado em"
            name="compradoEm"
            type="date"
            defaultValue={valores.compradoEm}
            erro={erroDe("compradoEm")}
          />
          <Campo
            rotulo="Instalado em"
            name="instaladoEm"
            type="date"
            defaultValue={valores.instaladoEm}
            erro={erroDe("instaladoEm")}
          />
          <Campo
            rotulo="Garantia até"
            name="garantiaAte"
            type="date"
            defaultValue={valores.garantiaAte}
            erro={erroDe("garantiaAte")}
          />
          <Campo
            rotulo="Intervalo de manutenção (dias)"
            name="intervaloDias"
            type="number"
            inputMode="numeric"
            min={1}
            max={3650}
            defaultValue={valores.intervaloDias}
            ajuda="Ex.: 180 para preventiva a cada seis meses. Define a próxima data prevista."
            erro={erroDe("intervaloDias")}
          />
        </div>

        <Area
          rotulo="Observações"
          name="notas"
          rows={3}
          maxLength={2000}
          defaultValue={valores.notas}
          ajuda="Detalhes que ajudam o técnico: histórico de problema, adaptação, peça trocada."
          erro={erroDe("notas")}
          className="mt-5"
        />
      </fieldset>

      <fieldset className="rounded-xl border border-graf-200 bg-white p-5 shadow-card">
        <legend className="px-1 text-sm font-bold text-graf-950">Fotos</legend>
        <p className="mt-1 text-sm leading-relaxed text-graf-500">
          Uma foto do equipamento e outra da etiqueta de identificação poupam uma
          visita inteira de diagnóstico.
        </p>
        <Anexos
          nome="midias"
          rotulo="Fotos do equipamento"
          pasta="equipamentos"
          maximo={6}
          className="mt-4"
        />
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Botao type="submit" tamanho="lg" carregando={enviando}>
          {enviando
            ? "Salvando…"
            : modo === "novo"
              ? "Cadastrar equipamento"
              : "Salvar alterações"}
        </Botao>
        <LinkBotao href={cancelarHref} variante="texto" tamanho="lg">
          Cancelar
        </LinkBotao>
      </div>
    </form>
  );
}
