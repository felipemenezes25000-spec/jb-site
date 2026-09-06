"use client";

import { useId, useState } from "react";
import { RefreshCw } from "lucide-react";

import { CAMPO_CODIGO, CAMPO_INICIO, CAMPO_ISCA } from "@/components/assistencia/rotulos";
import { Aviso } from "@/components/ui/aviso";
import { Erro } from "@/components/ui/form";
import { telHref } from "@/lib/format";

/**
 * Proteção dos formulários públicos, do lado do navegador.
 *
 * Três coisas viajam daqui: a isca invisível, o instante em que a página foi
 * montada e — só quando o servidor pede — o código da imagem.
 *
 * O instante NÃO é calculado aqui: ele chega por prop, carimbado pelo
 * componente de servidor que renderiza o formulário. Calcular no cliente daria
 * divergência de hidratação (o relógio do servidor e o do navegador não são o
 * mesmo) e ainda deixaria o valor à mercê do fuso do visitante.
 *
 * O código da imagem só aparece na escalada: quem envia pela primeira vez
 * nunca vê captcha. Isso é decisão de acessibilidade — `/api/captcha` não tem
 * alternativa em áudio, e ninguém pode ficar sem abrir um chamado por não
 * enxergar cinco letras tortas. Por isso o telefone da JB aparece logo abaixo:
 * é a saída de quem não consegue ler a imagem.
 */

export function Verificacao({
  inicio,
  exigirCodigo,
  erro,
  telefone,
  className,
}: {
  /** `Date.now()` do servidor, no momento em que a página foi montada. */
  inicio: number;
  exigirCodigo?: boolean;
  erro?: string;
  /** Telefone da JB, mostrado como saída para quem não consegue ler o código. */
  telefone?: string;
  className?: string;
}) {
  const idCampo = useId();
  const idImagem = `${idCampo}-imagem`;
  const [versao, setVersao] = useState(0);

  return (
    <div className={className}>
      {/* Isca: escondida de todo mundo, inclusive de leitor de tela. Robô que
          preenche tudo o que encontra no DOM se entrega aqui. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-9999px] top-auto h-px w-px overflow-hidden"
      >
        <label htmlFor={`${idCampo}-isca`}>Não preencha este campo</label>
        <input
          id={`${idCampo}-isca`}
          type="text"
          name={CAMPO_ISCA}
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <input type="hidden" name={CAMPO_INICIO} value={inicio} readOnly />

      {exigirCodigo ? (
        <Aviso tom="atencao" titulo="Confirme que é você">
          <p>
            Chegaram vários pedidos seguidos daqui. Digite as letras e os números da
            imagem para continuar.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <img
              /* A imagem é gerada a cada carregamento e assinada em cookie; o
                 parâmetro só serve para furar o cache do navegador. */
              src={`/api/captcha?v=${versao}`}
              alt="Código de verificação com cinco letras e números"
              width={150}
              height={44}
              id={idImagem}
              className="h-11 w-[150px] rounded-lg border border-graf-300 bg-white"
            />

            <button
              type="button"
              onClick={() => setVersao((v) => v + 1)}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-graf-700 transition-colors hover:bg-white hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
            >
              <RefreshCw className="size-4" aria-hidden />
              Gerar outra imagem
            </button>
          </div>

          <div className="mt-4 max-w-[14rem]">
            <label
              htmlFor={idCampo}
              className="mb-1.5 block text-sm font-semibold text-graf-800"
            >
              Código da imagem
            </label>
            <input
              id={idCampo}
              name={CAMPO_CODIGO}
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={5}
              aria-describedby={idImagem}
              aria-invalid={erro ? true : undefined}
              className="tabular h-11 w-full rounded-lg border border-graf-450 bg-white px-3.5 text-center text-lg font-bold uppercase tracking-[0.3em] text-graf-950 shadow-xs focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/15"
            />
            <Erro texto={erro} />
          </div>

          {telefone ? (
            <p className="mt-4 text-[0.8125rem] leading-relaxed text-graf-600">
              Não consegue ler o código? Ligue para{" "}
              <a
                href={telHref(telefone)}
                className="font-semibold text-jb-700 underline underline-offset-2"
              >
                {telefone}
              </a>{" "}
              e a equipe registra o pedido com você.
            </p>
          ) : null}
        </Aviso>
      ) : null}
    </div>
  );
}
