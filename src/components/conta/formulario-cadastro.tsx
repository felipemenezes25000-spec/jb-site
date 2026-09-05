"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

import { cadastrarCliente, type EstadoConta } from "@/app/acoes/conta";
import { Botao } from "@/components/ui/button";
import { Campo, Erro, Marcador, Opcoes } from "@/components/ui/form";
import { formatarDocumento, formatarTelefone, somenteDigitos } from "@/lib/format";

type TipoPessoa = "fisica" | "juridica";

/**
 * Criação de conta do cliente.
 *
 * O documento e o telefone são mascarados aqui só para a leitura ficar fácil —
 * a validação real (dígitos verificadores de CPF/CNPJ, tamanho do telefone,
 * confirmação da senha e aceite dos termos) acontece toda no servidor.
 *
 * Os campos vêm em três blocos nomeados. São oito campos: sem esse degrau, a
 * tela vira uma coluna sem começo nem fim, e quem preenche perde o fio.
 */

/** Bloco nomeado do formulário — `fieldset` de verdade, com legenda real. */
function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset>
      {/* o respiro fica no `pt-5` do conteúdo: margem em `legend` é território
          de comportamento antigo de navegador, e aqui não precisa disso */}
      <legend className="block w-full border-b border-graf-200 pb-2 text-xs font-bold uppercase tracking-[0.08em] text-graf-500">
        {titulo}
      </legend>
      <div className="space-y-5 pt-5">{children}</div>
    </fieldset>
  );
}

/**
 * Campo de senha com o botão de mostrar/ocultar dentro da caixa.
 *
 * O botão é sobreposto ao input: 26px é a altura exata do rótulo de `Campo`
 * (linha de 20px + 6px de margem), então os 44px do botão cobrem exatamente os
 * 44px da caixa, sem depender de o texto de erro ou de ajuda aparecer embaixo.
 */
function CampoSenha({
  rotulo,
  rotuloBotao,
  name,
  ajuda,
  erro,
  valor,
  aoMudar,
}: {
  rotulo: string;
  /** os dois botões ficam na mesma tela: cada um precisa de nome próprio */
  rotuloBotao: string;
  name: string;
  ajuda?: string;
  erro?: string;
  valor: string;
  aoMudar: (v: string) => void;
}) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="relative [&_input]:pr-12">
      <Campo
        rotulo={rotulo}
        name={name}
        type={visivel ? "text" : "password"}
        autoComplete="new-password"
        required
        minLength={8}
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        ajuda={ajuda}
        erro={erro}
      />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        aria-pressed={visivel}
        aria-label={rotuloBotao}
        title={rotuloBotao}
        className="absolute right-1 top-[26px] flex size-11 items-center justify-center rounded-lg text-graf-500 transition-colors hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
      >
        {visivel ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
}

