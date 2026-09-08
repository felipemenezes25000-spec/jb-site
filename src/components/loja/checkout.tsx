"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  CreditCard,
  Lock,
  MapPin,
  Pencil,
  QrCode,
  ShieldCheck,
  Store,
  TriangleAlert,
  Truck,
  UserRound,
} from "lucide-react";

import { consultarFrete, finalizarCompra, type EstadoCheckout } from "@/app/acoes/checkout";
import {
  freteQueSoma,
  publicarFrete,
  textoDoPrazo,
  FRETE_VAZIO,
} from "@/components/loja/checkout-resumo";
import { PagamentoCartao, type DadosCartao } from "@/components/loja/pagamento-cartao";
import { ResumoPix } from "@/components/loja/pagamento-pix";
import { Aviso } from "@/components/ui/aviso";
import { Botao, LinkBotao } from "@/components/ui/button";
import { CampoCep, CampoDocumento, CampoTelefone, type EnderecoCep } from "@/components/ui/campos-br";
import { Cartao } from "@/components/ui/data";
import { Area, Campo, Marcador, Opcoes, Selecao } from "@/components/ui/form";
import { Passos } from "@/components/ui/passos";
import { documentoValido, formatarPreco, somenteDigitos } from "@/lib/format";
import type { FreteExibido } from "@/lib/frete";
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
  { rotulo: "Identificação", descricao: "Para onde vai a confirmação" },
  { rotulo: "Dados", descricao: "Nome, contato e documento" },
  { rotulo: "Entrega", descricao: "Retirada ou entrega" },
  { rotulo: "Pagamento", descricao: "Pix ou cartão" },
  { rotulo: "Revisão", descricao: "Confira e confirme" },
];

const ULTIMA = ETAPAS.length - 1;

/** Retirar na JB não passa por tabela de frete: é sempre zero. */
const FRETE_RETIRADA: FreteExibido = {
  rotulo: "Retirada na JB",
  valorCents: 0,
  prazoDias: null,
  orcadoDepois: false,
};

/** Para onde levar a pessoa quando o servidor recusa um campo. */
const ETAPA_DO_CAMPO: Record<string, number> = {
  email: 0,
  senha: 0,
  modoAcesso: 0,
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
function useFocoNaEtapa(
  etapa: number,
  ativo: boolean,
  raiz: React.RefObject<HTMLElement | null>,
) {
  /* Guarda pela etapa, não por um "é a primeira vez": o efeito pode rodar
     duas vezes na montagem, e com a marca booleana a segunda passada focava a
     etapa 1 assim que a página abria — o cliente encontrava o bloco inteiro
     contornado em vermelho sem ter tocado em nada. Comparar com a etapa
     anterior só dispara o foco quando a etapa realmente muda. */
  const etapaAnterior = useRef(etapa);

  useEffect(() => {
    if (!ativo) return;
    if (etapaAnterior.current === etapa) return;
    etapaAnterior.current = etapa;
    const secao = raiz.current?.querySelector<HTMLElement>("section:not([hidden])");
    if (!secao) return;
    secao.tabIndex = -1;
    secao.focus({ preventScroll: true });
  }, [etapa, ativo, raiz]);
}

/**
 * Uma das duas portas de identificação: criar acesso ou entrar.
 *
 * É um `radio` de verdade, com o rótulo inteiro clicável. Duas alternativas
 * que mudam o significado dos campos seguintes precisam de estado anunciado
 * ao leitor de tela e de navegação por setas — que é o que o grupo de rádio dá
 * de graça, e um par de botões estilizados não dá.
 */
function OpcaoDeAcesso({
  valor,
  atual,
  aoEscolher,
  titulo,
  detalhe,
}: {
  valor: "criar" | "entrar";
  atual: "criar" | "entrar";
  aoEscolher: (valor: "criar" | "entrar") => void;
  titulo: string;
  detalhe: string;
}) {
  const escolhido = atual === valor;

  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-jb-500",
        escolhido
          ? "border-jb-300 bg-jb-50/60 ring-1 ring-jb-500/15"
          : "border-graf-300 bg-white hover:border-graf-400 hover:bg-graf-50",
      )}
    >
      <input
        type="radio"
        name="modoAcessoEscolha"
        value={valor}
        checked={escolhido}
        onChange={() => aoEscolher(valor)}
        className="mt-0.5 size-4 shrink-0 accent-jb-500"
      />
      <span className="min-w-0">
        <span className="block text-sm font-bold text-graf-950">{titulo}</span>
        <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-graf-600">
          {detalhe}
        </span>
      </span>
    </label>
  );
}

