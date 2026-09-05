"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";

import {
  OPCOES_URGENCIA,
  QUANDO_COMECOU,
  ROTULO_OPERACAO,
  TIPOS_PROBLEMA,
  type Operacao,
} from "@/components/assistencia/rotulos";
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
 * novo no servidor, e é ele quem manda.
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

const ETAPAS = [
  { rotulo: "Equipamento", descricao: "Qual aparelho precisa de atendimento" },
  { rotulo: "Problema", descricao: "O que está acontecendo" },
  { rotulo: "Fotos", descricao: "Imagens ajudam na triagem" },
  { rotulo: "Local e contato", descricao: "Onde e com quem falar" },
  { rotulo: "Revisão", descricao: "Confira e envie" },
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

/**
 * Manda o foco para a etapa que acabou de aparecer.
 *
 * Trocar de etapa esconde o botão que tinha o foco, e o foco cai no `<body>`:
 * o Tab seguinte recomeça do topo da página e o leitor de tela não diz que a
 * etapa mudou. Focar a seção visível resolve os dois.
 */
function usarFocoNaEtapa(
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
  const [erroEtapa, setErroEtapa] = useState<string | undefined>();
  const refTopo = useRef<HTMLDivElement>(null);
  usarFocoNaEtapa(etapa, montado, refTopo);

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
    if (destino !== undefined) setEtapa(destino);
  }, [estado]);

  function alterar(mudanca: Partial<Rascunho>) {
    setDados((atual) => ({ ...atual, ...mudanca }));
    setErroEtapa(undefined);
  }

  const equipamentoEscolhido = equipamentos.find((e) => e.id === dados.equipamentoId) ?? null;
  const unidadeEscolhida = unidades.find((u) => u.id === dados.unidadeEscolha) ?? null;
  /** Sem unidade escolhida, o endereço é digitado — e aí ele é obrigatório. */
  const usaEnderecoDigitado = unidadeEscolhida === null;

  function conferirEtapa(indice: number): string | undefined {
    if (indice === 0) {
      if (!dados.equipamentoId && !dados.categoriaId && !dados.marca && !dados.modelo) {
        return "Escolha um equipamento cadastrado ou diga o tipo, a marca ou o modelo.";
      }
      return undefined;
    }
    if (indice === 1) {
      if (dados.descricao.trim().length < 15) {
        return "Conte o que está acontecendo com pelo menos 15 caracteres.";
      }
      return undefined;
    }
    if (indice === 3) {
      if (dados.nome.trim().length < 3) return "Informe o nome de quem acompanha o atendimento.";
      if (!EMAIL.test(dados.email.trim())) return "Informe um e-mail válido.";
      if (somenteDigitos(dados.telefone).length < 10) return "Informe o telefone com DDD.";
      if (usaEnderecoDigitado && !dados.cidade.trim()) {
        return "Informe ao menos a cidade do atendimento.";
      }
      return undefined;
    }
    return undefined;
  }

  function avancar() {
    const problema = conferirEtapa(etapa);
    if (problema) {
      setErroEtapa(problema);
      return;
    }
    setErroEtapa(undefined);
    setEtapa((atual) => Math.min(atual + 1, ULTIMA));
    refTopo.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function voltar() {
    setErroEtapa(undefined);
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

  return (
    <div className={className} ref={refTopo}>
      {montado ? (
        <Passos passos={ETAPAS} atual={etapa} rotulo="Etapas do chamado" className="mb-8" />
      ) : null}

      <form action={acao} onKeyDown={aoTeclar} noValidate>
        {/* ================================================= 1. equipamento */}
        <section hidden={!visivel(0)} aria-labelledby="etapa-equipamento">
          <h2 id="etapa-equipamento" className="text-lg font-bold text-graf-950">
            Qual equipamento precisa de atendimento?
          </h2>

          {equipamentos.length > 0 ? (
            <>
              <p className="mt-1 text-sm text-graf-600">
                Escolher um equipamento já cadastrado leva o histórico dele junto para a
                triagem.
              </p>
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
                className="mt-5"
              />
            </>
          ) : (
            <p className="mt-1 text-sm text-graf-600">
              Descreva o aparelho. Se não souber o modelo exato, o tipo já basta para
              começarmos.
            </p>
          )}

          {equipamentoEscolhido ? (
            <>
              <Cartao className="mt-5 p-4">
                <p className="text-sm font-bold text-graf-900">{equipamentoEscolhido.nome}</p>
                <p className="mt-1 text-sm text-graf-600">
                  {[equipamentoEscolhido.marca, equipamentoEscolhido.modelo]
                    .filter(Boolean)
                    .join(" ") || "Marca e modelo não cadastrados"}
                  {equipamentoEscolhido.serie ? ` · Série ${equipamentoEscolhido.serie}` : ""}
                </p>
                {equipamentoEscolhido.local ? (
                  <p className="mt-0.5 text-sm text-graf-500">{equipamentoEscolhido.local}</p>
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
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Selecao
                rotulo="Tipo de equipamento"
                name="categoriaId"
                value={dados.categoriaId}
                onChange={(evento) => alterar({ categoriaId: evento.target.value })}
                className="sm:col-span-2"
                ajuda="Não achou o tipo? Escreva a marca e o modelo abaixo."
              >
                <option value="">Escolha o tipo</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </Selecao>

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
              <Campo
                rotulo="Número de série"
                name="serie"
                value={dados.serie}
                onChange={(evento) => alterar({ serie: evento.target.value })}
                ajuda="Costuma ficar em uma etiqueta na traseira ou na base."
                autoComplete="off"
                className="sm:col-span-2"
              />
            </div>
          )}
        </section>

        {/* ===================================================== 2. problema */}
        <section
          hidden={!visivel(1)}
          aria-labelledby="etapa-problema"
          className={montado ? undefined : "mt-12 border-t border-graf-200 pt-10"}
        >
          <h2 id="etapa-problema" className="text-lg font-bold text-graf-950">
            O que está acontecendo?
          </h2>
          <p className="mt-1 text-sm text-graf-600">
            Quanto mais concreto o relato, menor a chance de o técnico chegar sem a peça
            certa.
          </p>

          <div className="mt-5 grid gap-5">
            <Selecao
              rotulo="Sintoma principal"
              name="tipoProblema"
              value={dados.tipoProblema}
              onChange={(evento) => alterar({ tipoProblema: evento.target.value })}
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
              erro={estado.campo === "descricao" ? estado.erro : undefined}
            />

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
          </div>
        </section>

        {/* ======================================================== 3. fotos */}
        <section
          hidden={!visivel(2)}
          aria-labelledby="etapa-fotos"
          className={montado ? undefined : "mt-12 border-t border-graf-200 pt-10"}
        >
          <h2 id="etapa-fotos" className="text-lg font-bold text-graf-950">
            Fotos do problema
          </h2>
          <p className="mt-1 text-sm text-graf-600">
            Opcional, mas ajuda muito: a foto da etiqueta de identificação e a do ponto com
            defeito costumam resolver metade da triagem.
          </p>

          {logado ? (
            <EnvioDeFotos className="mt-5" />
          ) : (
            <Aviso tom="info" titulo="Anexo de arquivo pede conta" className="mt-5">
              <p>
                Para enviar fotos pelo site é preciso estar com a conta aberta. Seu rascunho
                fica salvo nesta aba, então dá para{" "}
                <Link
                  href="/entrar?destino=/assistencia-tecnica/solicitar"
                  className="font-semibold text-jb-700 underline underline-offset-2"
                >
                  entrar na conta
                </Link>{" "}
                e voltar sem perder nada. Você também pode seguir sem foto e mandar as
                imagens depois pelo WhatsApp.
              </p>
            </Aviso>
          )}

          {whatsapp ? (
            <p className="mt-4 text-sm leading-relaxed text-graf-600">
              Tem um vídeo curto do problema? O envio pelo site aceita imagem e PDF; vídeo
              vai direto pelo{" "}
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
              , citando o número do chamado depois de enviá-lo.
            </p>
          ) : null}
        </section>

        {/* ============================================== 4. local e contato */}
        <section
          hidden={!visivel(3)}
          aria-labelledby="etapa-local"
          className={montado ? undefined : "mt-12 border-t border-graf-200 pt-10"}
        >
          <h2 id="etapa-local" className="text-lg font-bold text-graf-950">
            Onde é o atendimento e com quem falamos?
          </h2>

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
              className="mt-5"
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
            <p className="mt-4 text-sm text-graf-600">
              O atendimento será no endereço cadastrado de{" "}
              <strong className="font-semibold text-graf-900">{unidadeEscolhida.nome}</strong>.
            </p>
          ) : (
            <div className="mt-5 grid gap-5 sm:grid-cols-6">
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
            className="mt-5"
          >
            <option value="">Sem preferência</option>
            {DISPONIBILIDADES.map((faixa) => (
              <option key={faixa} value={faixa}>
                {faixa}
              </option>
            ))}
          </Selecao>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <Campo
              rotulo="Nome de quem acompanha"
              name="nome"
              required
              value={dados.nome}
              onChange={(evento) => alterar({ nome: evento.target.value })}
              autoComplete="name"
              erro={estado.campo === "nome" ? estado.erro : undefined}
              className="sm:col-span-2"
            />
            <Campo
              rotulo="E-mail"
              name="email"
              type="email"
              required
              value={dados.email}
              onChange={(evento) => alterar({ email: evento.target.value })}
              autoComplete="email"
              ajuda="É por aqui que o andamento do chamado chega."
              erro={estado.campo === "email" ? estado.erro : undefined}
            />
            <CampoTelefone
              name="telefone"
              required
              valor={dados.telefone}
              aoMudar={(valor) => alterar({ telefone: valor })}
              erro={estado.campo === "telefone" ? estado.erro : undefined}
            />
          </div>
        </section>

        {/* ====================================================== 5. revisão */}
        <section
          hidden={!visivel(4)}
          aria-labelledby="etapa-revisao"
          className={montado ? undefined : "mt-12 border-t border-graf-200 pt-10"}
        >
          <h2 id="etapa-revisao" className="text-lg font-bold text-graf-950">
            {montado ? "Confira antes de enviar" : "Enviar o chamado"}
          </h2>
          <p className="mt-1 text-sm text-graf-600">
            Ao enviar, o chamado ganha um número e entra na fila da equipe técnica.
          </p>

          {/* O resumo só faz sentido depois da hidratação: sem JavaScript os
              campos acima estão todos visíveis e repetir tudo aqui seria ruído. */}
          <Cartao hidden={!montado} className="mt-5 divide-y divide-graf-200">
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
              aoEditar={montado ? () => setEtapa(0) : undefined}
            />
            <Resumo
              rotulo="Problema"
              valor={
                [dados.tipoProblema, dados.descricao].filter(Boolean).join(" — ") ||
                "Ainda não descrito"
              }
              aoEditar={montado ? () => setEtapa(1) : undefined}
            />
            <Resumo
              rotulo="Urgência"
              valor={
                OPCOES_URGENCIA.find((o) => o.valor === dados.urgencia)?.rotulo ?? "Normal"
              }
              aoEditar={montado ? () => setEtapa(1) : undefined}
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
                      .join(" — ") || "A combinar com a equipe"
              }
              aoEditar={montado ? () => setEtapa(3) : undefined}
            />
            <Resumo
              rotulo="Contato"
              valor={[dados.nome, dados.email, dados.telefone].filter(Boolean).join(" · ")}
              aoEditar={montado ? () => setEtapa(3) : undefined}
            />
          </Cartao>

          <Verificacao
            inicio={inicio}
            exigirCodigo={estado.exigirCodigo}
            erro={estado.campo === "codigo_da_imagem" ? estado.erro : undefined}
            telefone={telefone}
            className="mt-6"
          />

          <p className="mt-6 text-xs leading-relaxed text-graf-500">
            Ao enviar, você concorda que a JB use os dados acima para o atendimento deste
            chamado.
          </p>
        </section>

        {/* --------------------------------------------------------- erros */}
        <div aria-live="polite" className="mt-6 empty:mt-0">
          {erroEtapa ? <Aviso tom="atencao">{erroEtapa}</Aviso> : null}
          {estado.erro && !erroEtapa ? <Aviso tom="erro">{estado.erro}</Aviso> : null}
        </div>

        {/* ------------------------------------------------------ navegação */}
        <div
          className={cn(
            "mt-8 flex flex-wrap items-center gap-3 border-t border-graf-200 pt-6",
            montado && etapa > 0 ? "justify-between" : "justify-end",
          )}
        >
          {montado && etapa > 0 ? (
            <Botao type="button" variante="secundario" onClick={voltar}>
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
            <Botao key="avancar" type="button" onClick={avancar}>
              Continuar
              <ArrowRight className="size-4" aria-hidden />
            </Botao>
          ) : (
            <Botao key="enviar" type="submit" tamanho="lg" carregando={pendente}>
              <Send className="size-4" aria-hidden />
              {pendente ? "Enviando chamado…" : "Enviar chamado"}
            </Botao>
          )}
        </div>
      </form>
    </div>
  );
}

function Resumo({
  rotulo,
  valor,
  aoEditar,
}: {
  rotulo: string;
  valor: string;
  aoEditar?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
      <div className="min-w-0 flex-1">
        <p className="label-mono uppercase text-graf-500">{rotulo}</p>
        <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-graf-900">
          {valor || "—"}
        </p>
      </div>
      {aoEditar ? (
        <button
          type="button"
          onClick={aoEditar}
          className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-jb-700 transition-colors hover:bg-jb-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
        >
          Editar
          <span className="sr-only"> {rotulo.toLowerCase()}</span>
        </button>
      ) : null}
    </div>
  );
}
