"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { KeyRound } from "lucide-react";

import { trocarSenhaStaff, type EstadoSenha } from "@/app/acoes/staff";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/button";
import { Campo, Marcador } from "@/components/ui/form";

/**
 * Troca da própria senha, no painel.
 *
 * O erro sempre chega do servidor — este formulário não valida senha por conta
 * própria, para não dizer "confere" onde o servidor diria "não confere". O
 * `noValidate` desliga a bolha nativa do navegador, que é a única mensagem de
 * erro que o leitor de tela não anuncia junto com o campo.
 */

const VAZIO: EstadoSenha = {};

export function FormularioSenhaStaff() {
  const [estado, executar, enviando] = useActionState<EstadoSenha, FormData>(
    trocarSenhaStaff,
    VAZIO,
  );
  const [mostrar, setMostrar] = useState(false);
  const formulario = useRef<HTMLFormElement>(null);

  /**
   * Depois de cada resposta do servidor:
   *
   *  - deu certo, os três campos são limpos — nem para quem passar pela mesa,
   *    nem para o gerenciador do navegador ficar oferecendo a senha antiga;
   *  - o erro é de um campo, o foco vai para ele. É o que faz o leitor de tela
   *    ler o rótulo, o estado inválido e a mensagem; erro que só aparece na
   *    tela não é anunciado a quem não olha para ela.
   *
   * A dependência é o estado inteiro, e não `estado.ok`: o objeto é novo a
   * cada envio, então a segunda troca com a mesma mensagem também limpa.
   */
  useEffect(() => {
    if (estado.ok) {
      formulario.current?.reset();
      return;
    }
    if (!estado.campo) return;
    const alvo = formulario.current?.elements.namedItem(estado.campo);
    if (alvo instanceof HTMLInputElement) alvo.focus();
  }, [estado]);

  const tipo = mostrar ? "text" : "password";

  return (
    <form ref={formulario} action={executar} className="space-y-4" noValidate>
      {/* Aviso já traz role="status"/"alert": aparecer na tela é ser anunciado */}
      {estado.ok ? (
        <Aviso tom="sucesso" titulo="Pronto">
          {estado.ok}
        </Aviso>
      ) : null}

      {estado.erro && !estado.campo ? (
        <Aviso tom="erro" titulo="Não foi possível trocar a senha">
          {estado.erro}
        </Aviso>
      ) : null}

      <Campo
        rotulo="Senha atual"
        name="atual"
        type={tipo}
        autoComplete="current-password"
        required
        erro={estado.campo === "atual" ? estado.erro : undefined}
      />

      <Campo
        rotulo="Nova senha"
        name="nova"
        type={tipo}
        autoComplete="new-password"
        required
        minLength={8}
        ajuda="Ao menos 8 caracteres. Use algo que só você saiba — não a senha temporária que alguém ditou."
        erro={estado.campo === "nova" ? estado.erro : undefined}
      />

      <Campo
        rotulo="Repetir a nova senha"
        name="confirmacao"
        type={tipo}
        autoComplete="new-password"
        required
        erro={estado.campo === "confirmacao" ? estado.erro : undefined}
      />

      <Marcador
        rotulo="Mostrar as senhas"
        checked={mostrar}
        onChange={(evento) => setMostrar(evento.target.checked)}
      />

      <Botao type="submit" carregando={enviando}>
        <KeyRound className="size-4" aria-hidden />
        {enviando ? "Salvando…" : "Trocar a senha"}
      </Botao>
    </form>
  );
}
