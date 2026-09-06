"use client";

import { useActionState, useState } from "react";
import { CircleCheck, Send } from "lucide-react";

import { Verificacao } from "@/components/assistencia/verificacao";
import { interesseEmPlano, type EstadoAssistencia } from "@/app/acoes/assistencia";
import { Aviso } from "@/components/ui/aviso";
import { Botao, LinkBotao } from "@/components/ui/button";
import { CampoTelefone } from "@/components/ui/campos-br";
import { Area, Campo, Marcador, Selecao } from "@/components/ui/form";

/**
 * Interesse em um plano de manutenção.
 *
 * Não fecha contrato nem cobra nada: gera um Lead e avisa a equipe. O preço
 * final depende de quantos equipamentos entram na cobertura e de onde eles
 * estão — por isso o formulário pergunta a quantidade e para por aí, em vez de
 * simular um valor que teria de ser desdito depois.
 */
export function FormularioPlano({
  inicio,
  planos,
  planoInicial,
  cliente,
  telefone,
  className,
}: {
  inicio: number;
  planos: { slug: string; nome: string }[];
  planoInicial?: string;
  cliente: { nome: string; email: string; telefone: string } | null;
  telefone: string;
  className?: string;
}) {
  const [estado, acao, pendente] = useActionState<EstadoAssistencia, FormData>(
    interesseEmPlano,
    {},
  );
  const [tel, setTel] = useState(cliente?.telefone ?? "");

  /* Já estamos dentro do cartão da página — nada de cartão dentro de cartão. */
  if (estado.ok) {
    return (
      <div className={className} role="status">
        <span
          aria-hidden
          className="flex size-14 items-center justify-center rounded-full bg-ok-50 text-ok-700 ring-1 ring-inset ring-ok-500/20"
        >
          <CircleCheck className="size-7" />
        </span>
        <h3 className="mt-6 text-title texto-forte">Interesse registrado</h3>
        <p className="texto-guia mt-4 text-graf-600">{estado.ok}</p>
        <LinkBotao href="/manutencao-preventiva" variante="secundario" className="mt-8">
          Entender a manutenção preventiva
        </LinkBotao>
      </div>
    );
  }

  return (
    <form action={acao} className={className} noValidate>
      {/* ------------------------------------------------------- a cobertura */}
      <section>
        <h3 className="text-[0.9375rem] font-bold text-graf-950">Sobre a cobertura</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-graf-500">
          A quantidade de aparelhos é o que a equipe usa para montar a proposta.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Selecao
            rotulo="Plano de interesse"
            name="plano"
            required
            defaultValue={planoInicial ?? planos[0]?.slug ?? ""}
            erro={estado.campo === "plano" ? estado.erro : undefined}
          >
            {planos.map((plano) => (
              <option key={plano.slug} value={plano.slug}>
                {plano.nome}
              </option>
            ))}
          </Selecao>

          <Campo
            rotulo="Quantos equipamentos entram"
            name="equipamentos"
            type="text"
            inputMode="numeric"
            maxLength={3}
            required
            defaultValue="1"
            ajuda="Cadeiras, autoclaves, compressores, raio-X…"
            erro={estado.campo === "equipamentos" ? estado.erro : undefined}
          />
        </div>
      </section>

      {/* ----------------------------------------------------------- contato */}
      <section className="mt-9 border-t border-graf-200 pt-8">
        <h3 className="text-[0.9375rem] font-bold text-graf-950">Como falamos com você</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-graf-500">
          A equipe retoma o contato para entender a clínica antes de propor qualquer
          valor.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Campo
            rotulo="Nome completo"
            name="nome"
            required
            defaultValue={cliente?.nome ?? ""}
            autoComplete="name"
            erro={estado.campo === "nome" ? estado.erro : undefined}
            className="sm:col-span-2"
          />
          <Campo
            rotulo="Clínica ou empresa"
            name="empresa"
            autoComplete="organization"
            defaultValue=""
          />
          <Campo
            rotulo="E-mail"
            name="email"
            type="email"
            required
            defaultValue={cliente?.email ?? ""}
            autoComplete="email"
            erro={estado.campo === "email" ? estado.erro : undefined}
          />
          <CampoTelefone
            name="telefone"
            required
            valor={tel}
            aoMudar={setTel}
            ajuda="Com DDD, de preferência um celular."
            erro={estado.campo === "telefone" ? estado.erro : undefined}
          />
          <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-3">
            <Campo rotulo="Cidade" name="cidade" autoComplete="address-level2" defaultValue="" />
            <Campo
              rotulo="UF"
              name="uf"
              maxLength={2}
              autoComplete="address-level1"
              defaultValue=""
            />
          </div>
          <Area
            rotulo="Algo que devemos saber"
            name="mensagem"
            rows={3}
            maxLength={2000}
            placeholder="Idade dos equipamentos, histórico de falhas, número de unidades…"
            className="sm:col-span-2"
          />
        </div>

        <Marcador
          name="novidades"
          rotulo="Quero receber novidades e condições da JB por e-mail"
          className="mt-6"
        />
      </section>

      <Verificacao
        inicio={inicio}
        exigirCodigo={estado.exigirCodigo}
        erro={estado.campo === "codigo_da_imagem" ? estado.erro : undefined}
        telefone={telefone}
        className="mt-8"
      />

      <div aria-live="polite" className="mt-6 empty:mt-0">
        {estado.erro ? <Aviso tom="erro">{estado.erro}</Aviso> : null}
      </div>

      <div className="mt-9 border-t border-graf-200 pt-7">
        <Botao
          type="submit"
          tamanho="lg"
          carregando={pendente}
          className="w-full sm:w-auto"
        >
          {pendente ? null : <Send className="size-4" aria-hidden />}
          {pendente ? "Enviando…" : "Quero falar sobre este plano"}
        </Botao>
        <p className="mt-5 text-[0.8125rem] leading-relaxed text-graf-500">
          Sem compromisso: a equipe monta a proposta com você antes de qualquer
          contratação.
        </p>
      </div>
    </form>
  );
}
