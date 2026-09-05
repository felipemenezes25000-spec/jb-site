"use client";

import { useActionState, useState } from "react";
import { Send } from "lucide-react";

import { Verificacao } from "@/components/assistencia/verificacao";
import { interesseEmPlano, type EstadoAssistencia } from "@/app/acoes/assistencia";
import { Aviso } from "@/components/ui/aviso";
import { Botao, LinkBotao } from "@/components/ui/button";
import { CampoTelefone } from "@/components/ui/campos-br";
import { Cartao } from "@/components/ui/data";
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

  if (estado.ok) {
    return (
      <Cartao className={className}>
        <div className="p-8 text-center">
          <Aviso tom="sucesso" titulo="Interesse registrado">
            {estado.ok}
          </Aviso>
          <LinkBotao href="/manutencao-preventiva" variante="secundario" className="mt-6">
            Entender a manutenção preventiva
          </LinkBotao>
        </div>
      </Cartao>
    );
  }

  return (
    <form action={acao} className={className} noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
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

        <Campo
          rotulo="Nome completo"
          name="nome"
          required
          defaultValue={cliente?.nome ?? ""}
          autoComplete="name"
          erro={estado.campo === "nome" ? estado.erro : undefined}
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
          erro={estado.campo === "telefone" ? estado.erro : undefined}
        />
        <Campo rotulo="Cidade" name="cidade" autoComplete="address-level2" defaultValue="" />
        <Campo
          rotulo="UF"
          name="uf"
          maxLength={2}
          autoComplete="address-level1"
          defaultValue=""
          className="sm:max-w-24"
        />
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

      <Botao type="submit" tamanho="lg" carregando={pendente} className="mt-8">
        <Send className="size-4" aria-hidden />
        {pendente ? "Enviando…" : "Quero falar sobre este plano"}
      </Botao>
      <p className="mt-4 text-xs leading-relaxed text-graf-500">
        Sem compromisso: a equipe monta a proposta com você antes de qualquer contratação.
      </p>
    </form>
  );
}
