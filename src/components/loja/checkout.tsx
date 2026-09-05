"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  Lock,
  MapPin,
  Pencil,
  QrCode,
  Store,
  Truck,
  UserRound,
} from "lucide-react";

import { finalizarCompra, type EstadoCheckout } from "@/app/acoes/checkout";
import { PagamentoCartao, type DadosCartao } from "@/components/loja/pagamento-cartao";
import { ResumoPix } from "@/components/loja/pagamento-pix";
import { Aviso } from "@/components/ui/aviso";
import { Botao, LinkBotao } from "@/components/ui/button";
import { CampoCep, CampoDocumento, CampoTelefone, type EnderecoCep } from "@/components/ui/campos-br";
import { Cartao } from "@/components/ui/data";
import { Area, Campo, Marcador, Opcoes, Selecao } from "@/components/ui/form";
import { Passos } from "@/components/ui/passos";
import { documentoValido, formatarPreco, somenteDigitos } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Checkout — cinco etapas, uma submissão

   As etapas são de leitura, não de rede: todos os campos ficam montados o
   tempo todo e só a etapa corrente aparece. Isso dá duas coisas de graça —
   o formulário chega inteiro ao servidor de uma vez, e voltar uma etapa não
   perde nada do que já foi digitado.

   Nenhum preço sai daqui. O total exibido é informativo; o que vale é o que
   finalizarCompra recalcula a partir do carrinho no banco.
   ============================================================================ */

export type MetodoCheckout = "pix" | "cartao";

export type DadosIniciaisCheckout = {
  nome: string;
  email: string;
  telefone: string;
  tipoPessoa: "fisica" | "juridica";
  documento: string;
  razaoSocial: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  referencia: string;
};

const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
  "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

const ETAPAS = [
  { rotulo: "Identificação", descricao: "Como falamos com você" },
  { rotulo: "Dados", descricao: "Nome, contato e documento" },
  { rotulo: "Entrega", descricao: "Retirada ou entrega" },
  { rotulo: "Pagamento", descricao: "Pix ou cartão" },
  { rotulo: "Revisão", descricao: "Confira e finalize" },
];

const ULTIMA = ETAPAS.length - 1;

/** Para onde levar a pessoa quando o servidor recusa um campo. */
const ETAPA_DO_CAMPO: Record<string, number> = {
  email: 0,
  senha: 0,
  criarConta: 0,
  nome: 1,
  telefone: 1,
  tipoPessoa: 1,
  documento: 1,
  razaoSocial: 1,
  entrega: 2,
  cep: 2,
  logradouro: 2,
  numero: 2,
  complemento: 2,
  bairro: 2,
  cidade: 2,
  uf: 2,
  referencia: 2,
  metodo: 3,
  parcelas: 3,
  tokenCartao: 3,
  bandeira: 3,
  observacao: 4,
};

