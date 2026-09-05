"use client";

import { useActionState, useState } from "react";
import { Save } from "lucide-react";

import type { AcaoDeFormulario, EstadoAcao } from "@/components/admin/conteudo/botao-acao";
import {
  BarraDeSalvar,
  Bloco,
  MensagemDoFormulario,
  erroDoCampo,
} from "@/components/admin/conteudo/formulario-base";
import {
  SECOES,
  SECOES_AUTOMATICAS,
  TIPOS_SECAO,
  type TipoSecao,
} from "@/components/admin/conteudo/rotulos";
import { SeletorDeMidia, type MidiaResumo } from "@/components/admin/conteudo/seletor-midia";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/button";
import { Area, Campo, Marcador, Selecao } from "@/components/ui/form";

/* ============================================================================
   Formulário de uma seção da home

   O tipo da seção decide o que a home desenha. Alguns tipos montam a lista
   sozinhos a partir do catálogo — nesses, o texto daqui é só o enquadramento, e
   o aviso na tela diz isso para ninguém procurar onde cadastrar os itens.
   ============================================================================ */

export type DadosDaSecao = {
  id: string;
  kind: string;
  title: string;
  subtitle: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  published: boolean;
};

const VAZIO: EstadoAcao = {};

export function FormularioSecao({
  acao,
  secao,
  imagem,
  biblioteca,
  tiposEmUso,
}: {
  acao: AcaoDeFormulario;
  secao?: DadosDaSecao;
  imagem: MidiaResumo | null;
  biblioteca: MidiaResumo[];
  /** Tipos que já existem na home — só para avisar sobre repetição. */
  tiposEmUso: string[];
}) {
  const [estado, executar, pendente] = useActionState(acao, VAZIO);
  const criando = !secao;

  const inicial = (secao?.kind ?? "hero") as TipoSecao;
  const [tipo, setTipo] = useState<TipoSecao>(
    TIPOS_SECAO.includes(inicial) ? inicial : "hero",
  );

  const automatica = SECOES_AUTOMATICAS.includes(tipo);
  const repetida = criando && tiposEmUso.includes(tipo);

  return (
    <form action={executar} className="space-y-5">
      <input type="hidden" name="id" value={secao?.id ?? ""} />

      <MensagemDoFormulario estado={estado} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="space-y-5">
          <Bloco titulo="Tipo" descricao="Define o desenho do bloco na página inicial.">
            <Selecao
              rotulo="Tipo de seção"
              name="kind"
              required
              value={tipo}
              onChange={(evento) => setTipo(evento.target.value as TipoSecao)}
              erro={erroDoCampo(estado, "kind")}
              ajuda={SECOES[tipo].descricao}
            >
              {TIPOS_SECAO.map((chave) => (
                <option key={chave} value={chave}>
                  {SECOES[chave].rotulo}
                </option>
              ))}
            </Selecao>

            {automatica ? (
              <Aviso tom="info" titulo="Conteúdo montado pelo catálogo">
                Os itens desta seção vêm do próprio catálogo. Título e texto aqui servem só de
                apresentação; para mudar o que aparece, edite os produtos, as categorias ou as
                perguntas frequentes.
              </Aviso>
            ) : null}

            {repetida ? (
              <Aviso tom="atencao" titulo="Este tipo já está na home">
                Duas seções do mesmo tipo aparecem uma depois da outra. Se a ideia era ajustar a
                existente, volte e edite aquela em vez de criar outra.
              </Aviso>
            ) : null}
          </Bloco>

          <Bloco titulo="Texto" descricao="O que a pessoa lê neste bloco.">
            <Campo
              rotulo="Título"
              name="title"
              maxLength={160}
              defaultValue={secao?.title ?? ""}
              erro={erroDoCampo(estado, "title")}
              autoComplete="off"
            />
            <Campo
              rotulo="Subtítulo"
              name="subtitle"
              maxLength={240}
              defaultValue={secao?.subtitle ?? ""}
              erro={erroDoCampo(estado, "subtitle")}
              autoComplete="off"
            />
            <Area
              rotulo="Texto de apoio"
              name="body"
              rows={5}
              maxLength={2000}
              defaultValue={secao?.body ?? ""}
              erro={erroDoCampo(estado, "body")}
              ajuda="Texto simples, sem formatação. Quebras de linha são preservadas."
            />
          </Bloco>

          <Bloco titulo="Botão" descricao="Opcional. Preencha os dois campos ou nenhum.">
            <Campo
              rotulo="Texto do botão"
              name="ctaLabel"
              maxLength={48}
              defaultValue={secao?.ctaLabel ?? ""}
              erro={erroDoCampo(estado, "ctaLabel")}
              autoComplete="off"
            />
            <Campo
              rotulo="Link do botão"
              name="ctaHref"
              maxLength={240}
              defaultValue={secao?.ctaHref ?? ""}
              erro={erroDoCampo(estado, "ctaHref")}
              ajuda="Endereço interno começa com / — por exemplo, /assistencia."
              autoComplete="off"
            />
          </Bloco>
        </div>

        <div className="space-y-5">
          <Bloco titulo="Publicação" descricao="Seção escondida não aparece na home.">
            <Marcador
              rotulo="Mostrar esta seção na home"
              name="published"
              defaultChecked={secao ? secao.published : true}
            />
          </Bloco>

          <Bloco titulo="Imagem" descricao="Usada pelos tipos que exibem foto.">
            <SeletorDeMidia
              nome="mediaId"
              rotulo="Imagem da seção"
              biblioteca={biblioteca}
              valorInicial={imagem}
              erro={erroDoCampo(estado, "mediaId")}
              ajuda="Opcional. Nem todo tipo de seção usa imagem."
            />
          </Bloco>
        </div>
      </div>

      <BarraDeSalvar aviso="A home é atualizada assim que você salva.">
        <Botao type="submit" carregando={pendente}>
          <Save className="size-4" aria-hidden />
          {criando ? "Criar seção" : "Salvar alterações"}
        </Botao>
      </BarraDeSalvar>
    </form>
  );
}
