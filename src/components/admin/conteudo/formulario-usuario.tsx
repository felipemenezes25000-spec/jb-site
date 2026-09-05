"use client";

import { useActionState } from "react";
import { KeyRound, Save } from "lucide-react";

import type { AcaoDeFormulario, EstadoAcao } from "@/components/admin/conteudo/botao-acao";
import {
  BarraDeSalvar,
  Bloco,
  MensagemDoFormulario,
  erroDoCampo,
} from "@/components/admin/conteudo/formulario-base";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/button";
import { BotaoCopiar } from "@/components/ui/copiar";
import { Campo, Marcador, Selecao } from "@/components/ui/form";
import { CampoTelefone } from "@/components/ui/campos-br";

/* ============================================================================
   Equipe interna

   A senha nunca volta do banco: o que existe lá é o hash do bcrypt. Ao criar o
   acesso, ou ao gerar uma nova senha, o painel mostra a temporária UMA vez, na
   própria resposta da ação — depois disso ela não existe mais em lugar nenhum
   além da cabeça de quem copiou.
   ============================================================================ */

export type PapelDisponivel = { valor: string; rotulo: string; descricao: string };

export type DadosDoUsuario = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  active: boolean;
};

const VAZIO: EstadoAcao = {};

function SenhaTemporaria({ senha, titulo }: { senha: string; titulo: string }) {
  return (
    <Aviso tom="sucesso" titulo={titulo}>
      <p>Copie agora: ela não será exibida de novo.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="rounded-lg bg-white px-3 py-2 font-mono text-base font-bold tracking-wide text-graf-950 ring-1 ring-inset ring-ok-500/30">
          {senha}
        </code>
        <BotaoCopiar texto={senha} rotulo="Copiar senha" />
      </div>
      <p className="mt-3 text-xs">
        Entregue pessoalmente ou por um canal seguro e peça a troca no primeiro acesso.
      </p>
    </Aviso>
  );
}

export function FormularioUsuario({
  acao,
  usuario,
  papeis,
  ehVoceMesmo,
  ehUltimoAdmin,
}: {
  acao: AcaoDeFormulario;
  usuario?: DadosDoUsuario;
  papeis: PapelDisponivel[];
  ehVoceMesmo: boolean;
  /** Único administrador ativo — não pode se rebaixar nem se desativar. */
  ehUltimoAdmin: boolean;
}) {
  const [estado, executar, pendente] = useActionState(acao, VAZIO);
  const criando = !usuario;

  return (
    <form action={executar} className="space-y-5">
      <input type="hidden" name="id" value={usuario?.id ?? ""} />

      {estado.senha ? (
        <SenhaTemporaria senha={estado.senha} titulo={estado.ok ?? "Senha temporária"} />
      ) : (
        <MensagemDoFormulario estado={estado} />
      )}

      {ehUltimoAdmin ? (
        <Aviso tom="atencao" titulo="Único administrador ativo">
          Enquanto não houver outro administrador ativo, este acesso não pode mudar de papel nem
          ser desativado — senão ninguém mais abriria Usuários e Configurações.
        </Aviso>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <Bloco titulo="Dados da pessoa">
          <Campo
            rotulo="Nome completo"
            name="name"
            required
            maxLength={120}
            defaultValue={usuario?.name ?? ""}
            erro={erroDoCampo(estado, "name")}
            autoComplete="off"
          />
          <Campo
            rotulo="E-mail"
            name="email"
            type="email"
            required
            defaultValue={usuario?.email ?? ""}
            erro={erroDoCampo(estado, "email")}
            ajuda="É com este e-mail que a pessoa entra no painel."
            autoComplete="off"
          />
          <CampoTelefone
            rotulo="Telefone"
            name="phone"
            valorInicial={usuario?.phone ?? ""}
            erro={erroDoCampo(estado, "phone")}
            ajuda="Opcional. Usado para contato interno."
          />
        </Bloco>

        <div className="space-y-5">
          <Bloco titulo="Acesso" descricao="O papel decide quais áreas do painel a pessoa abre.">
            <Selecao
              rotulo="Papel"
              name="role"
              required
              defaultValue={usuario?.role ?? "editor"}
              erro={erroDoCampo(estado, "role")}
            >
              {papeis.map((papel) => (
                <option key={papel.valor} value={papel.valor}>
                  {papel.rotulo}
                </option>
              ))}
            </Selecao>

            <ul className="space-y-1.5 rounded-lg bg-graf-50 p-3 text-xs leading-relaxed text-graf-600">
              {papeis.map((papel) => (
                <li key={papel.valor}>
                  <span className="font-semibold text-graf-800">{papel.rotulo}:</span>{" "}
                  {papel.descricao}
                </li>
              ))}
            </ul>

            <Marcador
              rotulo="Acesso ativo"
              name="active"
              defaultChecked={usuario ? usuario.active : true}
              ajuda={
                ehVoceMesmo
                  ? "Você não pode desativar o seu próprio acesso."
                  : "Desativado, a pessoa continua cadastrada mas não entra no painel."
              }
            />
          </Bloco>

          {criando ? (
            <Bloco titulo="Senha" descricao="Gerada automaticamente ao criar o acesso.">
              <p className="text-sm leading-relaxed text-graf-600">
                Ao salvar, o painel mostra uma senha temporária nesta tela, uma única vez. O
                painel nunca exibe a senha de quem já está cadastrado — o que fica guardado é
                apenas o hash.
              </p>
            </Bloco>
          ) : null}
        </div>
      </div>

      <BarraDeSalvar>
        <Botao type="submit" carregando={pendente}>
          <Save className="size-4" aria-hidden />
          {criando ? "Criar acesso" : "Salvar alterações"}
        </Botao>
      </BarraDeSalvar>
    </form>
  );
}

export function BotaoNovaSenha({ acao, id }: { acao: AcaoDeFormulario; id: string }) {
  const [estado, executar, pendente] = useActionState(acao, VAZIO);

  return (
    <div className="space-y-3">
      <form action={executar}>
        <input type="hidden" name="id" value={id} />
        <Botao type="submit" variante="secundario" carregando={pendente}>
          <KeyRound className="size-4" aria-hidden />
          Gerar nova senha temporária
        </Botao>
      </form>

      {estado.senha ? (
        <SenhaTemporaria senha={estado.senha} titulo={estado.ok ?? "Nova senha temporária"} />
      ) : (
        <MensagemDoFormulario estado={estado} tituloDoErro="Não foi possível gerar a senha" />
      )}
    </div>
  );
}
