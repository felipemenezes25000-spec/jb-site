"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Check, Info, X } from "lucide-react";

import { lerEtiquetaDaFoto, type SugestaoDaEtiqueta } from "@/app/acoes/etiqueta";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/button";
import { Campo } from "@/components/ui/form";
import { cn } from "@/lib/utils";

/* ============================================================================
   Fotografe a etiqueta

   O componente inteiro existe em torno de uma regra: **nada do que a leitura
   sugere entra no cadastro sem alguém confirmar.** O que ele produz é uma
   sugestão editável, e o botão que a aplica escreve nos campos do formulário —
   que continua sendo salvo pelo caminho normal, com a validação normal.

   Quando não há mecanismo de OCR configurado, isto aqui não some da tela: ele
   diz que a leitura não está disponível e o formulário continua ali, do lado,
   funcionando. Esconder o botão faria a funcionalidade parecer inexistente; o
   que ela é, hoje, é declaradamente indisponível.
   ============================================================================ */

export type CamposAplicaveis = {
  marca: string;
  modelo: string;
  serie: string;
  voltagem: string;
};

/** O que o formulário pai faz com a sugestão confirmada. */
export type AoConfirmar = (campos: CamposAplicaveis) => void;

export function LeitorDeEtiqueta({
  aoConfirmar,
  className,
}: {
  aoConfirmar: AoConfirmar;
  className?: string;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [pendente, iniciar] = useTransition();
  const [resposta, setResposta] = useState<SugestaoDaEtiqueta | null>(null);

  /* Os valores editáveis. A sugestão é o ponto de partida; o que vai para o
     formulário é o que estiver aqui quando a pessoa confirmar. */
  const [campos, setCampos] = useState<CamposAplicaveis>({
    marca: "",
    modelo: "",
    serie: "",
    voltagem: "",
  });

  function enviar(arquivo: File) {
    const dados = new FormData();
    dados.set("foto", arquivo);

    iniciar(async () => {
      const resultado = await lerEtiquetaDaFoto(dados);
      setResposta(resultado);

      if (resultado.ok) {
        setCampos({
          marca: resultado.campos.marca?.valor ?? "",
          modelo: resultado.campos.modelo?.valor ?? "",
          serie: resultado.campos.serial?.valor ?? "",
          voltagem: resultado.campos.voltagem?.valor ?? "",
        });
      }
    });
  }

  return (
    <div className={cn("rounded-xl border border-graf-200 bg-graf-50 p-4", className)}>
      <p className="flex items-center gap-2 text-sm font-bold text-graf-950">
        <Camera className="size-4 shrink-0 text-graf-500" aria-hidden />
        Fotografe a etiqueta do equipamento
      </p>
      <p className="mt-1 text-[0.875rem] leading-relaxed text-graf-600">
        A etiqueta costuma ficar atrás ou embaixo do aparelho. A foto é lida e descartada — ela
        não é guardada.
      </p>

      {/* `capture="environment"` abre a câmera traseira direto no celular, que
          é onde esta ação é usada. No desktop, vira um seletor de arquivo
          comum, sem tratamento especial. */}
      <input
        ref={entrada}
        type="file"
        accept="image/*"
        capture="environment"
        /* O campo fica escondido e quem dispara é o botão logo abaixo — mas
           ele continua existindo na árvore, e um campo sem nome acessível é
           um campo que o leitor de tela anuncia como "arquivo, em branco". */
        aria-label="Foto da etiqueta do equipamento"
        tabIndex={-1}
        className="sr-only"
        onChange={(evento) => {
          const arquivo = evento.target.files?.[0];
          if (arquivo) enviar(arquivo);
          /* Zera o input: sem isso, fotografar a mesma etiqueta duas vezes
             seguidas não dispara `change` e a pessoa acha que travou. */
          evento.target.value = "";
        }}
      />

      <Botao
        type="button"
        variante="secundario"
        tamanho="sm"
        className="mt-3"
        carregando={pendente}
        onClick={() => entrada.current?.click()}
      >
        <Camera className="size-4" aria-hidden />
        {/* "Ler", não "tirar foto": a câmera aqui só extrai marca, modelo e
            número de série para preencher os campos — a imagem não é enviada
            nem guardada. Com o rótulo anterior a mesma tela parecia oferecer
            anexo de foto no primeiro passo e negá-lo no terceiro, onde o aviso
            de anexar fotos pede conta. São coisas diferentes. */}
        Ler etiqueta com a câmera
      </Botao>

      {resposta && !resposta.ok ? (
        <Aviso
          tom={resposta.motivo === "sem_mecanismo" ? "info" : "atencao"}
          className="mt-4"
          titulo={
            resposta.motivo === "sem_mecanismo"
              ? "Leitura automática indisponível"
              : "Não deu para aproveitar esta foto"
          }
        >
          {resposta.texto}
        </Aviso>
      ) : null}

      {resposta?.ok ? (
        <div className="mt-4 space-y-4 rounded-lg border border-graf-300 bg-white p-4">
          {/* A frase é a do escopo, ao pé da letra, e vem antes dos campos. */}
          <p className="text-corpo font-semibold text-graf-950">{resposta.aviso}</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <CampoSugerido
              rotulo="Marca"
              valor={campos.marca}
              aoMudar={(valor) => setCampos({ ...campos, marca: valor })}
              bruto={resposta.campos.marca?.bruto}
              confianca={resposta.campos.marca?.confianca ?? null}
            />
            <CampoSugerido
              rotulo="Modelo"
              valor={campos.modelo}
              aoMudar={(valor) => setCampos({ ...campos, modelo: valor })}
              bruto={resposta.campos.modelo?.bruto}
              confianca={resposta.campos.modelo?.confianca ?? null}
            />
            <CampoSugerido
              rotulo="Número de série"
              valor={campos.serie}
              aoMudar={(valor) => setCampos({ ...campos, serie: valor })}
              bruto={resposta.campos.serial?.bruto}
              confianca={resposta.campos.serial?.confianca ?? null}
              alternativas={resposta.campos.serial?.alternativas ?? []}
            />
            <CampoSugerido
              rotulo="Voltagem"
              valor={campos.voltagem}
              aoMudar={(valor) => setCampos({ ...campos, voltagem: valor })}
              bruto={resposta.campos.voltagem?.bruto}
              confianca={resposta.campos.voltagem?.confianca ?? null}
            />
          </div>

          {/* O limite do OCR, em toda leitura. Ele muda o que o número
              significa: identificar não é atestar. */}
          <p className="flex gap-2 border-t border-graf-200 pt-3 text-apoio leading-relaxed text-graf-500">
            <Info className="mt-0.5 size-3.5 shrink-0 text-graf-500" aria-hidden />
            <span>{resposta.limite}</span>
          </p>

          <div className="flex flex-wrap gap-2">
            <Botao
              type="button"
              tamanho="sm"
              onClick={() => {
                aoConfirmar(campos);
                setResposta(null);
              }}
            >
              <Check className="size-4" aria-hidden />
              Usar estes dados
            </Botao>
            <Botao
              type="button"
              variante="secundario"
              tamanho="sm"
              onClick={() => setResposta(null)}
            >
              <X className="size-4" aria-hidden />
              Descartar
            </Botao>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Um campo sugerido.
 *
 * Mostra o texto original ao lado quando ele difere do valor limpo — é o que
 * permite a alguém perceber que "Vitale-21" virou "Vitale 21" e decidir qual
 * dos dois é o modelo de verdade.
 *
 * As alternativas ambíguas viram botões. Elas não são "correções": são as
 * outras leituras possíveis do mesmo código, e quem tem o aparelho na frente
 * escolhe.
 */
function CampoSugerido({
  rotulo,
  valor,
  aoMudar,
  bruto,
  confianca,
  alternativas = [],
}: {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  bruto?: string;
  confianca: number | null;
  alternativas?: string[];
}) {
  return (
    <div>
      <Campo
        rotulo={rotulo}
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        ajuda={
          bruto && bruto.trim() !== valor.trim()
            ? `Na etiqueta: "${bruto}"`
            : /* Confiança nula é "não sei", e não zero. A tela cala em vez de
                 desenhar uma barra vazia que pareceria certeza de erro. */
              confianca !== null
              ? `Confiança da leitura: ${Math.round(confianca * 100)}%`
              : undefined
        }
      />

      {alternativas.length > 0 ? (
        <div className="mt-1.5">
          <p className="text-[0.75rem] text-graf-500">
            Caracteres parecidos. Confira no aparelho:
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {alternativas.map((alternativa) => (
              <button
                key={alternativa}
                type="button"
                onClick={() => aoMudar(alternativa)}
                className="label-mono rounded border border-graf-300 bg-white px-2 py-1 text-[0.75rem] text-graf-700 transition-colors hover:border-graf-400 hover:bg-graf-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
              >
                {alternativa}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