/**
 * Uma etapa do formulário.
 *
 * Continua montada quando está escondida — é assim que voltar uma etapa não
 * perde o que já foi digitado e o formulário chega inteiro ao servidor.
 */
function EtapaCheckout({
  visivel,
  titulo,
  descricao,
  children,
}: {
  visivel: boolean;
  titulo: string;
  descricao?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section hidden={!visivel} className={cn(!visivel && "hidden")} aria-label={titulo}>
      <h2 className="text-title texto-forte">{titulo}</h2>
      {descricao ? (
        <p className="mt-2 text-base leading-relaxed text-graf-600">{descricao}</p>
      ) : null}
      <div className="mt-7 space-y-6">{children}</div>
    </section>
  );
}

/**
 * Caixa do resultado do frete.
 *
 * Repete a linguagem visual do `Aviso` de propósito, sem o `role` dele: o
 * bloco inteiro vive dentro de uma região `aria-live`, e duas regiões
 * aninhadas fariam o leitor de tela anunciar o mesmo valor duas vezes.
 * O ícone acompanha a cor — quem não distingue matiz continua entendendo.
 */
function CaixaFrete({
  tom,
  titulo,
  children,
}: {
  tom: "neutro" | "ok" | "atencao";
  titulo: React.ReactNode;
  children?: React.ReactNode;
}) {
  const Icone = tom === "atencao" ? TriangleAlert : Truck;
  const caixa =
    tom === "ok"
      ? "bg-ok-50 ring-ok-500/20"
      : tom === "atencao"
        ? "bg-warn-50 ring-warn-500/25"
        : "bg-graf-50 ring-graf-200";
  const cores =
    tom === "ok" ? "text-ok-700" : tom === "atencao" ? "text-warn-700" : "text-graf-500";

  return (
    <div className={cn("flex items-start gap-3 rounded-xl p-4 ring-1 ring-inset", caixa)}>
      <Icone className={cn("mt-0.5 size-5 shrink-0", cores)} aria-hidden />
      <div className="min-w-0 flex-1 text-sm leading-relaxed text-graf-700">
        <p className={cn("font-bold leading-snug", tom === "neutro" ? "text-graf-900" : cores)}>
          {titulo}
        </p>
        {children ? <div className="mt-1">{children}</div> : null}
      </div>
    </div>
  );
}