const EMAIL_PLAUSIVEL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function rolagemSuave() {
  if (typeof window === "undefined") return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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

function Secao({
  visivel,
  titulo,
  descricao,
  children,
}: {
  visivel: boolean;
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
}) {
  return (
    <section hidden={!visivel} className={cn(!visivel && "hidden")} aria-label={titulo}>
      <h2 className="text-xl font-bold text-graf-950">{titulo}</h2>
      {descricao ? (
        <p className="mt-1 text-sm leading-relaxed text-graf-600">{descricao}</p>
      ) : null}
      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}

function BlocoRevisao({
  titulo,
  aoEditar,
  children,
}: {
  titulo: string;
  aoEditar: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-graf-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-sm font-bold text-graf-900">{titulo}</h3>
        <button
          type="button"
          onClick={aoEditar}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-graf-600 transition-colors hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
        >
          <Pencil className="size-3.5" aria-hidden />
          Editar
          <span className="sr-only"> {titulo.toLowerCase()}</span>
        </button>
      </div>
      <div className="mt-1 text-sm leading-relaxed text-graf-700">{children}</div>
    </div>
  );
}

export function Checkout({
  logado,
  nomeCliente,
  inicial,
  retiradaDisponivel,
  enderecoJb,
  instrucoesRetirada,
  horarioJb,
  metodos,
  simulado,
  provedorNome,
  chavePublicaCartao,
  parcelas,
  totalCents,
}: {
  logado: boolean;
  nomeCliente: string;
  inicial: DadosIniciaisCheckout;
  retiradaDisponivel: boolean;
  enderecoJb: string;
  instrucoesRetirada: string;
  horarioJb: string;
  metodos: MetodoCheckout[];
  simulado: boolean;
  provedorNome: string;
  chavePublicaCartao: string;
  parcelas: { numero: number; valorCents: number }[];
  totalCents: number;
}) {
  const [estado, acao, enviando] = useActionState<EstadoCheckout, FormData>(finalizarCompra, {});
  const [etapa, setEtapa] = useState(0);
  const [erroLocal, setErroLocal] = useState("");

  const refFormulario = useRef<HTMLFormElement>(null);
  const refTopo = useRef<HTMLDivElement>(null);
  // rolar não basta: quem navega por teclado ou leitor de tela precisa que o
  // foco vá até o aviso, senão o erro passa despercebido e o Tab continua de
  // onde estava
  const refAviso = useRef<HTMLDivElement>(null);
  usarFocoNaEtapa(etapa, true, refFormulario);
  const refCampoParaFocar = useRef<string | null>(null);

  // identificação
  const [email, setEmail] = useState(inicial.email);
  const [criarConta, setCriarConta] = useState(false);
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // comprador
  const [nome, setNome] = useState(inicial.nome);
  const [telefone, setTelefone] = useState(inicial.telefone);
  const [tipoPessoa, setTipoPessoa] = useState<"fisica" | "juridica">(inicial.tipoPessoa);
  const [documento, setDocumento] = useState(inicial.documento);
  const [razaoSocial, setRazaoSocial] = useState(inicial.razaoSocial);

  // entrega
  const [entrega, setEntrega] = useState<"retirada" | "entrega">(
    retiradaDisponivel ? "retirada" : "entrega",
  );
  const [cep, setCep] = useState(inicial.cep);
  const [logradouro, setLogradouro] = useState(inicial.logradouro);
  const [numero, setNumero] = useState(inicial.numero);
  const [complemento, setComplemento] = useState(inicial.complemento);
  const [bairro, setBairro] = useState(inicial.bairro);
  const [cidade, setCidade] = useState(inicial.cidade);
  const [uf, setUf] = useState(inicial.uf);
  const [referencia, setReferencia] = useState(inicial.referencia);

  // pagamento
  const [metodo, setMetodo] = useState<MetodoCheckout>(metodos[0] ?? "pix");
  const [numeroParcelas, setNumeroParcelas] = useState(1);
  const [cartao, setCartao] = useState<DadosCartao>({ token: "", bandeira: "" });

  const [observacao, setObservacao] = useState("");

  const precisaTokenizar = metodo === "cartao" && !simulado;

  /* ------------------------------------------------- erro vindo do servidor */

  useEffect(() => {
    if (!estado.erro) return;
    const destino = estado.campo ? ETAPA_DO_CAMPO[estado.campo] : undefined;
    setErroLocal("");
    if (destino !== undefined) {
      setEtapa(destino);
      refCampoParaFocar.current = estado.campo ?? null;
    } else {
      refCampoParaFocar.current = null;
      refTopo.current?.scrollIntoView({
        block: "start",
        behavior: rolagemSuave() ? "smooth" : "auto",
      });
    }
  }, [estado]);

  // roda depois da troca de etapa, quando o campo já está na tela
  useEffect(() => {
    const nomeDoCampo = refCampoParaFocar.current;
    if (!nomeDoCampo) return;
    refCampoParaFocar.current = null;

    const alvo = refFormulario.current?.querySelector<HTMLElement>(`[name="${nomeDoCampo}"]`);
    if (!alvo) return;
    alvo.scrollIntoView({ block: "center", behavior: rolagemSuave() ? "smooth" : "auto" });
    alvo.focus({ preventScroll: true });
  });

  /* -------------------------------------------------- validação de etapa */

  function conferir(indice: number): string {
    if (indice === 0) {
      if (!EMAIL_PLAUSIVEL.test(email.trim())) {
        return "Informe um e-mail válido — é por ele que a confirmação do pedido chega.";
      }
      if (criarConta && senha.length < 8) {
        return "A senha da sua conta precisa de pelo menos 8 caracteres.";
      }
    }

    if (indice === 1) {
      if (nome.trim().length < 3) return "Informe o nome completo do comprador.";
      const digitos = somenteDigitos(telefone);
      if (digitos.length !== 10 && digitos.length !== 11) {
        return "Informe o telefone com DDD.";
      }
      if (!documentoValido(documento, tipoPessoa)) {
        return tipoPessoa === "fisica"
          ? "CPF inválido. Confira os números."
          : "CNPJ inválido. Confira os números.";
      }
      if (tipoPessoa === "juridica" && razaoSocial.trim().length < 2) {
        return "Informe a razão social da empresa.";
      }
    }

    if (indice === 2 && entrega === "entrega") {
      if (somenteDigitos(cep).length !== 8) return "Informe o CEP com 8 dígitos.";
      if (!logradouro.trim()) return "Informe o logradouro.";
      if (!numero.trim()) return "Informe o número. Se não houver, escreva “S/N”.";
      if (!bairro.trim()) return "Informe o bairro.";
      if (!cidade.trim()) return "Informe a cidade.";
      if (!uf) return "Escolha o estado.";
    }

    if (indice === 3) {
      if (metodos.length === 0) return "Nenhuma forma de pagamento está disponível agora.";
      if (metodo === "cartao" && !cartao.token) {
        return precisaTokenizar
          ? "Valide o cartão antes de continuar."
          : "Escolha a bandeira do cartão para continuar.";
      }
    }

    return "";
  }

  function avancar() {
    const problema = conferir(etapa);
    setErroLocal(problema);
    if (problema) {
      refTopo.current?.scrollIntoView({
        block: "start",
        behavior: rolagemSuave() ? "smooth" : "auto",
      });
      // depois da pintura, para o elemento já existir
      requestAnimationFrame(() => refAviso.current?.focus());
      return;
    }
    setEtapa((atual) => Math.min(ULTIMA, atual + 1));
    refTopo.current?.scrollIntoView({
      block: "start",
      behavior: rolagemSuave() ? "smooth" : "auto",
    });
  }

  function voltar() {
    setErroLocal("");
    setEtapa((atual) => Math.max(0, atual - 1));
    refTopo.current?.scrollIntoView({
      block: "start",
      behavior: rolagemSuave() ? "smooth" : "auto",
    });
  }

  function irPara(indice: number) {
    setErroLocal("");
    setEtapa(indice);
    refTopo.current?.scrollIntoView({
      block: "start",
      behavior: rolagemSuave() ? "smooth" : "auto",
    });
  }

  function preencherPeloCep(endereco: EnderecoCep) {
    setLogradouro((atual) => endereco.logradouro || atual);
    setBairro((atual) => endereco.bairro || atual);
    setCidade((atual) => endereco.cidade || atual);
    setUf((atual) => endereco.uf || atual);
  }

  const parcelaEscolhida =
    parcelas.find((p) => p.numero === numeroParcelas) ?? parcelas[0] ?? null;

  return (
    <form
      ref={refFormulario}
      action={acao}
      noValidate
      onKeyDown={(evento) => {
        // Enter em campo de texto não pode fechar o pedido de uma etapa
        // intermediária — só o botão da última etapa envia.
        //
        // A trava vale SÓ para <input>. Aplicada a qualquer alvo, ela também
        // engolia o Enter sobre o botão "Continuar" — que é a forma padrão de
        // acionar um botão pelo teclado — e deixava quem navega sem mouse
        // dependendo da barra de espaço para avançar.
        if (evento.key !== "Enter") return;
        if (etapa === ULTIMA) return;
        const alvo = evento.target as HTMLElement;
        if (alvo.tagName !== "INPUT") return;
        evento.preventDefault();
      }}
      className="min-w-0"
    >
      <div ref={refTopo} className="scroll-mt-24" />

      <Passos passos={ETAPAS} atual={etapa} rotulo="Etapas do pedido" className="mb-6" />

      {estado.erro ? (
        <Aviso tom="erro" titulo="Não deu para fechar o pedido" className="mb-6">
          {estado.erro}
        </Aviso>
      ) : null}

      {erroLocal ? (
        <div
          ref={refAviso}
          tabIndex={-1}
          /* `key` muda a cada mensagem para o leitor de tela reanunciar quando
             o erro se repete — sem isso, tentar de novo com o mesmo problema
             não fala nada */
          key={erroLocal}
          className="outline-none"
        >
          <Aviso tom="atencao" titulo="Confira antes de continuar" className="mb-6">
            {erroLocal}
          </Aviso>
        </div>
      ) : null}

      <Cartao className="p-5 sm:p-6">
        {/* ------------------------------------------------ 0. identificação */}
        <Secao
          visivel={etapa === 0}
          titulo="Identificação"
          descricao="É para onde vai a confirmação do pedido e o acompanhamento."
        >
          {logado ? (
            <div className="flex items-start gap-3 rounded-xl bg-graf-50 p-4">
              <UserRound className="mt-0.5 size-5 shrink-0 text-graf-500" aria-hidden />
              <p className="text-sm leading-relaxed text-graf-700">
                Você está na sua conta
                {nomeCliente ? (
                  <>
                    , <strong className="font-semibold text-graf-900">{nomeCliente}</strong>
                  </>
                ) : null}
                . O pedido fica salvo em{" "}
                <Link href="/minha-jb/pedidos" className="font-semibold text-jb-700 underline">
                  Minha JB
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-graf-50 p-4">
              <p className="min-w-0 flex-1 text-sm leading-relaxed text-graf-700">
                Já é cliente da JB? Entrar traz seus dados e endereços preenchidos.
              </p>
              <Link
                href="/entrar?voltar=%2Fcheckout"
                className="inline-flex min-h-11 items-center rounded-lg border border-graf-300 bg-white px-4 text-sm font-semibold text-graf-800 transition-colors hover:border-graf-400 hover:bg-graf-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
              >
                Entrar na conta
              </Link>
            </div>
          )}

          <Campo
            rotulo="E-mail"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(evento) => setEmail(evento.currentTarget.value)}
            ajuda="Enviamos aqui a confirmação e o link de acompanhamento."
          />

          {logado ? null : (
            <div className="rounded-xl border border-graf-200 p-4">
              <Marcador
                name="criarConta"
                rotulo="Quero criar minha conta na JB"
                ajuda="Guarda seus pedidos, equipamentos e chamados no mesmo lugar."
                checked={criarConta}
                onChange={(evento) => setCriarConta(evento.currentTarget.checked)}
              />

              {criarConta ? (
                <div className="mt-4">
                  <Campo
                    rotulo="Senha"
                    name="senha"
                    type={mostrarSenha ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={senha}
                    onChange={(evento) => setSenha(evento.currentTarget.value)}
                    ajuda="Pelo menos 8 caracteres."
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-graf-600 transition-colors hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                  >
                    {mostrarSenha ? "Esconder senha" : "Mostrar senha"}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </Secao>

        {/* ------------------------------------------- 1. dados do comprador */}
        <Secao
          visivel={etapa === 1}
          titulo="Dados do comprador"
          descricao="O documento vai na nota fiscal, então precisa ser o de quem compra."
        >
          <Campo
            rotulo="Nome completo"
            name="nome"
            autoComplete="name"
            required
            value={nome}
            onChange={(evento) => setNome(evento.currentTarget.value)}
          />

          <CampoTelefone
            name="telefone"
            required
            valor={telefone}
            aoMudar={setTelefone}
            ajuda="Usamos para combinar entrega e instalação."
          />

          <Opcoes
            nome="tipoPessoa"
            rotulo="Tipo de cadastro"
            valor={tipoPessoa}
            opcoes={[
              { valor: "fisica", rotulo: "Pessoa física", descricao: "CPF" },
              { valor: "juridica", rotulo: "Pessoa jurídica", descricao: "CNPJ" },
            ]}
            aoMudar={(valor) => {
              setTipoPessoa(valor);
              setDocumento("");
            }}
          />

          <CampoDocumento
            name="documento"
            required
            tipo={tipoPessoa}
            valor={documento}
            aoMudar={setDocumento}
          />

          {tipoPessoa === "juridica" ? (
            <Campo
              rotulo="Razão social"
              name="razaoSocial"
              autoComplete="organization"
              required
              value={razaoSocial}
              onChange={(evento) => setRazaoSocial(evento.currentTarget.value)}
            />
          ) : (
            <input type="hidden" name="razaoSocial" value="" />
          )}
        </Secao>

        {/* ------------------------------------------------------ 2. entrega */}
        <Secao
          visivel={etapa === 2}
          titulo="Entrega"
          descricao="Equipamento odontológico costuma exigir frete dedicado — por isso o valor é combinado depois, com o endereço na mão."
        >
          {retiradaDisponivel ? (
            <Opcoes
              nome="entrega"
              rotulo="Como você quer receber"
              valor={entrega}
              opcoes={[
                { valor: "retirada", rotulo: "Retirar na JB", descricao: "Sem custo de frete" },
                { valor: "entrega", rotulo: "Receber no endereço", descricao: "Frete combinado depois" },
              ]}
              aoMudar={(valor) => setEntrega(valor)}
            />
          ) : (
            <input type="hidden" name="entrega" value="entrega" />
          )}

          {entrega === "retirada" ? (
            <div className="flex items-start gap-3 rounded-xl bg-graf-50 p-4">
              <Store className="mt-0.5 size-5 shrink-0 text-graf-500" aria-hidden />
              <div className="min-w-0 text-sm leading-relaxed text-graf-700">
                <p className="font-semibold text-graf-900">Retirada na JB</p>
                <p className="mt-1">{enderecoJb}</p>
                {horarioJb ? <p className="mt-1 text-graf-500">{horarioJb}</p> : null}
                {instrucoesRetirada ? <p className="mt-2">{instrucoesRetirada}</p> : null}
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <CampoCep
                  name="cep"
                  required
                  valor={cep}
                  aoMudar={setCep}
                  aoEncontrar={preencherPeloCep}
                />
                <Campo
                  rotulo="Logradouro"
                  name="logradouro"
                  autoComplete="address-line1"
                  required
                  value={logradouro}
                  onChange={(evento) => setLogradouro(evento.currentTarget.value)}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-[8rem_minmax(0,1fr)]">
                <Campo
                  rotulo="Número"
                  name="numero"
                  required
                  value={numero}
                  onChange={(evento) => setNumero(evento.currentTarget.value)}
                />
                <Campo
                  rotulo="Complemento"
                  name="complemento"
                  autoComplete="address-line2"
                  value={complemento}
                  onChange={(evento) => setComplemento(evento.currentTarget.value)}
                  ajuda="Sala, andar, bloco."
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem]">
                <Campo
                  rotulo="Bairro"
                  name="bairro"
                  required
                  value={bairro}
                  onChange={(evento) => setBairro(evento.currentTarget.value)}
                />
                <Campo
                  rotulo="Cidade"
                  name="cidade"
                  autoComplete="address-level2"
                  required
                  value={cidade}
                  onChange={(evento) => setCidade(evento.currentTarget.value)}
                />
                <Selecao
                  rotulo="Estado"
                  name="uf"
                  autoComplete="address-level1"
                  required
                  value={uf}
                  onChange={(evento) => setUf(evento.currentTarget.value)}
                >
                  <option value="">—</option>
                  {UFS.map((sigla) => (
                    <option key={sigla} value={sigla}>
                      {sigla}
                    </option>
                  ))}
                </Selecao>
              </div>

              <Campo
                rotulo="Ponto de referência"
                name="referencia"
                value={referencia}
                onChange={(evento) => setReferencia(evento.currentTarget.value)}
                ajuda="Ajuda o motorista a achar a clínica. Opcional."
              />
            </>
          )}
        </Secao>

        {/* ---------------------------------------------------- 3. pagamento */}
        <Secao
          visivel={etapa === 3}
          titulo="Pagamento"
          descricao={`Total do pedido: ${formatarPreco(totalCents)}.`}
        >
          {metodos.length === 0 ? (
            <Aviso tom="erro" titulo="Pagamento indisponível">
              Nenhuma forma de pagamento está configurada neste momento. Fale com a JB para
              concluir o pedido por outro caminho.
            </Aviso>
          ) : (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-graf-800">
                Forma de pagamento
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {metodos.map((opcao) => {
                  const ativo = metodo === opcao;
                  const Icone = opcao === "pix" ? QrCode : CreditCard;
                  return (
                    <label
                      key={opcao}
                      className={cn(
                        "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-jb-500",
                        ativo
                          ? "border-jb-500 bg-jb-50"
                          : "border-graf-300 bg-white hover:border-graf-400",
                      )}
                    >
                      <input
                        type="radio"
                        name="metodo"
                        value={opcao}
                        checked={ativo}
                        onChange={() => {
                          setMetodo(opcao);
                          setCartao({ token: "", bandeira: "" });
                          if (opcao !== "cartao") setNumeroParcelas(1);
                        }}
                        className="sr-only"
                      />
                      <Icone
                        className={cn("mt-0.5 size-5 shrink-0", ativo ? "text-jb-600" : "text-graf-500")}
                        aria-hidden
                      />
                      <span className="min-w-0">
                        <span
                          className={cn(
                            "block text-sm font-bold",
                            ativo ? "text-jb-800" : "text-graf-900",
                          )}
                        >
                          {opcao === "pix" ? "Pix" : "Cartão de crédito"}
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug text-graf-500">
                          {opcao === "pix"
                            ? "Aprovação em minutos, sem taxa"
                            : parcelas.length > 1
                              ? `Em até ${parcelas.length}× sem juros`
                              : "À vista"}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {metodo === "pix" && metodos.includes("pix") ? <ResumoPix /> : null}

          {metodo === "cartao" && metodos.includes("cartao") ? (
            <>
              {parcelas.length > 1 ? (
                <Selecao
                  rotulo="Parcelamento"
                  name="parcelas"
                  value={String(numeroParcelas)}
                  onChange={(evento) => setNumeroParcelas(Number(evento.currentTarget.value))}
                  ajuda="Sem juros. O limite vem das configurações da loja."
                >
                  {parcelas.map((p) => (
                    <option key={p.numero} value={p.numero}>
                      {p.numero === 1
                        ? `À vista — ${formatarPreco(totalCents)}`
                        : `${p.numero}× de ${formatarPreco(p.valorCents)} sem juros`}
                    </option>
                  ))}
                </Selecao>
              ) : (
                <input type="hidden" name="parcelas" value="1" />
              )}

              <PagamentoCartao
                simulado={simulado}
                provedorNome={provedorNome}
                chavePublica={chavePublicaCartao}
                documento={documento}
                valorCents={totalCents}
                parcelas={numeroParcelas}
                token={cartao.token}
                bandeira={cartao.bandeira}
                aoMudar={setCartao}
              />
            </>
          ) : (
            <input type="hidden" name="parcelas" value="1" />
          )}
        </Secao>

        {/* ------------------------------------------------------ 4. revisão */}
        <Secao
          visivel={etapa === ULTIMA}
          titulo="Revisão"
          descricao="Confira os dados. Nada é cobrado antes de você confirmar."
        >
          <div className="space-y-3">
            <BlocoRevisao titulo="Identificação" aoEditar={() => irPara(0)}>
              {email || "—"}
              {criarConta ? " · conta será criada" : null}
            </BlocoRevisao>

            <BlocoRevisao titulo="Comprador" aoEditar={() => irPara(1)}>
              <p>{nome || "—"}</p>
              <p className="text-graf-500">
                {telefone || "—"} · {tipoPessoa === "fisica" ? "CPF" : "CNPJ"}{" "}
                {documento || "—"}
              </p>
              {tipoPessoa === "juridica" && razaoSocial ? (
                <p className="text-graf-500">{razaoSocial}</p>
              ) : null}
            </BlocoRevisao>

            <BlocoRevisao titulo="Entrega" aoEditar={() => irPara(2)}>
              {entrega === "retirada" ? (
                <span className="flex items-start gap-2">
                  <Store className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
                  Retirada na JB — {enderecoJb}
                </span>
              ) : (
                <span className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
                  <span>
                    {logradouro || "—"}, {numero || "s/n"}
                    {complemento ? ` — ${complemento}` : ""}
                    <br />
                    <span className="text-graf-500">
                      {bairro} · {cidade}
                      {uf ? `/${uf}` : ""} · CEP {cep || "—"}
                    </span>
                  </span>
                </span>
              )}
            </BlocoRevisao>

            <BlocoRevisao titulo="Pagamento" aoEditar={() => irPara(3)}>
              <span className="flex items-start gap-2">
                {metodo === "pix" ? (
                  <QrCode className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
                ) : (
                  <CreditCard className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
                )}
                {metodo === "pix"
                  ? `Pix — ${formatarPreco(totalCents)}`
                  : parcelaEscolhida && numeroParcelas > 1
                    ? `Cartão em ${numeroParcelas}× de ${formatarPreco(parcelaEscolhida.valorCents)}`
                    : `Cartão à vista — ${formatarPreco(totalCents)}`}
              </span>
            </BlocoRevisao>
          </div>

          <Area
            rotulo="Observação para a JB"
            name="observacao"
            rows={3}
            maxLength={1000}
            value={observacao}
            onChange={(evento) => setObservacao(evento.currentTarget.value)}
            ajuda="Horário melhor para entrega, acesso à clínica, o que mais ajudar. Opcional."
          />

          {entrega === "entrega" ? (
            <Aviso tom="info" titulo="Frete combinado depois">
              O valor do frete não entra neste total. A JB confere as dimensões do equipamento e
              o endereço, e entra em contato com o valor antes de despachar.
            </Aviso>
          ) : null}
        </Secao>

        {/* ------------------------------------------------------ navegação */}
        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-graf-200 pt-6">
          {etapa > 0 ? (
            <Botao type="button" variante="secundario" onClick={voltar} disabled={enviando}>
              <ArrowLeft className="size-4" aria-hidden />
              Voltar
            </Botao>
          ) : (
            <LinkBotao href="/carrinho" variante="secundario">
              <ArrowLeft className="size-4" aria-hidden />
              Voltar ao carrinho
            </LinkBotao>
          )}

          {/*
            As duas chaves são obrigatórias, não decoração.

            Sem `key`, o React vê `Botao` na mesma posição nos dois ramos do
            ternário e REAPROVEITA o mesmo elemento <button>, trocando só o
            `type`. Como a atualização de estado do clique é síncrona, o
            navegador chega na ação padrão do clique já com `type="submit"` — e
            o "Continuar" da etapa de pagamento fechava o pedido sem passar pela
            revisão. Com chaves distintas, um botão desmonta e o outro monta:
            o nó clicado continua sendo `type="button"` até o fim do evento.
          */}
          {etapa < ULTIMA ? (
            <Botao key="avancar" type="button" onClick={avancar} className="ml-auto">
              Continuar
              <ArrowRight className="size-4" aria-hidden />
            </Botao>
          ) : (
            <Botao
              key="finalizar"
              type="submit"
              tamanho="lg"
              carregando={enviando}
              disabled={metodos.length === 0}
              className="ml-auto"
            >
              <Lock className="size-4" aria-hidden />
              {enviando ? "Fechando o pedido…" : `Finalizar — ${formatarPreco(totalCents)}`}
            </Botao>
          )}
        </div>
      </Cartao>

      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-graf-500">
        <Truck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Ao finalizar, a JB reserva o equipamento no estoque e confirma o prazo por telefone ou
        WhatsApp. Os valores são recalculados no servidor no momento do fechamento.
      </p>
    </form>
  );
}
