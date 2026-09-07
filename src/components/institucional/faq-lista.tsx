"use client";

import { useId, useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { Vazio } from "@/components/ui/data";
import { nl2br } from "@/lib/html";
import { plural } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Perguntas frequentes

   Acordeão de verdade: cada pergunta é um <button> com aria-expanded e
   aria-controls, e a resposta é uma região rotulada pelo botão. Serve com
   teclado, serve com leitor de tela e continua funcionando com o CSS
   desligado.

   A busca é do lado do cliente porque a lista inteira já veio do servidor —
   ir ao banco a cada tecla seria pior para todo mundo. Enquanto há termo
   digitado, os resultados aparecem abertos; qualquer clique manual passa a
   valer sobre esse padrão, e trocar o termo zera as escolhas manuais.
   ============================================================================ */

export type PerguntaFaq = { id: string; pergunta: string; resposta: string };
export type GrupoFaq = { chave: string; rotulo: string; perguntas: PerguntaFaq[] };

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function ListaDeFaq({ grupos }: { grupos: GrupoFaq[] }) {
  const idBusca = useId();
  const [termo, setTermo] = useState("");
  const [grupoAtivo, setGrupoAtivo] = useState<string>("todos");
  const [alternadas, setAlternadas] = useState<Record<string, boolean>>({});

  const busca = normalizar(termo.trim());
  const padraoAberto = busca.length >= 2;

  const filtrados = useMemo(() => {
    return grupos
      .filter((grupo) => grupoAtivo === "todos" || grupo.chave === grupoAtivo)
      .map((grupo) => ({
        ...grupo,
        perguntas:
          busca.length < 2
            ? grupo.perguntas
            : grupo.perguntas.filter((item) =>
                normalizar(`${item.pergunta} ${item.resposta}`).includes(busca),
              ),
      }))
      .filter((grupo) => grupo.perguntas.length > 0);
  }, [grupos, grupoAtivo, busca]);

  const total = filtrados.reduce((soma, grupo) => soma + grupo.perguntas.length, 0);
  const estaAberta = (id: string) => alternadas[id] ?? padraoAberto;

  function alternar(id: string) {
    setAlternadas((atual) => ({ ...atual, [id]: !estaAberta(id) }));
  }

  return (
    <div>
      <div className="flex flex-col gap-4">
        <div className="relative">
          <label htmlFor={idBusca} className="sr-only">
            Buscar nas perguntas frequentes
          </label>
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-graf-500"
            aria-hidden
          />
          <input
            id={idBusca}
            type="search"
            value={termo}
            onChange={(evento) => {
              setTermo(evento.currentTarget.value);
              setAlternadas({});
            }}
            placeholder="Buscar por palavra — garantia, orçamento, prazo…"
            className="h-12 w-full rounded-lg border border-graf-450 bg-white pl-11 pr-4 text-base sm:text-[0.9375rem] shadow-xs transition-colors placeholder:text-graf-500 hover:border-graf-500 focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/15"
          />
        </div>

        {grupos.length > 1 ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por assunto">
            {[{ chave: "todos", rotulo: "Todos os assuntos" }, ...grupos].map((grupo) => {
              const ativo = grupoAtivo === grupo.chave;
              return (
                <button
                  key={grupo.chave}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => {
                    setGrupoAtivo(grupo.chave);
                    setAlternadas({});
                  }}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-semibold transition-colors",
                    ativo
                      ? "border-jb-500 bg-jb-50 text-jb-800"
                      : "border-graf-300 bg-white text-graf-700 hover:border-graf-400 hover:bg-graf-50",
                  )}
                >
                  {grupo.rotulo}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <p className="mt-5 text-[0.8125rem] text-graf-500" aria-live="polite">
        {busca.length >= 2 || grupoAtivo !== "todos"
          ? `${plural(total, "pergunta encontrada", "perguntas encontradas")}.`
          : `${plural(total, "pergunta respondida", "perguntas respondidas")} nesta página.`}
      </p>

      {total === 0 ? (
        <Vazio
          className="mt-6"
          titulo="Nenhuma pergunta com esse termo"
          descricao="Tente outra palavra ou fale direto com a equipe da JB — a resposta pode virar uma nova pergunta aqui."
          acao={<LinkBotao href="/contato">Falar com a JB</LinkBotao>}
        />
      ) : (
        <div className="mt-6 space-y-10">
          {filtrados.map((grupo) => (
            <section key={grupo.chave}>
              {/* O título não pode ser `shrink-0`: um assunto longo em 360px
                  passaria a ser largura mínima e jogaria a página para fora
                  da tela. O fio é que cede espaço, nunca o texto. */}
              <div className="flex items-center gap-4">
                <h2 className="text-title texto-forte min-w-0">{grupo.rotulo}</h2>
                <span aria-hidden className="h-px min-w-6 flex-1 bg-graf-200" />
              </div>

              <ul className="mt-5 divide-y divide-graf-200 overflow-hidden rounded-xl border border-graf-200 bg-white">
                {grupo.perguntas.map((item) => {
                  const aberta = estaAberta(item.id);
                  return (
                    <li key={item.id}>
                      <h3>
                        <button
                          type="button"
                          id={`faq-botao-${item.id}`}
                          aria-expanded={aberta}
                          aria-controls={`faq-painel-${item.id}`}
                          onClick={() => alternar(item.id)}
                          className="foco-jb flex w-full items-start justify-between gap-4 px-5 py-4.5 text-left transition-colors hover:bg-graf-50 sm:px-6"
                        >
                          <span className="text-base font-semibold leading-snug text-graf-950">
                            {item.pergunta}
                          </span>
                          <ChevronDown
                            className={cn(
                              "mt-0.5 size-5 shrink-0 text-graf-500 transition-transform duration-200",
                              aberta && "rotate-180",
                            )}
                            aria-hidden
                          />
                        </button>
                      </h3>

                      <div
                        id={`faq-painel-${item.id}`}
                        role="region"
                        aria-labelledby={`faq-botao-${item.id}`}
                        hidden={!aberta}
                        className="px-5 pb-6 text-base leading-relaxed text-graf-600 sm:px-6"
                      >
                        {nl2br(item.resposta)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