function BlocoRevisao({
  titulo,
  icone: Icone,
  aoEditar,
  children,
}: {
  titulo: string;
  icone: React.ComponentType<{ className?: string }>;
  aoEditar: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-graf-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <h3 className="flex items-center gap-2 text-[0.8125rem] font-bold uppercase tracking-wider text-graf-500">
          <Icone className="size-4 shrink-0 text-graf-500" aria-hidden />
          {titulo}
        </h3>
        <button
          type="button"
          onClick={aoEditar}
          className="-my-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-graf-700 transition-colors hover:bg-graf-50 hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
        >
          <Pencil className="size-3.5" aria-hidden />
          Editar
          <span className="sr-only"> {titulo.toLowerCase()}</span>
        </button>
      </div>
      <div className="mt-3 space-y-1 text-[0.9375rem] leading-relaxed text-graf-800">
        {children}
      </div>
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
  useFocoNaEtapa(etapa, true, refFormulario);
  const refCampoParaFocar = useRef<string | null>(null);

  // identificação
  const [email, setEmail] = useState(inicial.email);
  /* Como esta pessoa se identifica. Só vale para quem chega sem sessão; com
     sessão, a identidade é a do cookie e o servidor ignora estes campos. */
  const [modoAcesso, setModoAcesso] = useState<"criar" | "entrar">("criar");
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

  /* ------------------------------------------------------------- frete */

  const [freteEntrega, setFreteEntrega] = useState<FreteExibido | null>(null);
  const [freteErro, setFreteErro] = useState("");
  const [freteCarregando, setFreteCarregando] = useState(false);
  const digitosCep = somenteDigitos(cep);

  /**
   * Assim que o CEP fecha oito dígitos, o servidor diz quanto custa.
   *
   * Nenhum valor é decidido aqui: a ação lê a tabela de /admin/frete e o
   * carrinho do banco. O que chega é para mostrar — `finalizarCompra` refaz a
   * mesma conta antes de cobrar.
   *
   * A espera curta antes de perguntar existe porque `CampoCep` avisa a cada
   * tecla: sem ela, colar um CEP dispararia uma consulta por dígito.
   */
  useEffect(() => {
    if (entrega !== "entrega" || digitosCep.length !== 8) {
      setFreteEntrega(null);
      setFreteErro("");
      setFreteCarregando(false);
      return;
    }

    let vivo = true;
    setFreteCarregando(true);

    const temporizador = window.setTimeout(async () => {
      try {
        const resposta = await consultarFrete(digitosCep);
        // resposta de um CEP que a pessoa já apagou não pode sobrescrever a atual
        if (!vivo) return;
        setFreteEntrega(resposta.frete ?? null);
        setFreteErro(resposta.erro ?? "");
      } catch {
        if (!vivo) return;
        setFreteEntrega(null);
        setFreteErro(
          "Não foi possível calcular o frete agora. Você pode seguir: a JB confere o valor antes de despachar.",
        );
      } finally {
        if (vivo) setFreteCarregando(false);
      }
    }, 400);

    return () => {
      vivo = false;
      window.clearTimeout(temporizador);
    };
  }, [entrega, digitosCep]);

  const frete = entrega === "retirada" ? FRETE_RETIRADA : freteEntrega;
  const freteCents = freteQueSoma(frete);
  const totalComFreteCents = totalCents + freteCents;
  const prazoDoFrete = frete ? textoDoPrazo(frete.prazoDias) : "";

  // o resumo do pedido é irmão deste formulário na página, não filho: o valor
  // chega lá pela loja externa exposta por checkout-resumo
  useEffect(() => {
    publicarFrete({ frete, carregando: entrega === "entrega" && freteCarregando });
  }, [frete, freteCarregando, entrega]);

  // sair do checkout não pode deixar o frete anterior guardado no módulo
  useEffect(() => () => publicarFrete(FRETE_VAZIO), []);

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
      if (!logado) {
        if (senha.length === 0) {
          return modoAcesso === "entrar"
            ? "Informe a senha da sua conta para continuar."
            : "Crie uma senha para a conta da clínica.";
        }
        /* O mínimo de 8 vale só para senha nova. Ao entrar, senha curta é
           senha errada, e quem responde isso é o servidor — a tela não sabe
           (nem deve saber) o tamanho da senha guardada. */
        if (modoAcesso === "criar" && senha.length < 8) {
          return "A senha da sua conta precisa de pelo menos 8 caracteres.";
        }
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

  /**
   * A recusa do servidor também aparece colada ao campo que a causou.
   *
   * O aviso do topo continua existindo — é ele que o leitor de tela anuncia —
   * mas quem enxerga a tela precisa ver o problema onde vai corrigi-lo, sem
   * relacionar mensagem e campo de cabeça.
   */
  function erroDoCampo(nome: string) {
    return estado.campo === nome ? estado.erro : undefined;
  }

  function preencherPeloCep(endereco: EnderecoCep) {
    setLogradouro((atual) => endereco.logradouro || atual);
    setBairro((atual) => endereco.bairro || atual);
    setCidade((atual) => endereco.cidade || atual);
    setUf((atual) => endereco.uf || atual);
  }

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

      <Passos passos={ETAPAS} atual={etapa} rotulo="Etapas do pedido" className="mb-7" />

      {/* A recusa do servidor tem duas formas. Presa a um campo, a frase
          inteira já aparece colada a ele: aqui o aviso só aponta, senão o
          mesmo texto fica em dois lugares da tela e o leitor de tela anuncia
          duas vezes. Sem campo — recusa do pedido inteiro —, este é o único
          lugar em que a mensagem existe. */}
      {estado.erro ? (
        <Aviso tom="erro" titulo="Não deu para fechar o pedido" className="mb-6">
          {estado.campo
            ? "Confira o campo destacado no formulário para continuar."
            : estado.erro}
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

      <Cartao className="p-5 sm:p-7 lg:p-8">
        {/* ------------------------------------------------ 0. identificação */}
        <EtapaCheckout
          visivel={etapa === 0}
          titulo="Identificação"
          descricao={
            logado
              ? "É por aqui que a JB fala com você sobre este pedido."
              : "A compra fica registrada na conta da sua clínica. É por ela que você acompanha o pedido depois."
          }
        >
          {logado ? (
            <>
              <div className="flex items-start gap-3 rounded-xl border border-graf-200 bg-graf-50 p-4">
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
                    Área da Clínica
                  </Link>
                  .
                </p>
              </div>

              <Campo
                rotulo="E-mail para este pedido"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(evento) => setEmail(evento.currentTarget.value)}
                erro={erroDoCampo("email")}
                /* Este campo é o contato DA COMPRA, não o login. Trocá-lo aqui
                   não muda o e-mail da conta nem o titular do pedido — o
                   servidor usa a identidade da sessão e ignora o que vier
                   escrito aqui para decidir de quem é o pedido. */
                ajuda="Para a confirmação e a nota deste pedido. Não altera o e-mail de acesso da sua conta."
              />
            </>
          ) : (
            <>
              {/* Duas portas, e a escolha é explícita.
                  O desenho anterior era uma caixa "quero criar minha conta"
                  que, desmarcada, deixava a compra seguir sem conta nenhuma —
                  e quem já era cliente digitava o e-mail e comprava fora da
                  própria conta sem perceber. */}
              <fieldset>
                <legend className="text-sm font-bold text-graf-950">
                  Como você quer continuar
                </legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <OpcaoDeAcesso
                    valor="criar"
                    atual={modoAcesso}
                    aoEscolher={setModoAcesso}
                    titulo="Criar meu acesso"
                    detalhe="Primeira compra na JB"
                  />
                  <OpcaoDeAcesso
                    valor="entrar"
                    atual={modoAcesso}
                    aoEscolher={setModoAcesso}
                    titulo="Já tenho conta"
                    detalhe="Entrar com minha senha"
                  />
                </div>
              </fieldset>

              <input type="hidden" name="modoAcesso" value={modoAcesso} />

              <Campo
                rotulo="E-mail"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(evento) => setEmail(evento.currentTarget.value)}
                erro={erroDoCampo("email")}
                ajuda={
                  modoAcesso === "entrar"
                    ? "O e-mail da sua conta na JB."
                    : "Será o e-mail de acesso e o endereço da confirmação do pedido."
                }
              />

              <div>
                <Campo
                  rotulo={modoAcesso === "entrar" ? "Senha" : "Crie uma senha"}
                  name="senha"
                  type={mostrarSenha ? "text" : "password"}
                  /* `current-password` e `new-password` são o que fazem o
                     gerenciador de senhas oferecer a senha certa em vez de
                     propor uma nova para quem está entrando. */
                  autoComplete={modoAcesso === "entrar" ? "current-password" : "new-password"}
                  required
                  minLength={modoAcesso === "entrar" ? undefined : 8}
                  value={senha}
                  onChange={(evento) => setSenha(evento.currentTarget.value)}
                  erro={erroDoCampo("senha")}
                  ajuda={modoAcesso === "entrar" ? undefined : "Pelo menos 8 caracteres."}
                />

                <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4">
                  <button
                    type="button"
                    aria-pressed={mostrarSenha}
                    onClick={() => setMostrarSenha((v) => !v)}
                    className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-graf-700 transition-colors hover:bg-graf-50 hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                  >
                    {mostrarSenha ? "Esconder senha" : "Mostrar senha"}
                  </button>

                  {modoAcesso === "entrar" ? (
                    <Link
                      href="/recuperar-senha?voltar=%2Fcheckout"
                      className="inline-flex min-h-11 items-center text-sm font-semibold text-jb-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                    >
                      Esqueci minha senha
                    </Link>
                  ) : null}
                </div>
              </div>

              {modoAcesso === "criar" ? (
                <>
                  {/* Por que a conta existe, dito onde a conta é pedida. */}
                  <div className="flex items-start gap-3 rounded-xl border border-graf-200 bg-surface-muted p-4">
                    <ClipboardList
                      className="mt-0.5 size-5 shrink-0 text-graf-500"
                      aria-hidden
                    />
                    <p className="text-sm leading-relaxed text-graf-700">
                      Seu equipamento ficará registrado na Área da Clínica, junto com
                      garantia, documentos e histórico de manutenção.
                    </p>
                  </div>

                  {/* Separado e opcional: criar conta para comprar não é
                      consentimento para receber publicidade. */}
                  <Marcador
                    name="novidades"
                    rotulo="Quero receber novidades e condições da JB por e-mail"
                    ajuda="Opcional. Não é necessário para concluir a compra."
                  />
                </>
              ) : null}
            </>
          )}
        </EtapaCheckout>

        {/* ------------------------------------------- 1. dados do comprador */}
        <EtapaCheckout
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
            erro={erroDoCampo("nome")}
          />

          <CampoTelefone
            name="telefone"
            required
            valor={telefone}
            aoMudar={setTelefone}
            erro={erroDoCampo("telefone")}
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
            erro={erroDoCampo("documento")}
          />

          {tipoPessoa === "juridica" ? (
            <Campo
              rotulo="Razão social"
              name="razaoSocial"
              autoComplete="organization"
              required
              value={razaoSocial}
              onChange={(evento) => setRazaoSocial(evento.currentTarget.value)}
              erro={erroDoCampo("razaoSocial")}
            />
          ) : (
            <input type="hidden" name="razaoSocial" value="" />
          )}
        </EtapaCheckout>

        {/* ------------------------------------------------------ 2. entrega */}
        <EtapaCheckout
          visivel={etapa === 2}
          titulo="Entrega"
          descricao="Informe o CEP e o valor da entrega aparece na hora. Equipamento grande demais para a tabela é orçado à parte — você recebe o valor antes de qualquer despacho."
        >
          {retiradaDisponivel ? (
            <Opcoes
              nome="entrega"
              rotulo="Como você quer receber"
              valor={entrega}
              opcoes={[
                { valor: "retirada", rotulo: "Retirar na JB", descricao: "Sem custo de frete" },
                { valor: "entrega", rotulo: "Receber no endereço", descricao: "Frete pelo CEP" },
              ]}
              aoMudar={(valor) => setEntrega(valor)}
            />
          ) : (
            <input type="hidden" name="entrega" value="entrega" />
          )}

          {entrega === "retirada" ? (
            <div className="flex items-start gap-3 rounded-xl border border-graf-200 bg-graf-50 p-4">
              <Store className="mt-0.5 size-5 shrink-0 text-graf-500" aria-hidden />
              <div className="min-w-0 text-sm leading-relaxed text-graf-700">
                <p className="text-base font-bold text-graf-950">Retirada na JB</p>
                {enderecoJb ? <p className="mt-1.5">{enderecoJb}</p> : null}
                {horarioJb ? <p className="mt-1">{horarioJb}</p> : null}
                {instrucoesRetirada ? (
                  <p className="mt-2.5 text-graf-600">{instrucoesRetirada}</p>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              {/* os campos do endereço andam juntos: uma moldura só, com
                  legenda, separa "onde entregar" do resultado do frete logo
                  abaixo — em vez de nove campos soltos em fila */}
              <fieldset className="min-w-0 rounded-xl border border-graf-200 p-4 sm:p-5">
                <legend className="px-1.5 text-sm font-bold text-graf-800">
                  Endereço de entrega
                </legend>

                <div className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-[10rem_minmax(0,1fr)]">
                    <CampoCep
                      name="cep"
                      required
                      valor={cep}
                      aoMudar={setCep}
                      aoEncontrar={preencherPeloCep}
                      erro={erroDoCampo("cep")}
                    />
                    <Campo
                      rotulo="Logradouro"
                      name="logradouro"
                      autoComplete="address-line1"
                      required
                      value={logradouro}
                      onChange={(evento) => setLogradouro(evento.currentTarget.value)}
                      erro={erroDoCampo("logradouro")}
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-[8rem_minmax(0,1fr)]">
                    <Campo
                      rotulo="Número"
                      name="numero"
                      required
                      value={numero}
                      onChange={(evento) => setNumero(evento.currentTarget.value)}
                      erro={erroDoCampo("numero")}
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
                      erro={erroDoCampo("bairro")}
                    />
                    <Campo
                      rotulo="Cidade"
                      name="cidade"
                      autoComplete="address-level2"
                      required
                      value={cidade}
                      onChange={(evento) => setCidade(evento.currentTarget.value)}
                      erro={erroDoCampo("cidade")}
                    />
                    <Selecao
                      rotulo="Estado"
                      name="uf"
                      autoComplete="address-level1"
                      required
                      value={uf}
                      onChange={(evento) => setUf(evento.currentTarget.value)}
                      erro={erroDoCampo("uf")}
                    >
                      <option value="">Selecione</option>
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
                </div>
              </fieldset>

              {/*
                O resultado do frete é anunciado sozinho: quem usa leitor de
                tela digita o CEP e continua no campo seguinte, e sem
                `aria-live` o valor apareceria em silêncio.
              */}
              <div aria-live="polite" aria-atomic="true">
                {digitosCep.length !== 8 ? (
                  <CaixaFrete tom="neutro" titulo="Informe o CEP para calcular o frete">
                    Com o CEP completo, mostramos aqui o valor da entrega e o prazo.
                  </CaixaFrete>
                ) : freteCarregando ? (
                  <CaixaFrete tom="neutro" titulo="Calculando o frete…">
                    Buscando a faixa de entrega deste CEP.
                  </CaixaFrete>
                ) : freteErro ? (
                  <CaixaFrete tom="atencao" titulo="Frete não calculado">
                    {freteErro}
                  </CaixaFrete>
                ) : freteEntrega?.orcadoDepois ? (
                  <CaixaFrete tom="atencao" titulo="O frete deste endereço será orçado à parte">
                    Este CEP está fora das faixas de entrega da tabela. O valor{" "}
                    <strong className="font-semibold">não entra no total agora</strong>: a JB
                    confere as dimensões do equipamento, calcula o frete e combina com você antes
                    de despachar.
                  </CaixaFrete>
                ) : freteEntrega ? (
                  <CaixaFrete
                    tom="ok"
                    titulo={
                      freteEntrega.valorCents === 0
                        ? "Entrega sem custo para este CEP"
                        : `Frete de ${formatarPreco(freteEntrega.valorCents)}`
                    }
                  >
                    <p>
                      {freteEntrega.rotulo}
                      {prazoDoFrete ? ` · ${prazoDoFrete}` : ""}
                    </p>
                    <p className="mt-1 text-[0.8125rem] text-graf-500">
                      O valor já está somado no resumo do pedido.
                    </p>
                  </CaixaFrete>
                ) : null}
              </div>
            </>
          )}
        </EtapaCheckout>

        {/* ---------------------------------------------------- 3. pagamento */}
        <EtapaCheckout
          visivel={etapa === 3}
          titulo="Pagamento"
          descricao="Escolha como quer pagar. A cobrança só é aberta depois que você confirmar o pedido na última etapa."
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 rounded-xl border border-graf-200 bg-graf-50 px-4 py-3.5">
            <span className="text-sm font-semibold text-graf-700">Total do pedido</span>
            <span className="text-xl font-extrabold tabular tracking-tight text-graf-950">
              {formatarPreco(totalComFreteCents)}
            </span>
            <span className="w-full text-[0.8125rem] leading-relaxed text-graf-500">
              {entrega === "retirada"
                ? "Retirada na JB, sem custo de frete."
                : frete?.orcadoDepois
                  ? "O frete deste endereço ainda será orçado e não está incluído."
                  : !frete
                    ? "O frete entra neste total assim que você informar o CEP na etapa de entrega."
                    : freteCents > 0
                      ? `Inclui ${formatarPreco(freteCents)} de frete.`
                      : "A entrega neste CEP é sem custo."}
            </span>
          </div>

          {metodos.length === 0 ? (
            <Aviso tom="erro" titulo="Pagamento indisponível">
              Não há forma de pagamento disponível neste momento. Fale com a JB pelo WhatsApp ou
              telefone e concluímos o pedido com você.
            </Aviso>
          ) : (
            <fieldset>
              <legend className="mb-2.5 text-sm font-semibold text-graf-800">
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
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-4 shadow-xs",
                        "transition-[border-color,background-color,box-shadow] duration-150",
                        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-jb-500",
                        ativo
                          ? "border-jb-500 bg-jb-50 ring-1 ring-inset ring-jb-500/25"
                          : "border-graf-300 bg-white hover:border-graf-400 hover:bg-graf-50",
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
                        className={cn(
                          "mt-0.5 size-5 shrink-0",
                          ativo ? "text-jb-600" : "text-graf-500",
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0">
                        <span
                          className={cn(
                            "block text-base font-bold",
                            ativo ? "text-jb-800" : "text-graf-900",
                          )}
                        >
                          {opcao === "pix" ? "Pix" : "Cartão de crédito"}
                        </span>
                        <span className="mt-1 block text-sm leading-snug text-graf-600">
                          {opcao === "pix"
                            ? "Pague à vista pelo app do banco"
                            : parcelas.length > 1
                              ? `À vista ou em até ${parcelas.length}× sem juros`
                              : "À vista"}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {metodo === "pix" && metodos.includes("pix") ? (
            <ResumoPix simulado={simulado} />
          ) : null}

          {metodo === "cartao" && metodos.includes("cartao") ? (
            <>
              {parcelas.length > 1 ? (
                <Selecao
                  rotulo="Parcelamento"
                  name="parcelas"
                  value={String(numeroParcelas)}
                  onChange={(evento) => setNumeroParcelas(Number(evento.currentTarget.value))}
                  ajuda="Parcelamento sem juros no cartão de crédito."
                >
                  {/*
                    O NÚMERO de parcelas vem do servidor (teto da loja sobre o
                    total dos itens); o VALOR de cada uma é recalculado aqui
                    porque o frete entrou depois. O teto continua valendo: com
                    um total maior, o servidor nunca permite menos parcelas do
                    que já ofereceu.
                  */}
                  {parcelas.map((p) => (
                    <option key={p.numero} value={p.numero}>
                      {p.numero === 1
                        ? `À vista — ${formatarPreco(totalComFreteCents)}`
                        : `${p.numero}× de ${formatarPreco(
                            Math.floor(totalComFreteCents / p.numero),
                          )} sem juros`}
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
                valorCents={totalComFreteCents}
                parcelas={numeroParcelas}
                token={cartao.token}
                bandeira={cartao.bandeira}
                aoMudar={setCartao}
              />
            </>
          ) : (
            <input type="hidden" name="parcelas" value="1" />
          )}
        </EtapaCheckout>

        {/* ------------------------------------------------------ 4. revisão */}
        <EtapaCheckout
          visivel={etapa === ULTIMA}
          titulo="Revisão"
          descricao="Confira os dados antes de confirmar. Depois disso a JB reserva o equipamento e abre a cobrança."
        >
          {/* campo vazio não vira traço repetido: some, e o botão Editar leva
              de volta ao lugar onde ele é preenchido */}
          <div className="space-y-3">
            <BlocoRevisao titulo="Identificação" icone={UserRound} aoEditar={() => irPara(0)}>
              {email ? <p className="break-words font-semibold">{email}</p> : null}
              {logado ? (
                <p className="text-graf-600">O pedido fica na conta em que você está.</p>
              ) : modoAcesso === "criar" ? (
                <p className="text-graf-600">
                  Sua conta na JB será criada com este e-mail ao confirmar.
                </p>
              ) : (
                <p className="text-graf-600">Você entrará na sua conta ao confirmar.</p>
              )}
            </BlocoRevisao>

            <BlocoRevisao titulo="Comprador" icone={UserRound} aoEditar={() => irPara(1)}>
              {nome ? <p className="font-semibold">{nome}</p> : null}
              {tipoPessoa === "juridica" && razaoSocial ? <p>{razaoSocial}</p> : null}
              {telefone ? <p className="text-graf-600">{telefone}</p> : null}
              {documento ? (
                <p className="text-graf-600">
                  {tipoPessoa === "fisica" ? "CPF" : "CNPJ"} {documento}
                </p>
              ) : null}
            </BlocoRevisao>

            <BlocoRevisao
              titulo="Entrega"
              icone={entrega === "retirada" ? Store : MapPin}
              aoEditar={() => irPara(2)}
            >
              {entrega === "retirada" ? (
                <>
                  <p className="font-semibold">Retirada na JB</p>
                  {enderecoJb ? <p className="text-graf-600">{enderecoJb}</p> : null}
                  {horarioJb ? <p className="text-graf-600">{horarioJb}</p> : null}
                </>
              ) : (
                <>
                  {logradouro ? (
                    <p className="font-semibold">
                      {logradouro}
                      {numero ? `, ${numero}` : ""}
                      {complemento ? ` — ${complemento}` : ""}
                    </p>
                  ) : null}
                  {bairro || cidade || uf ? (
                    <p className="text-graf-600">
                      {[bairro, cidade && uf ? `${cidade}/${uf}` : cidade].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                  {cep ? <p className="text-graf-600">CEP {cep}</p> : null}
                  {referencia ? (
                    <p className="text-graf-600">Referência: {referencia}</p>
                  ) : null}

                  {freteEntrega?.orcadoDepois ? (
                    <p className="pt-1 font-semibold text-warn-700">
                      Frete a combinar — orçado à parte, fora deste total
                    </p>
                  ) : freteEntrega ? (
                    <p className="pt-1 font-semibold text-graf-900">
                      {freteEntrega.valorCents === 0
                        ? "Entrega sem custo"
                        : `Frete ${formatarPreco(freteEntrega.valorCents)}`}
                      {prazoDoFrete ? (
                        <span className="font-normal text-graf-600"> · {prazoDoFrete}</span>
                      ) : null}
                    </p>
                  ) : (
                    <p className="pt-1 font-semibold text-warn-700">
                      Frete ainda não calculado — informe o CEP na etapa de entrega
                    </p>
                  )}
                </>
              )}
            </BlocoRevisao>

            <BlocoRevisao
              titulo="Pagamento"
              icone={metodo === "pix" ? QrCode : CreditCard}
              aoEditar={() => irPara(3)}
            >
              <p className="font-semibold">
                {metodo === "pix"
                  ? "Pix à vista"
                  : numeroParcelas > 1
                    ? `Cartão de crédito em ${numeroParcelas}× de ${formatarPreco(
                        Math.floor(totalComFreteCents / numeroParcelas),
                      )} sem juros`
                    : "Cartão de crédito à vista"}
              </p>
              <p className="text-graf-600">
                {metodo === "pix"
                  ? "O código aparece na página do pedido logo depois da confirmação."
                  : "A cobrança é feita quando você confirma o pedido."}
              </p>
            </BlocoRevisao>
          </div>

          <div className="rounded-xl border border-jb-200 bg-jb-50 px-5 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <span className="text-base font-bold text-graf-950">Total a pagar</span>
              <span className="text-2xl font-extrabold tabular tracking-tight text-jb-700">
                {formatarPreco(totalComFreteCents)}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-graf-600">
              {entrega === "retirada"
                ? "Retirada na JB, sem custo de frete."
                : freteEntrega && !freteEntrega.orcadoDepois
                  ? `${
                      freteEntrega.valorCents === 0
                        ? "Entrega sem custo neste CEP."
                        : `Inclui ${formatarPreco(freteEntrega.valorCents)} de frete.`
                    }${
                      prazoDoFrete
                        ? ` Prazo de ${prazoDoFrete} após a confirmação do pagamento.`
                        : ""
                    }`
                  : "O frete não está incluído — veja o aviso abaixo."}
            </p>
          </div>

          <Area
            rotulo="Observação para a JB"
            name="observacao"
            rows={3}
            maxLength={1000}
            value={observacao}
            onChange={(evento) => setObservacao(evento.currentTarget.value)}
            erro={erroDoCampo("observacao")}
            ajuda="Horário melhor para entrega, acesso à clínica, o que mais ajudar. Opcional."
          />

          {entrega === "entrega" && (!freteEntrega || freteEntrega.orcadoDepois) ? (
            <Aviso tom="atencao" titulo="O frete será combinado depois">
              O valor do frete <strong className="font-semibold">não entra neste total</strong>. A
              JB confere as dimensões do equipamento e o endereço, e entra em contato com o valor
              antes de despachar. Você aprova antes de qualquer cobrança extra.
            </Aviso>
          ) : null}
        </EtapaCheckout>

        {/* ------------------------------------------------------ navegação */}
        <div className="mt-9 flex flex-wrap items-center gap-3 border-t border-graf-200 pt-6">
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
              {enviando
                ? "Confirmando o pedido…"
                : `Confirmar pedido — ${formatarPreco(totalComFreteCents)}`}
            </Botao>
          )}
        </div>
      </Cartao>

      {/* o sinal de confiança fica em linguagem de cliente: o que acontece com
          o dinheiro e o que acontece com o equipamento */}
      <ul className="mt-5 space-y-2.5 text-sm leading-relaxed text-graf-600">
        <li className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
          <span>
            <strong className="font-semibold text-graf-900">Pagamento seguro.</strong> Os dados do
            pagamento ficam com o meio de pagamento — a JB não guarda cartão.
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <Truck className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
          <span>
            Ao confirmar, a JB reserva o equipamento e entra em contato por telefone ou WhatsApp
            para acertar a entrega e a instalação.
          </span>
        </li>
      </ul>
    </form>
  );
}
