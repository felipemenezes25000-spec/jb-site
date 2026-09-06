"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Pencil, Send } from "lucide-react";

import {
  OPCOES_URGENCIA,
  QUANDO_COMECOU,
  ROTULO_OPERACAO,
  TIPOS_PROBLEMA,
  type Operacao,
} from "@/components/assistencia/rotulos";
import { LeitorDeEtiqueta } from "@/components/conta/mj-leitor-etiqueta";
import { EnvioDeFotos } from "@/components/assistencia/envio-de-fotos";
import { Verificacao } from "@/components/assistencia/verificacao";
import { abrirChamadoPublico, type EstadoAssistencia } from "@/app/acoes/assistencia";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/button";
import { CampoCep, CampoTelefone } from "@/components/ui/campos-br";
import { Cartao } from "@/components/ui/data";
import { Area, Campo, Opcoes, Selecao } from "@/components/ui/form";
import { Passos } from "@/components/ui/passos";
import { somenteDigitos, whatsappHref } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Urgency } from "@prisma/client";

/**
 * Abertura de chamado em cinco passos.
 *
 * Três decisões estruturam este componente:
 *
 * 1. **Um formulário só.** As cinco etapas ficam todas montadas; o que muda é
 *    qual delas está visível. Assim nada se perde ao voltar, e o envio leva o
 *    conjunto inteiro — sem estado escondido em campo que já foi desmontado.
 *
 * 2. **Funciona sem JavaScript.** Antes da hidratação todas as etapas
 *    aparecem, uma embaixo da outra, com um botão de envio no fim. Depois da
 *    hidratação o assistente assume. Quem está sem script vê um formulário
 *    longo, não uma página quebrada.
 *
 * 3. **O rascunho sobrevive à recarga.** Tudo o que foi digitado fica em
 *    `sessionStorage` e volta ao recarregar — inclusive depois de sair para
 *    entrar na conta e anexar fotos. Some quando a aba fecha, e é apagado na
 *    página do chamado depois do envio.
 *
 * Nenhuma validação daqui é confiada: o `abrirChamadoPublico` valida tudo de
 * novo no servidor, e é ele quem manda. O que a conferência local faz é evitar
 * que a pessoa chegue ao fim do assistente para só então descobrir que faltava
 * uma linha na etapa dois — e por isso ela aponta o campo, não só a etapa.
 */

const CHAVE_RASCUNHO = "jb:chamado:rascunho";

export type EquipamentoEscolha = {
  id: string;
  nome: string;
  marca: string;
  modelo: string;
  serie: string;
  categoriaId: string | null;
  local: string;
};

export type UnidadeEscolha = {
  id: string;
  nome: string;
  endereco: string;
};

export type CategoriaEscolha = { id: string; nome: string };

type Rascunho = {
  equipamentoId: string;
  categoriaId: string;
  marca: string;
  modelo: string;
  serie: string;
  tipoProblema: string;
  descricao: string;
  urgencia: Urgency;
  comecou: string;
  aindaOpera: Operacao;
  /** "" = nada escolhido ainda, "novo" = outro endereço, resto = id da unidade. */
  unidadeEscolha: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  disponibilidade: string;
  nome: string;
  email: string;
  telefone: string;
};

const DISPONIBILIDADES = [
  "Manhã, das 8h às 12h",
  "Tarde, das 13h às 18h",
  "Qualquer horário comercial",
  "Preciso combinar por telefone",
];

/**
 * As cinco etapas. `proximo` é o nome da etapa seguinte escrito para caber no
 * botão — "Continuar para as fotos" diz o que vem, e "Continuar" sozinho não.
 */
const ETAPAS = [
  {
    rotulo: "Equipamento",
    descricao: "Qual aparelho precisa de atendimento",
    proximo: "o problema",
  },
  { rotulo: "Problema", descricao: "O que está acontecendo", proximo: "as fotos" },
  { rotulo: "Fotos", descricao: "Imagens ajudam a preparar a visita", proximo: "o local" },
  { rotulo: "Local e contato", descricao: "Onde e com quem falar", proximo: "a revisão" },
  { rotulo: "Revisão", descricao: "Confira e envie", proximo: "" },
];

const ULTIMA = ETAPAS.length - 1;

/** Em que etapa cada campo recusado pelo servidor mora. */
const ETAPA_DO_CAMPO: Record<string, number> = {
  equipamentoId: 0,
  categoriaId: 0,
  marca: 0,
  modelo: 0,
  serie: 0,
  tipoProblema: 1,
  descricao: 1,
  urgencia: 1,
  unidadeId: 3,
  cep: 3,
  nome: 3,
  email: 3,
  telefone: 3,
};

