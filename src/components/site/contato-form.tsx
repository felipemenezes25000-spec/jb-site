"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { enviarContato, type ContatoState } from "@/app/actions/contato";

const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
  "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

const inicial: ContatoState = { status: "idle" };

/** Porte fiel do formulário do contato.php, com as mesmas classes e ordem de campos. */
export function ContatoForm() {
  const [state, action] = useActionState(enviarContato, inicial);
  // muda a query da imagem para forçar um captcha novo a cada tentativa
  const [captchaKey, setCaptchaKey] = useState(1);

  if (state.status === "ok") {
    return <div className="mensagem">{state.msg}</div>;
  }

  return (
    <>
      <h2>Cadastro</h2>
      <p>Cadastre-se e receba informações sobre a nossa empresa.</p>
      <p>(*) Campos obrigatórios</p>

      <form action={action} id="contato" className="contato" name="contato" noValidate>
        <input
          type="text"
          name="nome"
          id="nome"
          className="obr form-control"
          placeholder="Nome (*)"
          required
          aria-invalid={state.erros?.nome ? true : undefined}
        />
        {state.erros?.nome ? <Erro>{state.erros.nome}</Erro> : null}

        <input type="text" name="endereco" id="endereco" className="form-control" placeholder="Endereço" />
        <input type="text" name="bairro" id="bairro" className="form-control" placeholder="Bairro" />
        <input type="text" name="cidade" id="cidade" className="form-control" placeholder="Cidade" />

        <select name="estado" className="form-control" defaultValue="" aria-label="Estado">
          <option value="">Estado</option>
          {UFS.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>

        <input type="text" name="cep" id="cep" className="form-control" placeholder="CEP" />
        <input type="text" name="telefone" id="telefone" className="form-control" placeholder="Telefone" />

        <input
          type="text"
          name="email"
          id="email"
          className="obr form-control"
          placeholder="E-mail (*)"
          required
          aria-invalid={state.erros?.email ? true : undefined}
        />
        {state.erros?.email ? <Erro>{state.erros.email}</Erro> : null}

        <textarea
          name="obs"
          id="obs"
          rows={4}
          className="comentario form-control"
          placeholder="Comentários"
        />

        {/* o original era um <input> solto; o <label> deixa o texto clicável sem mudar o espaçamento */}
        <label htmlFor="news" style={{ fontWeight: "normal", marginBottom: 0 }}>
          <input type="checkbox" name="news" id="news" value="1" defaultChecked /> Sim, desejo
          receber informações sobre a empresa.
        </label>

        <p style={{ marginTop: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/captcha?rand=${captchaKey}`}
            alt="Código de verificação"
            className="captcha"
          />
          <input
            type="text"
            name="captcha"
            className="form-control input-sm"
            placeholder="Digite o código acima"
            autoComplete="off"
            aria-invalid={state.erros?.captcha ? true : undefined}
          />
          {state.erros?.captcha ? <Erro>{state.erros.captcha}</Erro> : null}
          <div id="WhyDesc" style={{ fontSize: 10 }}>
            Este procedimento visa sua segurança e é necessário para verificar se o preenchimento
            não está sendo executado por uma máquina. Basta transcrever o que está escrito na
            imagem acima.
          </div>
        </p>

        {state.status === "error" && state.msg ? (
          <p role="alert" style={{ color: "#c00", marginBottom: 15 }}>
            {state.msg}
          </p>
        ) : null}

        <Enviar onSubmitted={() => setCaptchaKey((k) => k + 1)} />
      </form>
    </>
  );
}

function Erro({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: "block", color: "#c00", fontSize: 12, marginTop: -10, marginBottom: 12 }}>
      {children}
    </span>
  );
}

function Enviar({ onSubmitted }: { onSubmitted: () => void }) {
  const { pending } = useFormStatus();
  return (
    <input
      type="submit"
      name="button"
      className="btn btn-primary"
      value={pending ? "Enviando..." : "Enviar Meus Dados"}
      disabled={pending}
      onClick={() => window.setTimeout(onSubmitted, 1200)}
    />
  );
}
