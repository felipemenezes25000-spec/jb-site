"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CreditCard,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Sliders,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { adicionarAoCarrinho, type EstadoCarrinho } from "@/app/acoes/carrinho";
import { EntregaPorCep } from "@/components/loja/produto/entrega-por-cep";
import { Botao, LinkBotao } from "@/components/ui/button";
import { Aviso } from "@/components/ui/aviso";
import { Etiqueta } from "@/components/ui/data";
import { calcularParcelas, formatarPreco, plural } from "@/lib/format";
import { JB_CARE } from "@/lib/jb-care";
import { cn } from "@/lib/utils";

/* ============================================================================
   Caixa de compra

   O bloco que decide a venda: disponibilidade, preço, parcelamento, entrega,
   quantidade, ação e, por último, personalização com serviços. É a ÚNICA
   moldura da coluna da direita — o resto da coluna corre sem borda, separado
   por fios. Empilhar cartões dentro de cartões faz uma ficha de equipamento
   parecer painel de SaaS; aqui a compra precisa continuar sendo o protagonista.

   SERVIÇOS SÃO UMA CAMADA OPCIONAL DA DECISÃO

   Instalação, preventiva e orientação são diferenciais da JB, mas não podem
   competir com preço, entrega e CTA. Por isso ficam atrás de uma única linha
   progressiva "Adicionar serviços JB". Quem quer só o equipamento entende a
   compra sem atravessar configuração; quem quer acompanhamento abre a linha e
   recebe exatamente as mesmas escolhas e preços de antes.

   A regra que isso NÃO pode quebrar: **serviço pago nunca vem marcado.** O
   estado inicial é "só o equipamento" com os adicionais obrigatórios (os que
   a JB marcou como parte do produto), e nada além disso. Marcar o pacote por
   padrão seria dark pattern.

   Preço e total aqui são só exibição. Quem soma para valer é o servidor, em
   `calcularTotais` e em `criarPedido` — este componente reproduz a MESMA
   regra para que o número da tela bata com o do carrinho, nunca para
   substituí-la.
   ============================================================================ */

export type AddonProduto = {
  serviceId: string;
  nome: string;
  descricao: string;
  precoCents: number | null;
  obrigatorio: boolean;
};