function vazio(
  cliente: { nome: string; email: string; telefone: string } | null,
  unidades: UnidadeEscolha[],
): Rascunho {
  return {
    equipamentoId: "",
    categoriaId: "",
    marca: "",
    modelo: "",
    serie: "",
    tipoProblema: "",
    descricao: "",
    urgencia: "normal",
    comecou: "",
    aindaOpera: "sim",
    // Com uma unidade só, escolher por ela não é presunção — é o único caso.
    unidadeEscolha: unidades.length === 1 ? unidades[0].id : "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    disponibilidade: "",
    nome: cliente?.nome ?? "",
    email: cliente?.email ?? "",
    telefone: cliente?.telefone ?? "",
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** O que a conferência local devolve: a frase e, quando dá, o campo culpado. */
type Pendencia = { campo?: string; texto: string };

/**
 * Manda o foco para a etapa que acabou de aparecer.
 *
 * Trocar de etapa esconde o botão que tinha o foco, e o foco cai no `<body>`:
 * o Tab seguinte recomeça do topo da página e o leitor de tela não diz que a
 * etapa mudou. Focar a seção visível resolve os dois.
 */
function useFocoNaEtapa(
  etapa: number,
  ativo: boolean,
  raiz: React.RefObject<HTMLElement | null>,
) {
  const primeira = useRef(true);

  useEffect(() => {
    if (!ativo) return;
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    const secao = raiz.current?.querySelector<HTMLElement>("section:not([hidden])");
    if (!secao) return;
    secao.tabIndex = -1;
    secao.focus({ preventScroll: true });
  }, [etapa, ativo, raiz]);
}

/** Leva o foco ao campo que faltou, sem o pulo seco do scroll automático. */
function focarCampo(raiz: HTMLElement | null, campo: string) {
  const alvo = raiz?.querySelector<HTMLElement>(`[name="${campo}"]:not([type="hidden"])`);
  if (!alvo) return;
  alvo.focus({ preventScroll: true });
  alvo.scrollIntoView({ behavior: "smooth", block: "center" });
}

export function AssistenteChamado({
  inicio,
  categorias,
  equipamentos,
  unidades,
  cliente,
  logado,
  telefone,
  whatsapp,
  className,
}: {
  inicio: number;
  categorias: CategoriaEscolha[];
  equipamentos: EquipamentoEscolha[];
  unidades: UnidadeEscolha[];
  cliente: { nome: string; email: string; telefone: string } | null;
  logado: boolean;
  telefone: string;
  whatsapp: string;
  className?: string;
}) {
  const [estado, acao, pendente] = useActionState<EstadoAssistencia, FormData>(
    abrirChamadoPublico,
    {},
  );

  const [dados, setDados] = useState<Rascunho>(() => vazio(cliente, unidades));
  const [etapa, setEtapa] = useState(0);
  const [montado, setMontado] = useState(false);
  const [pendencia, setPendencia] = useState<Pendencia | undefined>();
  const refTopo = useRef<HTMLDivElement>(null);
  const refRecado = useRef<HTMLDivElement>(null);
  useFocoNaEtapa(etapa, montado, refTopo);

  /* Hidratação: só aqui o assistente assume e o rascunho volta. */
  useEffect(() => {
    setMontado(true);
    try {
      const salvo = sessionStorage.getItem(CHAVE_RASCUNHO);
      if (!salvo) return;
      const lido = JSON.parse(salvo) as Partial<Rascunho>;
      setDados((atual) => ({ ...atual, ...lido }));
    } catch {
      // rascunho ilegível não pode impedir a abertura do chamado
    }
  }, []);

  useEffect(() => {
    if (!montado) return;
    try {
      sessionStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(dados));
    } catch {
      // aba anônima com armazenamento bloqueado: segue sem rascunho
    }
  }, [dados, montado]);

  /* Recusa do servidor devolve para a etapa do campo problemático. */
  useEffect(() => {
    if (!estado.campo) return;
    const destino = ETAPA_DO_CAMPO[estado.campo];
    if (destino === undefined) return;
    setEtapa(destino);
    refTopo.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [estado]);

  function alterar(mudanca: Partial<Rascunho>) {
    setDados((atual) => ({ ...atual, ...mudanca }));
    setPendencia(undefined);
  }

  const equipamentoEscolhido = equipamentos.find((e) => e.id === dados.equipamentoId) ?? null;
  const unidadeEscolhida = unidades.find((u) => u.id === dados.unidadeEscolha) ?? null;
  /** Sem unidade escolhida, o endereço é digitado — e aí ele é obrigatório. */
  const usaEnderecoDigitado = unidadeEscolhida === null;

  /** A recusa do servidor vem primeiro; a conferência local completa o resto. */
  function erroDoCampo(campo: string) {
    if (estado.campo === campo) return estado.erro;
    if (pendencia?.campo === campo) return pendencia.texto;
    return undefined;
  }

  function conferirEtapa(indice: number): Pendencia | undefined {
    if (indice === 0) {
      if (!dados.equipamentoId && !dados.categoriaId && !dados.marca && !dados.modelo) {
        return {
          texto: "Escolha um equipamento cadastrado ou diga o tipo, a marca ou o modelo.",
        };
      }
      return undefined;
    }
    if (indice === 1) {
      if (dados.descricao.trim().length < 15) {
        return {
          campo: "descricao",
          texto: "Conte o que está acontecendo com pelo menos 15 caracteres.",
        };
      }
      return undefined;
    }
    if (indice === 3) {
      if (dados.nome.trim().length < 3) {
        return {
          campo: "nome",
          texto: "Informe o nome de quem acompanha o atendimento.",
        };
      }
      if (!EMAIL.test(dados.email.trim())) {
        return { campo: "email", texto: "Informe um e-mail válido." };
      }
      if (somenteDigitos(dados.telefone).length < 10) {
        return { campo: "telefone", texto: "Informe o telefone com DDD." };
      }
      if (usaEnderecoDigitado && !dados.cidade.trim()) {
        return { campo: "cidade", texto: "Informe ao menos a cidade do atendimento." };
      }
      return undefined;
    }
    return undefined;
  }

  function avancar() {
    const problema = conferirEtapa(etapa);
    if (problema) {
      setPendencia(problema);
      if (problema.campo) focarCampo(refTopo.current, problema.campo);
      else refRecado.current?.focus();
      return;
    }
    setPendencia(undefined);
    setEtapa((atual) => Math.min(atual + 1, ULTIMA));
    refTopo.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function voltar() {
    setPendencia(undefined);
    setEtapa((atual) => Math.max(atual - 1, 0));
    refTopo.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /** Enter avança em vez de enviar o formulário no meio do caminho. */
  function aoTeclar(evento: React.KeyboardEvent<HTMLFormElement>) {
    if (evento.key !== "Enter" || !montado || etapa >= ULTIMA) return;
    const alvo = evento.target as HTMLElement;
    if (alvo.tagName === "TEXTAREA") return;
    evento.preventDefault();
    avancar();
  }

  const visivel = (indice: number) => !montado || indice === etapa;
  /** Sem script a contagem tem de aparecer em toda etapa; com script, a régua
      já diz onde a pessoa está no celular e o número completa no desktop. */
  const numeroSempre = !montado;
  /** Nome da etapa seguinte, para o botão dizer para onde ele leva. */
  const rotuloProximo = etapa < ULTIMA ? ETAPAS[etapa].proximo : "";

  return (
    <div className={className} ref={refTopo}>
      {/* A régua ocupa a largura inteira do cartão de propósito: no desktop ela
          precisa de espaço para as cinco etapas, enquanto o formulário abaixo
          fica na coluna estreita, que é onde se lê e se digita bem. */}
      {montado ? (
        <Passos
          passos={ETAPAS}
          atual={etapa}
          rotulo="Etapas do chamado"
          className="mb-9 border-b border-graf-200 pb-8"
        />
      ) : null}

      <div className="mx-auto w-full max-w-2xl">
        <form action={acao} onKeyDown={aoTeclar} noValidate>
          {/* ================================================= 1. equipamento */}
          <section hidden={!visivel(0)} aria-labelledby="etapa-equipamento">
            <CabecalhoEtapa
              id="etapa-equipamento"
              numero={1}
              numeroSempre={numeroSempre}
              titulo="Qual equipamento precisa de atendimento?"
              descricao={
                equipamentos.length > 0
                  ? "Escolher um equipamento já cadastrado leva o histórico dele junto para a equipe técnica."
                  : "Se não souber o modelo exato, o tipo do aparelho já basta para começarmos."
              }
            />

            <div className="mt-7 space-y-7">
              {equipamentos.length > 0 ? (
                <Opcoes
                  nome="equipamentoId"
                  rotulo="Equipamentos da sua conta"
                  valor={dados.equipamentoId}
                  aoMudar={(valor) => alterar({ equipamentoId: valor })}
                  opcoes={[
                    ...equipamentos.map((e) => ({
                      valor: e.id,
                      rotulo: e.nome,
                      descricao:
                        [e.marca, e.modelo].filter(Boolean).join(" ") ||
                        e.local ||
                        "Sem marca cadastrada",
                    })),
                    {
                      valor: "",
                      rotulo: "Outro equipamento",
                      descricao: "Não está na lista",
                    },
                  ]}
                />
              ) : null}

              {equipamentoEscolhido ? (
                <>
                  <Cartao className="bg-graf-50/70 p-5">
                    <p className="label-mono uppercase text-graf-500">
                      Equipamento do chamado
                    </p>
                    <p className="mt-2 text-base font-bold text-graf-950">
                      {equipamentoEscolhido.nome}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-graf-600">
                      {[equipamentoEscolhido.marca, equipamentoEscolhido.modelo]
                        .filter(Boolean)
                        .join(" ") || "Marca e modelo não cadastrados"}
                      {equipamentoEscolhido.serie
                        ? ` · Série ${equipamentoEscolhido.serie}`
                        : ""}
                    </p>
                    {equipamentoEscolhido.local ? (
                      <p className="mt-0.5 text-sm text-graf-500">
                        {equipamentoEscolhido.local}
                      </p>
                    ) : null}
                  </Cartao>
                  <input type="hidden" name="marca" value={equipamentoEscolhido.marca} />
                  <input type="hidden" name="modelo" value={equipamentoEscolhido.modelo} />
                  <input type="hidden" name="serie" value={equipamentoEscolhido.serie} />
                  <input
                    type="hidden"
                    name="categoriaId"
                    value={equipamentoEscolhido.categoriaId ?? ""}
                  />
                </>
              ) : (
                <Grupo
                  titulo="Identificação do aparelho"
                  descricao="Quanto mais completo, mais fácil separar a peça certa antes da visita."
                  divisor={equipamentos.length > 0}
                >
                  <Selecao
                    rotulo="Tipo de equipamento"
                    name="categoriaId"
                    value={dados.categoriaId}
                    onChange={(evento) => alterar({ categoriaId: evento.target.value })}
                    ajuda="Não achou o tipo? Escreva a marca e o modelo abaixo."
                    className="sm:max-w-sm"
                  >
                    <option value="">Escolha o tipo</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nome}
                      </option>
                    ))}
                  </Selecao>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Campo
                      rotulo="Marca"
                      name="marca"
                      value={dados.marca}
                      onChange={(evento) => alterar({ marca: evento.target.value })}
                      placeholder="Kavo, Gnatus, Dabi Atlante…"
                      autoComplete="off"
                    />
                    <Campo
                      rotulo="Modelo"
                      name="modelo"
                      value={dados.modelo}
                      onChange={(evento) => alterar({ modelo: evento.target.value })}
                      placeholder="Como está escrito no aparelho"
                      autoComplete="off"
                    />
                  </div>

                  <Campo
                    rotulo="Número de série"
                    name="serie"
                    value={dados.serie}
                    onChange={(evento) => alterar({ serie: evento.target.value })}
                    ajuda="Costuma ficar em uma etiqueta na traseira ou na base do aparelho."
                    autoComplete="off"
                    className="sm:max-w-sm"
                  />

                  {/* A mesma leitura de etiqueta do cadastro de equipamento.
                      Aqui ela poupa digitação de quem está com o aparelho na
                      frente e o celular na mão — e continua exigindo conferência
                      antes de preencher qualquer campo. */}
                  <LeitorDeEtiqueta
                    aoConfirmar={(campos) =>
                      alterar({
                        marca: campos.marca || dados.marca,
                        modelo: campos.modelo || dados.modelo,
                        serie: campos.serie || dados.serie,
                      })
                    }
                  />
                </Grupo>
              )}
            </div>
          </section>

          {/* ===================================================== 2. problema */}
          <section
            hidden={!visivel(1)}
            aria-labelledby="etapa-problema"
            className={montado ? undefined : "mt-12 border-t border-graf-200 pt-10"}
          >
            <CabecalhoEtapa
              id="etapa-problema"
              numero={2}
              numeroSempre={numeroSempre}
              titulo="O que está acontecendo?"
              descricao="Quanto mais concreto o relato, menor a chance de o técnico chegar sem a peça certa."
            />

            <div className="mt-7 space-y-7">
              <Grupo>
                <Selecao
                  rotulo="Sintoma principal"
                  name="tipoProblema"
                  value={dados.tipoProblema}
                  onChange={(evento) => alterar({ tipoProblema: evento.target.value })}
                  className="sm:max-w-sm"
                >
                  <option value="">Escolha o que mais se aproxima</option>
                  {TIPOS_PROBLEMA.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </Selecao>

                <Area
                  rotulo="Descreva o problema"
                  name="descricao"
                  required
                  rows={6}
                  value={dados.descricao}
                  onChange={(evento) => alterar({ descricao: evento.target.value })}
                  placeholder="Ex.: o refletor pisca quando a cadeira sobe e apaga depois de alguns segundos."
                  ajuda="Conte quando acontece, se faz barulho e se já tentaram algum reparo."
                  erro={erroDoCampo("descricao")}
                />
              </Grupo>

              <Grupo
                titulo="Como isso afeta a clínica"
                descricao="É o que define a ordem de atendimento na fila da equipe."
                divisor
              >
                <Opcoes
                  nome="urgencia"
                  rotulo="Urgência"
                  valor={dados.urgencia}
                  aoMudar={(valor) => alterar({ urgencia: valor })}
                  opcoes={OPCOES_URGENCIA}
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <Selecao
                    rotulo="Quando começou"
                    name="comecou"
                    value={dados.comecou}
                    onChange={(evento) => alterar({ comecou: evento.target.value })}
                  >
                    <option value="">Não sei precisar</option>
                    {QUANDO_COMECOU.map((quando) => (
                      <option key={quando} value={quando}>
                        {quando}
                      </option>
                    ))}
                  </Selecao>

                  <Opcoes
                    nome="aindaOpera"
                    rotulo="O equipamento ainda opera?"
                    valor={dados.aindaOpera}
                    aoMudar={(valor) => alterar({ aindaOpera: valor })}
                    opcoes={(Object.keys(ROTULO_OPERACAO) as Operacao[]).map((chave) => ({
                      valor: chave,
                      rotulo: ROTULO_OPERACAO[chave],
                    }))}
                  />
                </div>
              </Grupo>
            </div>
          </section>

          {/* ======================================================== 3. fotos */}
          <section
            hidden={!visivel(2)}
            aria-labelledby="etapa-fotos"
            className={montado ? undefined : "mt-12 border-t border-graf-200 pt-10"}
          >
            <CabecalhoEtapa
              id="etapa-fotos"
              numero={3}
              numeroSempre={numeroSempre}
              titulo="Fotos do problema"
              descricao="Esta etapa é opcional, mas ajuda muito: a foto da etiqueta de identificação e a do ponto com defeito costumam resolver metade do diagnóstico."
            />

            <div className="mt-7 space-y-6">
              {logado ? (
                <EnvioDeFotos />
              ) : (
                <Aviso tom="info" titulo="Para anexar fotos, entre na sua conta">
                  <p>
                    O que você já preencheu fica guardado nesta aba, então dá para{" "}
                    <Link
                      href="/entrar?destino=/assistencia-tecnica/solicitar"
                      className="font-semibold text-jb-700 underline underline-offset-2"
                    >
                      entrar na conta
                    </Link>{" "}
                    e voltar sem perder nada. Também dá para seguir sem foto e mandar as
                    imagens depois pelo WhatsApp.
                  </p>
                </Aviso>
              )}

              {whatsapp ? (
                <p className="text-[0.8125rem] leading-relaxed text-graf-500">
                  Tem um vídeo curto do problema? Pelo site entram imagens e PDF; o vídeo
                  vai pelo{" "}
                  <a
                    href={whatsappHref(
                      whatsapp,
                      "Olá! Vou enviar um vídeo do problema do meu equipamento.",
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-jb-700 underline underline-offset-2"
                  >
                    WhatsApp da JB
                  </a>
                  , com o número do chamado na mensagem.
                </p>
              ) : null}
            </div>
          </section>

          {/* ============================================== 4. local e contato */}
          <section
            hidden={!visivel(3)}
            aria-labelledby="etapa-local"
            className={montado ? undefined : "mt-12 border-t border-graf-200 pt-10"}
          >
            <CabecalhoEtapa
              id="etapa-local"
              numero={4}
              numeroSempre={numeroSempre}
              titulo="Onde é o atendimento e com quem falamos?"
              descricao="O endereço define a rota do técnico; o contato é por onde o andamento chega até você."
            />

            <div className="mt-7 space-y-7">
              <Grupo titulo="Endereço do atendimento">
                {logado && unidades.length > 0 ? (
                  <Opcoes
                    nome="unidadeEscolha"
                    rotulo="Unidade"
                    valor={dados.unidadeEscolha}
                    aoMudar={(valor) => alterar({ unidadeEscolha: valor })}
                    opcoes={[
                      ...unidades.map((u) => ({
                        valor: u.id,
                        rotulo: u.nome,
                        descricao: u.endereco || "Endereço não cadastrado",
                      })),
                      { valor: "novo", rotulo: "Outro endereço", descricao: "Digitar abaixo" },
                    ]}
                  />
                ) : null}

                {/* O que o servidor lê é este campo: a escolha "novo" vira endereço
                    digitado, e nunca um id inventado. */}
                <input
                  type="hidden"
                  name="unidadeId"
                  value={unidadeEscolhida ? unidadeEscolhida.id : ""}
                />

                {unidadeEscolhida ? (
                  <p className="text-[0.9375rem] leading-relaxed text-graf-600">
                    O atendimento será no endereço cadastrado de{" "}
                    <strong className="font-semibold text-graf-950">
                      {unidadeEscolhida.nome}
                    </strong>
                    .
                  </p>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-6">
                    <CampoCep
                      name="cep"
                      valor={dados.cep}
                      aoMudar={(valor) => alterar({ cep: valor })}
                      aoEncontrar={(endereco) =>
                        alterar({
                          cep: endereco.cep,
                          logradouro: endereco.logradouro,
                          bairro: endereco.bairro,
                          cidade: endereco.cidade,
                          uf: endereco.uf,
                        })
                      }
                      ajuda="Preenche o endereço sozinho."
                      className="sm:col-span-2"
                    />
                    <Campo
                      rotulo="Endereço"
                      name="logradouro"
                      value={dados.logradouro}
                      onChange={(evento) => alterar({ logradouro: evento.target.value })}
                      autoComplete="street-address"
                      className="sm:col-span-4"
                    />
                    <Campo
                      rotulo="Número"
                      name="numero"
                      value={dados.numero}
                      onChange={(evento) => alterar({ numero: evento.target.value })}
                      className="sm:col-span-2"
                    />
                    <Campo
                      rotulo="Complemento"
                      name="complemento"
                      value={dados.complemento}
                      onChange={(evento) => alterar({ complemento: evento.target.value })}
                      placeholder="Sala, andar, bloco"
                      className="sm:col-span-4"
                    />
                    <Campo
                      rotulo="Bairro"
                      name="bairro"
                      value={dados.bairro}
                      onChange={(evento) => alterar({ bairro: evento.target.value })}
                      className="sm:col-span-3"
                    />
                    <Campo
                      rotulo="Cidade"
                      name="cidade"
                      value={dados.cidade}
                      onChange={(evento) => alterar({ cidade: evento.target.value })}
                      autoComplete="address-level2"
                      erro={erroDoCampo("cidade")}
                      className="sm:col-span-2"
                    />
                    <Campo
                      rotulo="UF"
                      name="uf"
                      value={dados.uf}
                      onChange={(evento) => alterar({ uf: evento.target.value.toUpperCase() })}
                      maxLength={2}
                      autoComplete="address-level1"
                      className="sm:col-span-1"
                    />
                  </div>
                )}

                <Selecao
                  rotulo="Melhor horário para a visita"
                  name="disponibilidade"
                  value={dados.disponibilidade}
                  onChange={(evento) => alterar({ disponibilidade: evento.target.value })}
                  className="sm:max-w-sm"
                >
                  <option value="">Sem preferência</option>
                  {DISPONIBILIDADES.map((faixa) => (
                    <option key={faixa} value={faixa}>
                      {faixa}
                    </option>
                  ))}
                </Selecao>
              </Grupo>

              <Grupo
                titulo="Quem acompanha o atendimento"
                descricao="É com esta pessoa que a equipe fala para confirmar a visita."
                divisor
              >
                <Campo
                  rotulo="Nome de quem acompanha"
                  name="nome"
                  required
                  value={dados.nome}
                  onChange={(evento) => alterar({ nome: evento.target.value })}
                  autoComplete="name"
                  erro={erroDoCampo("nome")}
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <Campo
                    rotulo="E-mail"
                    name="email"
                    type="email"
                    required
                    value={dados.email}
                    onChange={(evento) => alterar({ email: evento.target.value })}
                    autoComplete="email"
                    ajuda="É por aqui que o andamento do chamado chega."
                    erro={erroDoCampo("email")}
                  />
                  <CampoTelefone
                    name="telefone"
                    required
                    valor={dados.telefone}
                    aoMudar={(valor) => alterar({ telefone: valor })}
                    ajuda="Com DDD, de preferência um celular."
                    erro={erroDoCampo("telefone")}
                  />
                </div>
              </Grupo>
            </div>
          </section>

          {/* ====================================================== 5. revisão */}
          <section
            hidden={!visivel(4)}
            aria-labelledby="etapa-revisao"
            className={montado ? undefined : "mt-12 border-t border-graf-200 pt-10"}
          >
            <CabecalhoEtapa
              id="etapa-revisao"
              numero={5}
              numeroSempre={numeroSempre}
              titulo={montado ? "Confira antes de enviar" : "Enviar o chamado"}
              descricao="Ao enviar, o chamado ganha um número e entra na fila da equipe técnica. É por esse número que tudo é acompanhado."
            />

            {/* O resumo só faz sentido depois da hidratação: sem JavaScript os
                campos acima estão todos visíveis e repetir tudo aqui seria ruído. */}
            <Cartao hidden={!montado} className="mt-7 divide-y divide-graf-200">
              <Resumo
                rotulo="Equipamento"
                valor={
                  equipamentoEscolhido
                    ? equipamentoEscolhido.nome
                    : [
                        categorias.find((c) => c.id === dados.categoriaId)?.nome,
                        dados.marca,
                        dados.modelo,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                }
                aoEditar={() => setEtapa(0)}
              />
              <Resumo
                rotulo="Problema"
                valor={[dados.tipoProblema, dados.descricao].filter(Boolean).join(" — ")}
                aoEditar={() => setEtapa(1)}
              />
              <Resumo
                rotulo="Urgência"
                valor={OPCOES_URGENCIA.find((o) => o.valor === dados.urgencia)?.rotulo}
                aoEditar={() => setEtapa(1)}
              />
              <Resumo
                rotulo="Local"
                valor={
                  unidadeEscolhida
                    ? `${unidadeEscolhida.nome} — ${unidadeEscolhida.endereco}`
                    : [
                        [dados.logradouro, dados.numero].filter(Boolean).join(", "),
                        dados.bairro,
                        [dados.cidade, dados.uf].filter(Boolean).join("/"),
                      ]
                        .filter(Boolean)
                        .join(" — ")
                }
                aoEditar={() => setEtapa(3)}
              />
              <Resumo
                rotulo="Horário preferido"
                valor={dados.disponibilidade}
                aoEditar={() => setEtapa(3)}
              />
              <Resumo
                rotulo="Contato"
                valor={[dados.nome, dados.email, dados.telefone].filter(Boolean).join(" · ")}
                aoEditar={() => setEtapa(3)}
              />
            </Cartao>

            <Verificacao
              inicio={inicio}
              exigirCodigo={estado.exigirCodigo}
              erro={estado.campo === "codigo_da_imagem" ? estado.erro : undefined}
              telefone={telefone}
              className="mt-6"
            />

            <p className="mt-6 text-[0.8125rem] leading-relaxed text-graf-500">
              Ao enviar, você concorda que a JB use os dados acima para o atendimento deste
              chamado.
            </p>
          </section>

          {/* --------------------------------------------------------- erros */}
          <div
            ref={refRecado}
            tabIndex={-1}
            aria-live="polite"
            className="mt-7 empty:mt-0"
          >
            {/* Quando a pendência tem campo, a frase inteira já está colada
                ao campo — e o foco foi levado até lá. Repeti-la aqui faria o
                leitor de tela anunciar a mesma coisa duas vezes e deixaria o
                mesmo texto em dois lugares da tela. Neste caso o recado só
                aponta; sem campo (a etapa 1, que valida o conjunto), ele é o
                único lugar em que a frase existe. */}
            {pendencia ? (
              <Aviso tom="atencao" titulo="Falta uma informação">
                {pendencia.campo
                  ? "Confira o campo destacado acima para continuar."
                  : pendencia.texto}
              </Aviso>
            ) : null}
            {estado.erro && !pendencia ? <Aviso tom="erro">{estado.erro}</Aviso> : null}
          </div>

          {/* ------------------------------------------------------ navegação */}
          <div
            className={cn(
              "mt-8 flex flex-wrap items-center gap-3 border-t border-graf-200 pt-7",
              montado && etapa > 0 ? "justify-between" : "justify-end",
            )}
          >
            {montado && etapa > 0 ? (
              <Botao
                type="button"
                variante="secundario"
                tamanho="lg"
                onClick={voltar}
                disabled={pendente}
                /* No celular os dois botões ocupam a linha inteira: lado a lado
                   em 360px eles se espremiam abaixo do alvo de toque. */
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="size-4" aria-hidden />
                Voltar
              </Botao>
            ) : null}

            {/*
              As chaves impedem o React de reaproveitar o mesmo <button> entre os
              dois ramos. Sem elas o nó era reaproveitado e só o `type` mudava:
              como a mudança de estado do clique é síncrona, o navegador executava
              a ação padrão já com `type="submit"` e o "Continuar" da última etapa
              de preenchimento enviava o chamado sem passar pela revisão.
            */}
            {montado && etapa < ULTIMA ? (
              <Botao
                key="avancar"
                type="button"
                tamanho="lg"
                onClick={avancar}
                className="w-full sm:w-auto"
              >
                <span>
                  Continuar
                  {rotuloProximo ? (
                    <span className="hidden sm:inline"> para {rotuloProximo}</span>
                  ) : null}
                </span>
                <ArrowRight className="size-4" aria-hidden />
              </Botao>
            ) : (
              <Botao
                key="enviar"
                type="submit"
                tamanho="lg"
                carregando={pendente}
                className="w-full sm:w-auto"
              >
                {pendente ? null : <Send className="size-4" aria-hidden />}
                {pendente ? "Enviando chamado…" : "Enviar chamado"}
              </Botao>
            )}
          </div>

          {pendente ? (
            <p role="status" className="mt-4 text-[0.8125rem] text-graf-500">
              Estamos registrando o chamado. Não feche esta página.
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}

/**
 * Cabeçalho de uma etapa.
 *
 * A contagem aparece por escrito, e não só pela cor da régua: no celular a
 * própria régua já diz "Etapa 2 de 5", então aqui o número entra a partir de
 * 1024px — e sempre, quando não há script e a régua não existe.
 */
function CabecalhoEtapa({
  id,
  numero,
  numeroSempre,
  titulo,
  descricao,
}: {
  id: string;
  numero: number;
  numeroSempre: boolean;
  titulo: string;
  descricao?: string;
}) {
  return (
    <div>
      <p
        className={cn(
          "label-mono mb-2 uppercase text-graf-500",
          !numeroSempre && "hidden lg:block",
        )}
      >
        Passo {numero} de {ETAPAS.length}
      </p>
      <h2 id={id} className="text-title texto-forte">
        {titulo}
      </h2>
      {descricao ? (
        <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-graf-500">{descricao}</p>
      ) : null}
    </div>
  );
}

/**
 * Bloco de campos que pertencem à mesma pergunta.
 *
 * O fio acima separa um assunto do outro dentro da etapa — endereço de um
 * lado, contato do outro — para que a etapa não vire uma pilha de caixas sem
 * começo nem fim.
 */
function Grupo({
  titulo,
  descricao,
  divisor,
  children,
  className,
}: {
  titulo?: string;
  descricao?: string;
  /** Fio acima do bloco, a partir do segundo assunto da etapa. */
  divisor?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const temCabecalho = Boolean(titulo || descricao);

  return (
    <div className={cn(divisor && "border-t border-graf-200 pt-7", className)}>
      {titulo ? <h3 className="text-[0.9375rem] font-bold text-graf-950">{titulo}</h3> : null}
      {descricao ? (
        <p className="mt-1.5 text-sm leading-relaxed text-graf-500">{descricao}</p>
      ) : null}
      <div className={cn("grid gap-5", temCabecalho && "mt-5")}>{children}</div>
    </div>
  );
}

/** Uma linha do resumo. Campo sem valor não vira linha vazia: simplesmente sai. */
function Resumo({
  rotulo,
  valor,
  aoEditar,
}: {
  rotulo: string;
  valor?: string;
  aoEditar: () => void;
}) {
  const texto = valor?.trim();
  if (!texto) return null;

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 py-4">
      <div className="min-w-0 flex-1">
        <p className="label-mono uppercase text-graf-500">{rotulo}</p>
        <p className="mt-1.5 whitespace-pre-line break-words text-[0.9375rem] leading-relaxed text-graf-900">
          {texto}
        </p>
      </div>
      <button
        type="button"
        onClick={aoEditar}
        className="-mr-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-jb-700 transition-colors hover:bg-jb-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
      >
        <Pencil className="size-3.5" aria-hidden />
        Editar
        <span className="sr-only"> {rotulo.toLowerCase()}</span>
      </button>
    </div>
  );
}
