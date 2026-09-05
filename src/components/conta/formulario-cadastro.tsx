"use client";

import { useActionState, useState } from "react";
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
 */
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
  const [verSenha, setVerSenha] = useState(false);

  const juridica = tipoPessoa === "juridica";
  const limiteDocumento = juridica ? 14 : 11;

  const erroDe = (campo: string) => (estado.campo === campo ? estado.erro : undefined);
  const erroGeral = estado.erro && !estado.campo ? estado.erro : null;

  function trocarTipoPessoa(valor: TipoPessoa) {
    setTipoPessoa(valor);
    // ao trocar de CPF para CNPJ o número precisa caber no novo formato
    setDocumento((atual) =>
      formatarDocumento(somenteDigitos(atual).slice(0, valor === "juridica" ? 14 : 11)),
    );
  }

  return (
    <form action={acao} noValidate className="space-y-6">
      <input type="hidden" name="destino" value={destino} />

      <p aria-live="polite" className="sr-only">
        {estado.campo ? estado.erro : ""}
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

      <Campo
        rotulo="Nome completo"
        name="nome"
        autoComplete="name"
        required
        autoFocus
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
        value={telefone}
        onChange={(evento) =>
          setTelefone(formatarTelefone(somenteDigitos(evento.target.value).slice(0, 11)))
        }
        placeholder="(11) 90000-0000"
        erro={erroDe("telefone")}
      />

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
        value={documento}
        onChange={(evento) =>
          setDocumento(
            formatarDocumento(somenteDigitos(evento.target.value).slice(0, limiteDocumento)),
          )
        }
        ajuda="Usado na nota fiscal e na garantia dos equipamentos."
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

      <div className="grid gap-6 sm:grid-cols-2">
        <Campo
          rotulo="Senha"
          name="senha"
          type={verSenha ? "text" : "password"}
          autoComplete="new-password"
          required
          minLength={8}
          ajuda="Mínimo de 8 caracteres."
          erro={erroDe("senha")}
        />
        <Campo
          rotulo="Repita a senha"
          name="confirmacao"
          type={verSenha ? "text" : "password"}
          autoComplete="new-password"
          required
          minLength={8}
          erro={erroDe("confirmacao")}
        />
      </div>

      <button
        type="button"
        onClick={() => setVerSenha((v) => !v)}
        aria-pressed={verSenha}
        className="-mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-medium text-graf-600 transition-colors hover:text-jb-700"
      >
        {verSenha ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        {verSenha ? "Ocultar senhas" : "Mostrar senhas"}
      </button>

      <div className="space-y-4 rounded-xl border border-graf-200 bg-graf-50/70 p-5">
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
