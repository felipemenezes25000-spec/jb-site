"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";

import type { AcaoDeFormulario, EstadoAcao } from "@/components/admin/conteudo/botao-acao";
import {
  BarraDeSalvar,
  Bloco,
  MensagemDoFormulario,
  erroDoCampo,
} from "@/components/admin/conteudo/formulario-base";
import { SeletorDeMidia, type MidiaResumo } from "@/components/admin/conteudo/seletor-midia";
import { Botao } from "@/components/ui/button";
import { Campo, Marcador } from "@/components/ui/form";

/* ============================================================================
   Formulário de um slide do carrossel

   Vigência é opcional e serve para campanha com data: a partir de, até. Sem
   datas, o slide vale enquanto estiver publicado. As duas datas são lidas no
   fuso de São Paulo pelo servidor — a final conta o dia inteiro.
   ============================================================================ */

export type DadosDoSlide = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  published: boolean;
  /** AAAA-MM-DD, como o input espera. */
  startsAt: string;
  endsAt: string;
};

const VAZIO: EstadoAcao = {};

export function FormularioSlide({
  acao,
  slide,
  imagem,
  biblioteca,
}: {
  acao: AcaoDeFormulario;
  slide?: DadosDoSlide;
  imagem: MidiaResumo | null;
  biblioteca: MidiaResumo[];
}) {
  const [estado, executar, pendente] = useActionState(acao, VAZIO);
  const criando = !slide;

  return (
    <form action={executar} className="space-y-5">
      <input type="hidden" name="id" value={slide?.id ?? ""} />

      <MensagemDoFormulario estado={estado} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="space-y-5">
          <Bloco titulo="Conteúdo" descricao="Texto exibido sobre a imagem.">
            <Campo
              rotulo="Título"
              name="title"
              required
              maxLength={120}
              defaultValue={slide?.title ?? ""}
              erro={erroDoCampo(estado, "title")}
              autoComplete="off"
            />
            <Campo
              rotulo="Subtítulo"
              name="subtitle"
              maxLength={200}
              defaultValue={slide?.subtitle ?? ""}
              erro={erroDoCampo(estado, "subtitle")}
              autoComplete="off"
            />
            <Campo
              rotulo="Link do slide"
              name="href"
              maxLength={240}
              defaultValue={slide?.href ?? ""}
              erro={erroDoCampo(estado, "href")}
              ajuda="Para onde o slide leva ao ser clicado. Endereço interno começa com /."
              autoComplete="off"
            />
          </Bloco>

          <Bloco
            titulo="Vigência"
            descricao="Opcional. Fora do período, o slide não aparece mesmo publicado."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                rotulo="Começa em"
                name="startsAt"
                type="date"
                defaultValue={slide?.startsAt ?? ""}
                erro={erroDoCampo(estado, "startsAt")}
              />
              <Campo
                rotulo="Termina em"
                name="endsAt"
                type="date"
                defaultValue={slide?.endsAt ?? ""}
                erro={erroDoCampo(estado, "endsAt")}
                ajuda="Conta o dia inteiro."
              />
            </div>
          </Bloco>
        </div>

        <div className="space-y-5">
          <Bloco titulo="Publicação">
            <Marcador
              rotulo="Slide publicado"
              name="published"
              defaultChecked={slide ? slide.published : true}
            />
          </Bloco>

          <Bloco titulo="Imagem" descricao="Obrigatória: é o slide inteiro.">
            <SeletorDeMidia
              nome="imageId"
              rotulo="Imagem do slide"
              biblioteca={biblioteca}
              valorInicial={imagem}
              erro={erroDoCampo(estado, "imageId")}
              obrigatorio
              ajuda="Formato deitado, a partir de 1600 px de largura, para não borrar em tela grande."
            />
          </Bloco>
        </div>
      </div>

      <BarraDeSalvar>
        <Botao type="submit" carregando={pendente}>
          <Save className="size-4" aria-hidden />
          {criando ? "Criar slide" : "Salvar alterações"}
        </Botao>
      </BarraDeSalvar>
    </form>
  );
}
