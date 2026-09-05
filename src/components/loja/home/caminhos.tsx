import Link from "next/link";
import { ArrowRight, Check, LayoutDashboard, ShoppingBag, Wrench } from "lucide-react";

import { TituloSecao } from "@/components/ui/data";
import { Grade } from "@/components/ui/grade";
import { Secao } from "@/components/ui/secao";
import { cn } from "@/lib/utils";

/* ============================================================================
   Três caminhos

   Quem chega na JB quer uma de três coisas: comprar, consertar ou acompanhar
   o que já tem. A faixa resolve a intenção num olhar, e cada cartão inteiro é
   o link — alvo grande no celular, um único ponto de tabulação.

   Os itens listados descrevem o que a plataforma realmente faz. Nada de
   promessa de prazo, frete ou garantia, que dependem do dado de cada caso.
   ============================================================================ */

type Caminho = {
  titulo: string;
  descricao: string;
  itens: string[];
  chamada: string;
  href: string;
  icone: React.ComponentType<{ className?: string }>;
  /** O caminho da assistência é o que diferencia a JB — leva o vermelho. */
  marcado?: boolean;
};

const CAMINHOS: Caminho[] = [
  {
    titulo: "Comprar equipamentos",
    descricao:
      "O catálogo completo, com foto, ficha técnica e o preço de cada equipamento.",
    itens: [
      "Condição, marca e modelo declarados em cada anúncio",
      "Parcelamento calculado no próprio anúncio",
      "Pedido acompanhado etapa por etapa",
    ],
    chamada: "Ver o catálogo",
    href: "/loja",
    icone: ShoppingBag,
  },
  {
    titulo: "Preciso de assistência",
    descricao:
      "Descreva o defeito e a equipe técnica assume o atendimento do começo ao fim.",
    itens: [
      "Triagem feita por técnico da JB",
      "Orçamento enviado para aprovação antes do serviço",
      "Ordem de serviço com o que foi executado",
    ],
    chamada: "Abrir um chamado",
    href: "/assistencia-tecnica/solicitar",
    icone: Wrench,
    marcado: true,
  },
  {
    titulo: "Área da clínica",
    descricao:
      "A Área da Clínica reúne o pós-venda: o que você comprou, o que está em atendimento e o que vem pela frente.",
    itens: [
      "Equipamentos, pedidos e documentos no mesmo lugar",
      "Chamados e ordens de serviço com histórico",
      "Orçamentos aprovados ou recusados pelo site",
    ],
    chamada: "Entrar na Área da Clínica",
    href: "/minha-jb",
    icone: LayoutDashboard,
  },
];

export function TresCaminhos() {
  return (
    <Secao fundo="clara" espaco="lg">
      <TituloSecao
        sobretitulo="Por onde começar"
        titulo="Três caminhos, uma empresa só"
        descricao="Comprar, consertar e acompanhar não são áreas separadas na JB — são etapas do mesmo ciclo."
        className="mb-10"
      />

      <Grade colunas={{ base: 1, md: 3 }} espaco="md" como="ul">
        {CAMINHOS.map((caminho) => (
          <li key={caminho.href} className="flex">
            <CartaoCaminho caminho={caminho} />
          </li>
        ))}
      </Grade>
    </Secao>
  );
}

function CartaoCaminho({ caminho }: { caminho: Caminho }) {
  const Icone = caminho.icone;

  return (
    <Link
      href={caminho.href}
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-2xl border bg-white p-6 pt-7 shadow-card sm:p-7 sm:pt-8",
        "transition-[border-color,box-shadow,transform] duration-200",
        "hover:-translate-y-0.5 hover:shadow-raised",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
        caminho.marcado
          ? "border-jb-200 hover:border-jb-300"
          : "border-graf-200 hover:border-graf-300",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-1",
          caminho.marcado ? "bg-jb-500" : "bg-graf-300",
        )}
      />

      <span
        aria-hidden
        className={cn(
          "flex size-12 items-center justify-center rounded-xl",
          caminho.marcado ? "bg-jb-50 text-jb-600" : "bg-graf-100 text-graf-700",
        )}
      >
        <Icone className="size-6" />
      </span>

      <h3 className="mt-6 text-title text-graf-950">{caminho.titulo}</h3>
      <p className="mt-3 text-base leading-relaxed text-graf-600">{caminho.descricao}</p>

      <ul className="mt-6 space-y-2.5 border-t border-graf-100 pt-6">
        {caminho.itens.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-graf-600">
            <Check
              className={cn(
                "mt-0.5 size-4 shrink-0",
                caminho.marcado ? "text-jb-500" : "text-graf-400",
              )}
              aria-hidden
            />
            {item}
          </li>
        ))}
      </ul>

      <span className="mt-auto inline-flex items-center gap-1.5 pt-8 text-sm font-bold text-jb-700 transition-transform duration-200 group-hover:translate-x-0.5">
        {caminho.chamada}
        <ArrowRight className="size-4 shrink-0" aria-hidden />
      </span>
    </Link>
  );
}