export function CaixaCompra({
  produtoId,
  precoCents,
  compareAtCents,
  permiteCompra,
  permiteOrcamento,
  estoque,
  controlaEstoque,
  unico,
  addons,
  hrefOrcamento,
  maxParcelas,
  minParcelaCents,
  garantia,
}: {
  produtoId: string;
  precoCents: number;
  compareAtCents: number | null;
  permiteCompra: boolean;
  permiteOrcamento: boolean;
  estoque: number;
  controlaEstoque: boolean;
  unico: boolean;
  addons: AddonProduto[];
  /** Já montado no servidor, com o nome do equipamento na proposta. */
  hrefOrcamento: string;
  /** Teto de parcelas configurado pela JB — o mesmo que o checkout aplica. */
  maxParcelas: number;
  /** Valor mínimo da parcela, também vindo da configuração da loja. */
  minParcelaCents: number;
  /**
   * Garantia, em meses, e se ela é da unidade específica.
   *
   * Entra DENTRO da moldura que decide a compra: preço, ação principal e
   * garantia são a mesma decisão, e a garantia ficava só no bloco de
   * condições, abaixo da foto — a duas rolagens do botão em telas pequenas.
   * É a linha, não o bloco: repetir "Condições desta compra" inteiro aqui
   * devolveria a pilha de cartões que a coluna passou a evitar.
   */
  garantia?: { meses: number; daUnidade: boolean } | null;
}) {
  const router = useRouter();
  const [quantidade, setQuantidade] = useState(1);
  const obrigatorios = addons.filter((a) => a.obrigatorio).map((a) => a.serviceId);
  const [escolhidos, setEscolhidos] = useState<string[]>(obrigatorios);
  const [detalhando, setDetalhando] = useState(false);

  /**
   * Para onde ir depois de adicionar: carrinho ou pagamento.
   *
   * Fica numa `ref`, e não em estado nem em campo escondido. Os dois botões
   * enviam o MESMO formulário, então o destino precisa estar decidido no
   * instante em que o navegador serializa os campos — e a primeira versão
   * disto usava um `<input type="hidden">` atualizado por `setState` no
   * `onClick`. Não funcionava: o re-render do React não acontece antes da ação
   * padrão do clique, então "Comprar agora" mandava `destino=carrinho` e a
   * pessoa acabava com um aviso de item adicionado em vez do checkout.
   *
   * `ref` muda no mesmo instante do clique. O estado ao lado existe só para o
   * botão certo mostrar o carregando.
   */
  const destinoRef = useRef<"carrinho" | "checkout">("carrinho");
  const [irParaPagamento, setIrParaPagamento] = useState(false);

  const [estado, acao, enviando] = useActionState<EstadoCarrinho, FormData>(
    async (anterior, formData) => {
      const direto = destinoRef.current === "checkout";
      const resultado = await adicionarAoCarrinho(anterior, formData);

      if (resultado.ok) {
        if (direto) {
          /* Comprar agora não recomeça a caixa: a pessoa está saindo da
             página. Resetar aqui faria a caixa piscar vazia por um quadro
             antes da navegação. */
          router.push("/checkout");
          return resultado;
        }

        /* Depois de uma ação, o React 19 chama `form.reset()` sozinho. O reset
           age no DOM e não no estado: os checkboxes de serviço voltavam a
           desmarcados enquanto `escolhidos` continuava cheio, e como não havia
           re-render a linha seguia com o fundo destacado e o Total seguia
           somando serviços que a tela já mostrava desmarcados.

           Voltar o estado ao inicial junto com o reset mantém os dois lados
           contando a mesma história — e é o que faz sentido depois de mandar o
           item para o carrinho: a caixa recomeça limpa, com os obrigatórios
           marcados. O que foi enviado não muda; os campos que o servidor lê são
           os `hidden` montados a partir deste mesmo estado. */
        setQuantidade(1);
        setEscolhidos(obrigatorios);

        toast.success(resultado.ok, {
          action: { label: "Ver carrinho", onClick: () => router.push("/carrinho") },
        });
      }
      return resultado;
    },
    {},
  );

  const semEstoque = controlaEstoque && estoque <= 0;
  const maximo = unico ? 1 : controlaEstoque ? Math.max(1, estoque) : 99;
  const soOrcamento = !permiteCompra || precoCents <= 0;
  const parcelas = soOrcamento
    ? null
    : calcularParcelas(precoCents, maxParcelas, minParcelaCents);

  // Só é "preço anterior" quando de fato é maior — cadastro com valor igual ou
  // menor não vira desconto de mentira na tela.
  const precoAnteriorCents =
    compareAtCents && compareAtCents > precoCents ? compareAtCents : null;
  const economiaCents = precoAnteriorCents ? precoAnteriorCents - precoCents : 0;
  const desconto = precoAnteriorCents
    ? Math.round((economiaCents / precoAnteriorCents) * 100)
    : 0;

  // O adicional é cobrado por unidade — dois equipamentos são duas instalações.
  // É assim que calcularTotais e criarPedido somam; somar uma vez só aqui
  // mostraria um total menor do que o carrinho cobra na tela seguinte.
  const selecionados = addons.filter((a) => escolhidos.includes(a.serviceId));
  const totalAddons =
    selecionados.reduce((soma, a) => soma + (a.precoCents ?? 0), 0) * quantidade;
  const total = precoCents * quantidade + totalAddons;
  const mostrarTotal = totalAddons > 0 || quantidade > 1;
  const servicosComPreco = selecionados.filter((a) => (a.precoCents ?? 0) > 0).length;

  /* No catálogo JB, adicional com valor <= 0 significa "sob orçamento". Ele
     pode continuar selecionável para o cliente entender/configurar o pedido,
     mas a compra direta não pode seguir como se o serviço custasse zero. O
     Server Action repete esta trava com os dados do banco. */
  const servicoSobOrcamento = selecionados.find((a) => (a.precoCents ?? 0) <= 0) ?? null;
  const baseCompravel = !soOrcamento && !semEstoque;
  const podeComprar = baseCompravel && !servicoSobOrcamento;

  /* ------------------------------------------------------------- JB Care */

  const opcionais = addons.filter((a) => !a.obrigatorio);
  const pacoteAtivo =
    opcionais.length > 0 && opcionais.every((a) => escolhidos.includes(a.serviceId));
  const precoDoPacote = opcionais.reduce((soma, a) => soma + (a.precoCents ?? 0), 0);
  /* Adicional sem preço cadastrado é "sob orçamento" — é assim que a linha dele
     já aparecia. Somar zero por ele daria um total menor do que a JB vai
     cobrar, então o pacote com um desses vira "a partir de" e diz qual item
     ainda não tem valor. Fingir total fechado aqui é o tipo de número que só
     é descoberto na fatura. */
  const semPrecoNoPacote = opcionais.filter((a) => (a.precoCents ?? 0) <= 0);

  function escolherPacote(ligar: boolean) {
    setEscolhidos(
      ligar ? [...obrigatorios, ...opcionais.map((a) => a.serviceId)] : obrigatorios,
    );
  }

  const CLASSE_PAINEL_COMPRA =
    "overflow-hidden rounded-[10px] border border-graf-300 bg-white shadow-card";
  const CLASSE_SECAO_COMPRA = "border-t border-graf-200 px-5 py-4";
  const CLASSE_ACOES_COMPRA = "mt-4 grid gap-2";
  const CLASSE_GARANTIA_COMPRA =
    "flex items-start gap-2.5 border-t border-graf-200 px-5 py-3 text-xs leading-5 text-graf-600";

  return (
    <div className={CLASSE_PAINEL_COMPRA}>
      <div className="px-5 py-4">
        <div className="mb-3">
          {semEstoque ? (
            <Etiqueta tom="neutro">{unico ? "Vendido" : "Sem estoque no momento"}</Etiqueta>
          ) : unico ? (
            <Etiqueta tom="alerta" ponto>
              Unidade única disponível
            </Etiqueta>
          ) : controlaEstoque && estoque <= 3 ? (
            <Etiqueta tom="aguardando" ponto>
              {estoque === 1 ? "Última unidade" : `Últimas ${estoque} unidades`}
            </Etiqueta>
          ) : (
            <Etiqueta tom="ok" ponto>
              Disponível
            </Etiqueta>
          )}
        </div>

        {soOrcamento ? (
          <div>
            <p className="text-title texto-forte">Disponível sob orçamento</p>
            <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-graf-600">
              A equipe da JB confere disponibilidade e condições antes de fechar o preço
              deste equipamento. Peça a proposta e receba os valores separados por item.
            </p>
          </div>
        ) : (
          <div>
            {precoAnteriorCents ? (
              <p className="mb-1 flex flex-wrap items-center gap-2.5">
                <span className="text-sm text-graf-500 line-through">
                  {formatarPreco(precoAnteriorCents)}
                </span>
                {/* mesmo piso do cartão da vitrine: abaixo de 5% o selo vira
                    ruído e a diferença já está no valor riscado */}
                {desconto >= 5 ? <Etiqueta tom="ok">−{desconto}%</Etiqueta> : null}
              </p>
            ) : null}

            {/* 44px só a partir de `xl`: em 1024px a coluna tem ~345px úteis,
                e um preço de seis dígitos nesse corpo não caberia na linha. */}
            <p className="numero text-[2.25rem] leading-none text-graf-950 xl:text-[2.5rem]">
              {formatarPreco(precoCents)}
            </p>

            {parcelas ? (
              <p className="mt-2 text-sm leading-6 text-graf-600">
                em até{" "}
                <span className="font-semibold text-graf-900">
                  {parcelas.parcelas}× de {formatarPreco(parcelas.valorCents)}
                </span>{" "}
                sem juros no cartão
              </p>
            ) : null}

            <p className="mt-1 flex items-center gap-2 text-xs text-graf-500">
              <CreditCard className="size-4 shrink-0 text-graf-500" aria-hidden />
              Pix ou cartão de crédito
            </p>

            {economiaCents > 0 ? (
              <p className="mt-2 text-sm font-semibold text-ok-700">
                Economia de {formatarPreco(economiaCents)}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* Consultar entrega é parte da decisão e vem imediatamente depois do
          preço. Fica fora do formulário para Enter no CEP nunca comprar. */}
      {baseCompravel ? <EntregaPorCep produtoId={produtoId} /> : null}

      {baseCompravel ? (
        <form action={acao} className={`${CLASSE_SECAO_COMPRA} space-y-4`}>
          <input type="hidden" name="produtoId" value={produtoId} />
          <input type="hidden" name="quantidade" value={quantidade} />
          {escolhidos.map((id) => (
            <input key={id} type="hidden" name="addons" value={id} />
          ))}

          {!unico ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[0.9375rem] font-semibold text-graf-800" id="rotulo-quantidade">
                Quantidade
              </span>
              <div className="flex items-center rounded-lg border border-graf-300 bg-white">
                <button
                  type="button"
                  onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                  disabled={quantidade <= 1}
                  aria-label="Diminuir quantidade"
                  className="foco-jb flex size-11 items-center justify-center rounded-l-lg text-graf-700 transition-colors duration-150 hover:bg-graf-50 disabled:cursor-not-allowed disabled:text-graf-500 disabled:hover:bg-transparent"
                >
                  <Minus className="size-4" aria-hidden />
                </button>
                <output
                  aria-live="polite"
                  aria-labelledby="rotulo-quantidade"
                  className="w-12 text-center text-base font-bold tabular text-graf-950"
                >
                  {quantidade}
                </output>
                <button
                  type="button"
                  onClick={() => setQuantidade((q) => Math.min(maximo, q + 1))}
                  disabled={quantidade >= maximo}
                  aria-label="Aumentar quantidade"
                  className="foco-jb flex size-11 items-center justify-center rounded-r-lg text-graf-700 transition-colors duration-150 hover:bg-graf-50 disabled:cursor-not-allowed disabled:text-graf-500 disabled:hover:bg-transparent"
                >
                  <Plus className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          ) : null}

          {addons.length > 0 ? (
            <details className="group overflow-hidden rounded-xl border border-graf-200 bg-graf-50/45">
              <summary className="foco-jb flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-bold text-graf-900">
                    <Sliders className="size-4 shrink-0 text-jb-600" aria-hidden />
                    Adicionar serviços JB
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-graf-500">
                    Instalação, orientação e manutenção, quando disponíveis.
                  </span>
                </span>
                <span className="shrink-0 text-xs font-bold text-jb-700 group-open:hidden">
                  Personalizar
                </span>
                <span className="hidden shrink-0 text-xs font-bold text-graf-500 group-open:inline">
                  Recolher
                </span>
              </summary>
              <div className="border-t border-graf-200 bg-white p-4">
                <PacoteDeServicos
                  obrigatorios={addons.filter((a) => a.obrigatorio)}
                  opcionais={opcionais}
                  escolhidos={escolhidos}
                  pacoteAtivo={pacoteAtivo}
                  precoDoPacote={precoDoPacote}
                  semPreco={semPrecoNoPacote.map((a) => a.nome)}
                  detalhando={detalhando}
                  aoDetalhar={() => setDetalhando((v) => !v)}
                  aoEscolherPacote={escolherPacote}
                  aoAlternar={(serviceId) =>
                    setEscolhidos((atuais) =>
                      atuais.includes(serviceId)
                        ? atuais.filter((s) => s !== serviceId)
                        : [...atuais, serviceId],
                    )
                  }
                />
              </div>
            </details>
          ) : null}

          {mostrarTotal ? (
            <div className="border-t border-graf-200 pt-4">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[0.9375rem] font-semibold text-graf-700">Total</span>
                <span className="text-2xl font-extrabold tabular text-graf-950">
                  {formatarPreco(total)}
                </span>
              </div>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-graf-500">
                {plural(quantidade, "equipamento", "equipamentos")}
                {servicosComPreco > 0
                  ? ` + ${plural(servicosComPreco * quantidade, "serviço", "serviços")}`
                  : ""}
              </p>
            </div>
          ) : null}

          {servicoSobOrcamento ? (
            <Aviso
              tom="atencao"
              titulo={
                servicoSobOrcamento.obrigatorio
                  ? "Há um serviço obrigatório sob orçamento"
                  : "O serviço selecionado ainda precisa de orçamento"
              }
            >
              {servicoSobOrcamento.obrigatorio
                ? "A compra direta fica bloqueada até a JB definir o valor desse serviço. Solicite uma proposta para receber equipamento e serviço separados."
                : "Desmarque esse serviço para comprar o equipamento agora, ou solicite uma proposta com o serviço incluído."}
            </Aviso>
          ) : null}

          {estado.erro ? <Aviso tom="erro">{estado.erro}</Aviso> : null}

          <div className={CLASSE_ACOES_COMPRA}>
            <Botao
              type="submit"
              tamanho="lg"
              larguraTotal
              disabled={enviando || !podeComprar}
              carregando={enviando && irParaPagamento && podeComprar}
              onClick={() => {
                destinoRef.current = "checkout";
                setIrParaPagamento(true);
              }}
            >
              <Zap className="size-[18px]" aria-hidden />
              Comprar agora
            </Botao>

            <Botao
              type="submit"
              variante="secundario"
              tamanho="lg"
              larguraTotal
              disabled={enviando || !podeComprar}
              carregando={enviando && !irParaPagamento && podeComprar}
              onClick={() => {
                destinoRef.current = "carrinho";
                setIrParaPagamento(false);
              }}
            >
              <ShoppingCart className="size-[18px]" aria-hidden />
              Adicionar ao carrinho
            </Botao>

            {permiteOrcamento ? (
              <>
                <LinkBotao href={hrefOrcamento} variante="texto" tamanho="lg" larguraTotal>
                  Solicitar orçamento
                </LinkBotao>
                <p className="pt-1 text-center text-[0.8125rem] leading-relaxed text-graf-500">
                  A proposta chega com equipamento, serviço e deslocamento separados.
                </p>
              </>
            ) : null}
          </div>
        </form>
      ) : permiteOrcamento ? (
        <div className="border-t border-graf-200 p-5 sm:p-6">
          <LinkBotao href={hrefOrcamento} tamanho="lg" larguraTotal>
            Solicitar orçamento
          </LinkBotao>
          <p className="mt-2.5 text-center text-[0.8125rem] leading-relaxed text-graf-500">
            A proposta chega com equipamento, serviço e deslocamento separados.
          </p>
        </div>
      ) : (
        /* Sem compra direta e sem orçamento, a caixa ficaria sem saída
           nenhuma. O contato é o próximo passo que sempre existe. */
        <div className="border-t border-graf-200 p-5 sm:p-6">
          <LinkBotao href="/contato" variante="secundario" tamanho="lg" larguraTotal>
            Falar com a equipe
          </LinkBotao>
        </div>
      )}

      {garantia && garantia.meses > 0 ? (
        <p className={CLASSE_GARANTIA_COMPRA}>
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
          <span>
            <span className="font-bold text-graf-950">
              Garantia de {garantia.meses} {garantia.meses === 1 ? "mês" : "meses"}
            </span>
            {garantia.daUnidade ? " — registrada para esta unidade específica." : "."}
          </span>
        </p>
      ) : null}
    </div>
  );
}

/* ==========================================================================
   Pacote de serviços (JB Care)
   ========================================================================== */

function PacoteDeServicos({
  obrigatorios,
  opcionais,
  escolhidos,
  pacoteAtivo,
  precoDoPacote,
  semPreco,
  detalhando,
  aoDetalhar,
  aoEscolherPacote,
  aoAlternar,
}: {
  obrigatorios: AddonProduto[];
  opcionais: AddonProduto[];
  escolhidos: string[];
  pacoteAtivo: boolean;
  precoDoPacote: number;
  /** Nomes dos opcionais sem preço cadastrado — o pacote vira "a partir de". */
  semPreco: string[];
  detalhando: boolean;
  aoDetalhar: () => void;
  aoEscolherPacote: (ligar: boolean) => void;
  aoAlternar: (serviceId: string) => void;
}) {
  /* Com um opcional só, o par de alternativas não ajuda: "só o equipamento"
     versus "equipamento + instalação" é a mesma caixa de seleção com mais
     palavras. Nesse caso a lista simples é mais honesta. */
  const vaiDeAlternativas = opcionais.length >= 2;
  const mostrarLista = opcionais.length > 0 && (!vaiDeAlternativas || detalhando);

  return (
    <fieldset>
      <legend className="text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-graf-500">
        Serviços da equipe JB
      </legend>
      <p className="mb-3 mt-1.5 text-[0.8125rem] leading-relaxed text-graf-500">
        Entram no mesmo pedido e são executados pela equipe técnica.
      </p>

      {obrigatorios.length > 0 ? (
        <ul className="mb-3 space-y-1.5">
          {obrigatorios.map((addon) => (
            <li
              key={addon.serviceId}
              className="flex items-start gap-2 text-[0.8125rem] leading-relaxed text-graf-600"
            >
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
              <span>
                <span className="font-semibold text-graf-800">{addon.nome}</span> — incluído
                obrigatoriamente neste equipamento
                {(addon.precoCents ?? 0) > 0
                  ? ` (+ ${formatarPreco(addon.precoCents ?? 0)})`
                  : " — sob orçamento"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {vaiDeAlternativas ? (
        <div className="space-y-2">
          <AlternativaDoPacote
            marcada={!pacoteAtivo}
            titulo={JB_CARE.rotuloSemPacote}
            descricao={JB_CARE.descricaoSemPacote}
            valor={null}
            aoEscolher={() => aoEscolherPacote(false)}
          />
          <AlternativaDoPacote
            marcada={pacoteAtivo}
            titulo={JB_CARE.rotuloComPacote}
            descricao={JB_CARE.resumo}
            valor={precoDoPacote > 0 ? precoDoPacote : null}
            aPartirDe={semPreco.length > 0}
            ressalva={
              semPreco.length > 0
                ? `${semPreco.join(" e ")} ${semPreco.length > 1 ? "são orçados" : "é orçado"} pela equipe antes da execução.`
                : undefined
            }
            itens={opcionais.map((a) => a.nome)}
            aoEscolher={() => aoEscolherPacote(true)}
          />

          <button
            type="button"
            onClick={aoDetalhar}
            aria-expanded={detalhando}
            className="foco-jb inline-flex min-h-9 items-center gap-1.5 rounded-md text-[0.8125rem] font-semibold text-graf-600 transition-colors hover:text-jb-700"
          >
            <Sliders className="size-3.5" aria-hidden />
            {detalhando ? "Esconder os serviços" : "Escolher serviço por serviço"}
          </button>
        </div>
      ) : null}

      {mostrarLista ? (
        /* Uma moldura só, com fio entre as linhas: três serviços não podem
           virar três caixas dentro da caixa de compra. */
        <div
          className={cn(
            "divide-y divide-graf-200 overflow-hidden rounded-lg border border-graf-200",
            vaiDeAlternativas && "mt-3",
          )}
        >
          {opcionais.map((addon) => {
            const marcado = escolhidos.includes(addon.serviceId);
            const precoAddon = addon.precoCents ?? 0;

            return (
              <label
                key={addon.serviceId}
                className={cn(
                  "flex min-h-11 cursor-pointer items-start gap-3 p-3.5",
                  "transition-[background-color] duration-150",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-jb-500",
                  marcado ? "bg-jb-50/60" : "hover:bg-graf-50",
                )}
              >
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() => aoAlternar(addon.serviceId)}
                  className="mt-0.5 size-[18px] shrink-0 rounded border-graf-450 text-jb-500 focus:outline-none"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="text-[0.9375rem] font-semibold text-graf-900">
                      {addon.nome}
                    </span>
                    <span className="text-[0.9375rem] font-bold tabular text-graf-800">
                      {precoAddon > 0 ? `+ ${formatarPreco(precoAddon)}` : "sob orçamento"}
                    </span>
                  </span>
                  {addon.descricao ? (
                    <span className="mt-1 block text-[0.8125rem] leading-relaxed text-graf-500">
                      {addon.descricao}
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
      ) : null}
    </fieldset>
  );
}

function AlternativaDoPacote({
  marcada,
  titulo,
  descricao,
  valor,
  aPartirDe,
  ressalva,
  itens,
  aoEscolher,
}: {
  marcada: boolean;
  titulo: string;
  descricao: string;
  /** `null` quando a alternativa não acrescenta nada ao preço fechado. */
  valor: number | null;
  /** O valor é um piso, não o total: há item ainda sem preço no pacote. */
  aPartirDe?: boolean;
  /** Uma frase dizendo o que ainda será orçado. */
  ressalva?: string;
  itens?: string[];
  aoEscolher: () => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors duration-150",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-jb-500",
        marcada ? "border-jb-400 bg-jb-50/60" : "border-graf-200 hover:bg-graf-50",
      )}
    >
      <input
        type="radio"
        name="jb-care"
        checked={marcada}
        onChange={aoEscolher}
        className="mt-0.5 size-[18px] shrink-0 border-graf-450 text-jb-500 focus:outline-none"
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="text-[0.9375rem] font-bold text-graf-900">{titulo}</span>
          {valor !== null ? (
            <span className="shrink-0 text-right text-[0.9375rem] font-bold tabular text-graf-800">
              {aPartirDe ? (
                <span className="block text-[0.75rem] font-semibold uppercase tracking-wide text-graf-500">
                  a partir de
                </span>
              ) : null}
              + {formatarPreco(valor)}
            </span>
          ) : aPartirDe ? (
            <span className="shrink-0 text-[0.8125rem] font-semibold text-graf-500">
              sob orçamento
            </span>
          ) : null}
        </span>
        <span className="mt-1 block text-[0.8125rem] leading-relaxed text-graf-500">
          {descricao}
        </span>
        {ressalva ? (
          <span className="mt-1.5 block text-[0.75rem] leading-relaxed text-graf-500">
            {ressalva}
          </span>
        ) : null}
        {itens && itens.length > 0 ? (
          <span className="mt-2 flex flex-wrap gap-1.5">
            {itens.map((item) => (
              <span
                key={item}
                className="inline-flex items-center rounded-full border border-graf-200 bg-white px-2.5 py-0.5 text-[0.75rem] font-semibold text-graf-700"
              >
                {item}
              </span>
            ))}
          </span>
        ) : null}
      </span>
    </label>
  );
}
