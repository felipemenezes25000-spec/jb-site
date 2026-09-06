"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

import { redefinirSenha, type EstadoConta } from "@/app/acoes/conta";
import { Botao, LinkBotao } from "@/components/ui/button";
import { Campo } from "@/components/ui/form";

/**
 * Troca da senha a partir do link recebido por e-mail.
 *
 * O token só é conferido no servidor, e é consumido de uma vez: link usado ou
 * vencido devolve a mesma mensagem. Quando isso acontece os campos saem da
 * tela — insistir numa senha nova que não tem como ser salva só faria a pessoa
 * digitar duas vezes à toa.
 */

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
  autoFocus,
}: {
  rotulo: string;
  /** os dois botões ficam na mesma tela: cada um precisa de nome próprio */
  rotuloBotao: string;
  name: string;
  ajuda?: string;
  erro?: string;
  valor: string;
  aoMudar: (v: string) => void;
  autoFocus?: boolean;
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
        autoFocus={autoFocus}
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

export function FormularioRedefinir({
  token,
  destino,
}: {
  token: string;
  /** Caminho interno para onde voltar depois de redefinir. */
  destino?: string;
}) {
  const [estado, acao, enviando] = useActionState<EstadoConta, FormData>(redefinirSenha, {});
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const formulario = useRef<HTMLFormElement>(null);
  const avisoDoToken = useRef<HTMLDivElement>(null);

  const erroDe = (campo: string) => (estado.campo === campo ? estado.erro : undefined);
  const erroDoToken = erroDe("token");
  const erroGeral = estado.erro && !estado.campo ? estado.erro : null;

  useEffect(() => {
    if (erroDoToken) {
      avisoDoToken.current?.focus();
      return;
    }
    if (!estado.campo) return;
    const alvo = formulario.current?.elements.namedItem(estado.campo);
    if (alvo instanceof HTMLElement) alvo.focus();
  }, [estado, erroDoToken]);

  if (erroDoToken) {
    return (
      <div
        ref={avisoDoToken}
        tabIndex={-1}
        className="rounded-xl border border-jb-200 bg-jb-50 p-6 outline-none"
      >
        <p className="flex items-start gap-2.5 font-semibold text-jb-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{erroDoToken}</span>
        </p>
        <p className="mt-2 pl-[26px] text-sm leading-relaxed text-graf-700">
          Cada link serve uma vez só e vale por 1 hora. Peça outro para continuar — sua senha atual
          não mudou.
        </p>
        <LinkBotao href="/recuperar-senha" variante="secundario" className="mt-5">
          Pedir um novo link
        </LinkBotao>
      </div>
    );
  }

  return (
    <form ref={formulario} action={acao} noValidate className="space-y-5">
      <input type="hidden" name="token" value={token} />
      {/* Para onde voltar depois de redefinir. Quem foi parar aqui a partir do
          checkout precisa voltar ao checkout, com o carrinho intacto — e não
          cair na visão geral da conta tendo de recomeçar a compra. O valor
          passa pelo filtro de redirecionamento aberto no servidor. */}
      {destino ? <input type="hidden" name="destino" value={destino} /> : null}

      {erroGeral ? (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-jb-200 bg-jb-50 px-4 py-3 text-sm leading-relaxed text-jb-800"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{erroGeral}</span>
        </p>
      ) : null}

      <CampoSenha
        rotulo="Nova senha"
        rotuloBotao="Mostrar a nova senha"
        name="senha"
        valor={senha}
        aoMudar={setSenha}
        autoFocus
        ajuda={senha.length >= 8 ? "Tamanho suficiente." : "Mínimo de 8 caracteres."}
        erro={erroDe("senha")}
      />

      <CampoSenha
        rotulo="Repita a nova senha"
        rotuloBotao="Mostrar a nova senha repetida"
        name="confirmacao"
        valor={confirmacao}
        aoMudar={setConfirmacao}
        // só o estado positivo: cobrar "não confere" enquanto a pessoa ainda
        // digita a segunda senha é ruído, e o servidor confere de novo
        ajuda={confirmacao.length > 0 && confirmacao === senha ? "As senhas conferem." : undefined}
        erro={erroDe("confirmacao")}
      />

      <Botao type="submit" tamanho="lg" larguraTotal carregando={enviando}>
        {enviando ? "Salvando…" : "Salvar nova senha e entrar"}
      </Botao>
    </form>
  );
}