export function FormularioCadastro({
  destino,
  emailInicial = "",
}: {
  destino: string;
  emailInicial?: string;
}) {
  const [estado, acao, enviando] = useActionState<EstadoConta, FormData>(cadastrarCliente, {});

  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>("fisica");
  const [documento, setDocumento] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const formulario = useRef<HTMLFormElement>(null);

  const juridica = tipoPessoa === "juridica";
  const limiteDocumento = juridica ? 14 : 11;

  const erroDe = (campo: string) => (estado.campo === campo ? estado.erro : undefined);
  const erroGeral = estado.erro && !estado.campo ? estado.erro : null;

  useEffect(() => {
    if (!estado.campo) return;
    const alvo = formulario.current?.elements.namedItem(estado.campo);
    if (alvo instanceof HTMLElement) alvo.focus();
  }, [estado]);

  function trocarTipoPessoa(valor: TipoPessoa) {
    setTipoPessoa(valor);
    // ao trocar de CPF para CNPJ o número precisa caber no novo formato
    setDocumento((atual) =>
      formatarDocumento(somenteDigitos(atual).slice(0, valor === "juridica" ? 14 : 11)),
    );
  }

  return (
    <form ref={formulario} action={acao} noValidate className="space-y-9">
      <input type="hidden" name="destino" value={destino} />

      {erroGeral ? (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-jb-200 bg-jb-50 px-4 py-3 text-sm leading-relaxed text-jb-800"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{erroGeral}</span>
        </p>
      ) : null}

      <Bloco titulo="Seus dados">
        <Campo
          rotulo="Nome completo"
          name="nome"
          autoComplete="name"
          required
          erro={erroDe("nome")}
        />

        <Campo
          rotulo="E-mail"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          defaultValue={emailInicial}
          required
          placeholder="voce@clinica.com.br"
          ajuda="É por ele que chegam as confirmações de pedido e de atendimento."
          erro={erroDe("email")}
        />

        <Campo
          rotulo="Telefone com DDD"
          name="telefone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          maxLength={15}
          value={telefone}
          onChange={(evento) =>
            setTelefone(formatarTelefone(somenteDigitos(evento.target.value).slice(0, 11)))
          }
          placeholder="(11) 90000-0000"
          erro={erroDe("telefone")}
        />
      </Bloco>

      <Bloco titulo="Para a nota fiscal e a garantia">
        <Opcoes<TipoPessoa>
          nome="tipoPessoa"
          rotulo="Você compra como"
          valor={tipoPessoa}
          aoMudar={trocarTipoPessoa}
          opcoes={[
            { valor: "fisica", rotulo: "Pessoa física", descricao: "CPF" },
            { valor: "juridica", rotulo: "Pessoa jurídica", descricao: "CNPJ da clínica" },
          ]}
        />

        <Campo
          rotulo={juridica ? "CNPJ" : "CPF"}
          name="documento"
          inputMode="numeric"
          autoComplete="off"
          required
          maxLength={18}
          value={documento}
          onChange={(evento) =>
            setDocumento(
              formatarDocumento(somenteDigitos(evento.target.value).slice(0, limiteDocumento)),
            )
          }
          placeholder={juridica ? "00.000.000/0000-00" : "000.000.000-00"}
          erro={erroDe("documento")}
        />

        {juridica ? (
          <Campo
            rotulo="Razão social"
            name="razaoSocial"
            autoComplete="organization"
            required
            erro={erroDe("razaoSocial")}
          />
        ) : null}
      </Bloco>

      <Bloco titulo="Senha de acesso">
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoSenha
            rotulo="Senha"
            rotuloBotao="Mostrar a senha"
            name="senha"
            valor={senha}
            aoMudar={setSenha}
            ajuda={senha.length >= 8 ? "Tamanho suficiente." : "Mínimo de 8 caracteres."}
            erro={erroDe("senha")}
          />
          <CampoSenha
            rotulo="Repita a senha"
            rotuloBotao="Mostrar a senha repetida"
            name="confirmacao"
            valor={confirmacao}
            aoMudar={setConfirmacao}
            // só o estado positivo: cobrar "não confere" enquanto a pessoa
            // ainda digita a segunda senha é ruído, e o servidor confere de novo
            ajuda={
              confirmacao.length > 0 && confirmacao === senha ? "As senhas conferem." : undefined
            }
            erro={erroDe("confirmacao")}
          />
        </div>
      </Bloco>

      <div className="space-y-4 rounded-xl border border-graf-200 bg-graf-50 p-5">
        <Marcador
          id="aceite"
          name="aceite"
          required
          aria-invalid={erroDe("aceite") ? true : undefined}
          aria-describedby={erroDe("aceite") ? "aceite-erro" : undefined}
          rotulo={
            <>
              Li e aceito os{" "}
              <Link href="/termos" className="text-jb-700 underline underline-offset-2">
                termos de uso
              </Link>{" "}
              e a{" "}
              <Link href="/privacidade" className="text-jb-700 underline underline-offset-2">
                política de privacidade
              </Link>
              .
            </>
          }
        />
        <Erro id="aceite-erro" texto={erroDe("aceite")} />

        <Marcador
          name="novidades"
          rotulo="Quero receber novidades da JB"
          ajuda="Lançamentos, condições de seminovos e avisos de manutenção. Dá para sair quando quiser."
        />
      </div>

      <Botao type="submit" tamanho="lg" larguraTotal carregando={enviando}>
        {enviando ? "Criando conta…" : "Criar minha conta"}
      </Botao>
    </form>
  );
}
