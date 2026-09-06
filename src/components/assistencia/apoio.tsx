import { MessageCircle, Phone } from "lucide-react";

import { Cartao } from "@/components/ui/data";
import { telHref, whatsappHref } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Coluna de apoio da assistência

   Abrir chamado, pedir orçamento e ver um serviço têm a mesma anatomia: o
   formulário ou o conteúdo à esquerda, e à direita uma pilha curta de cartões
   que respondem "o que eu preciso ter em mãos", "o que acontece depois" e
   "e se eu quiser falar com alguém".

   Antes cada uma dessas telas desenhava os próprios cartões, com título ora
   em 14px ora em 15px e a lista de contato repetida quatro vezes. Aqui a
   forma é uma só — e o telefone e o WhatsApp continuam saindo de
   `getSettings()`, nunca escritos no código.
   ============================================================================ */

export function CartaoApoio({
  titulo,
  descricao,
  children,
  className,
}: {
  titulo: string;
  descricao?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Cartao className={cn("p-6", className)}>
      <h2 className="text-base font-bold text-graf-950">{titulo}</h2>
      {descricao ? (
        <p className="mt-2 text-sm leading-relaxed text-graf-600">{descricao}</p>
      ) : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </Cartao>
  );
}

/**
 * Lista de itens com ícone — "o que deixar por perto", "o que acontece depois".
 *
 * O ícone aqui é decorativo: quem lê a linha não perde nada se não enxergar o
 * desenho. Por isso ele fica em grafite, e o vermelho da marca sobra para o
 * que de fato é ação — o telefone, o WhatsApp, o botão.
 */
export function ListaDeApoio({
  itens,
  numerada,
  className,
}: {
  itens: { icone: React.ComponentType<{ className?: string }>; texto: React.ReactNode }[];
  /** Vira `<ol>` e anuncia "Passo N" para quem usa leitor de tela. */
  numerada?: boolean;
  className?: string;
}) {
  const Lista = numerada ? "ol" : "ul";

  return (
    <Lista className={cn("space-y-4 text-sm", className)}>
      {itens.map((item, indice) => (
        <li key={indice} className="flex gap-3">
          <item.icone className="mt-0.5 size-4.5 shrink-0 text-graf-400" aria-hidden />
          <span className="leading-relaxed text-graf-600">
            {numerada ? <span className="sr-only">Passo {indice + 1}: </span> : null}
            {item.texto}
          </span>
        </li>
      ))}
    </Lista>
  );
}

/**
 * Telefone e WhatsApp da JB, com alvo de toque de 44px em cada linha.
 * Canal sem valor configurado no painel simplesmente não aparece.
 */
export function CanaisDiretos({
  telefone,
  whatsapp,
  mensagem,
  className,
}: {
  telefone: string;
  whatsapp: string;
  /** Texto que abre a conversa no WhatsApp. */
  mensagem: string;
  className?: string;
}) {
  const link = whatsappHref(whatsapp, mensagem);
  if (!telefone && !link) return null;

  return (
    <ul className={cn("space-y-1", className)}>
      {telefone ? (
        <li>
          <Canal icone={Phone} canal="Telefone" valor={telefone} href={telHref(telefone)} />
        </li>
      ) : null}
      {link ? (
        <li>
          <Canal icone={MessageCircle} canal="WhatsApp" valor={whatsapp} href={link} externo />
        </li>
      ) : null}
    </ul>
  );
}

function Canal({
  icone: Icone,
  canal,
  valor,
  href,
  externo,
}: {
  icone: React.ComponentType<{ className?: string }>;
  canal: string;
  valor: string;
  href: string;
  externo?: boolean;
}) {
  return (
    <a
      href={href}
      target={externo ? "_blank" : undefined}
      rel={externo ? "noopener noreferrer" : undefined}
      className="-mx-2 flex min-h-11 items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-graf-50"
    >
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-jb-50 text-jb-600 ring-1 ring-inset ring-jb-100"
      >
        <Icone className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[0.8125rem] leading-tight text-graf-500">{canal}</span>
        <span className="mt-0.5 block font-semibold leading-tight text-graf-950">{valor}</span>
      </span>
    </a>
  );
}

/**
 * Cabeçalho de página da assistência.
 *
 * Faixa clara com a malha da marca, título na escala de display e um
 * parágrafo de abertura. É o que dá a /assistencia-tecnica/solicitar, a
 * /orcamento e a /servicos a mesma entrada — sem que cada uma invente o
 * próprio espaçamento.
 */
export function CabecalhoAssistencia({
  trilha,
  sobretitulo,
  titulo,
  resumo,
  acoes,
}: {
  /** Já montada pela página — normalmente o componente `Trilha`. */
  trilha?: React.ReactNode;
  sobretitulo?: string;
  titulo: string;
  resumo?: React.ReactNode;
  acoes?: React.ReactNode;
}) {
  return (
    <header className="relative isolate overflow-hidden border-b border-graf-200 bg-surface-muted">
      <span
        aria-hidden
        className="field-orbit pointer-events-none absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(65%_70%_at_80%_0%,#000,transparent)]"
      />
      <div className="container-jb py-10 lg:py-16">
        {trilha ? <div className="mb-7">{trilha}</div> : null}
        <div className="max-w-3xl">
          {sobretitulo ? <p className="sobretitulo mb-3">{sobretitulo}</p> : null}
          <h1 className="text-display texto-forte">{titulo}</h1>
          {resumo ? <p className="texto-guia texto-suave mt-5 max-w-2xl">{resumo}</p> : null}
          {acoes ? <div className="mt-8 flex flex-wrap gap-3">{acoes}</div> : null}
        </div>
      </div>
    </header>
  );
}
