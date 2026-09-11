import Link from "next/link";
import { Lock, MessageCircle, Phone } from "lucide-react";

import { Logo } from "@/components/ui/logo";
import { configuracoesPublicas } from "@/lib/loja-publica";
import { telHref, whatsappHref } from "@/lib/format";

/* ============================================================================
   Casca do pagamento

   `/checkout` e `/escolher-entrega` moravam dentro de `(vitrine)` e herdavam a
   loja inteira em volta. Medido a 1440px, com o carrinho cheio: **40 links de
   saída** entre cabeçalho e rodapé — busca, conta, carrinho, "Solicitar
   assistência", os quatro mega menus e as 39 entradas do rodapé — contra 4
   links e 2 botões do próprio checkout. O rodapé sozinho ocupava 695px de uma
   página de 2.230: quase um terço da tela dedicado a ir embora, no exato
   momento em que a pessoa está digitando um cartão.

   Aqui só ficam três coisas: a marca (que volta para a loja, e é a única
   saída que faz sentido), o sinal de compra segura e o caminho para falar com
   a JB se algo travar. O rodapé guarda o que é obrigação — termos,
   privacidade, trocas — e nada além disso.

   Grupo de rota, então nenhuma URL muda: `/checkout` continua `/checkout`.
   ============================================================================ */

export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const s = await configuracoesPublicas();

  return (
    /* `data-jb-publico` além do próprio marcador: o checkout saiu de
       dentro de (vitrine) para ganhar casca própria, e com isso perdia a
       regra de `globals.css` que faz o texto secundário da loja pública
       ser preto em vez de cinza. A casca mudou; a loja é a mesma. */
    <div
      data-jb-checkout="true"
      data-jb-publico="true"
      className="flex min-h-dvh flex-col bg-surface-muted"
    >
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded-xl focus:bg-jb-700 focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
      >
        Pular para o conteúdo
      </a>

      <header className="border-b border-graf-200 bg-white">
        <div className="container-jb flex min-h-16 max-w-[80rem] items-center justify-between gap-4 py-3">
          <Link
            href="/loja"
            className="foco-jb flex shrink-0 items-center gap-3 rounded-lg"
            aria-label="JB Soluções Odontológicas — voltar para a loja"
          >
            {/* O componente `Logo`, e não `/images/logo.png` — aquele é o
                arquivo do site antigo, e renderiza um aglomerado de pontos
                vermelhos com um "J.B." apagado. */}
            <Logo altura={34} prioridade />
          </Link>

          <p className="texto-apoio flex items-center gap-2 font-bold text-graf-700">
            <Lock className="size-4 shrink-0 text-ok-700" aria-hidden />
            <span className="hidden sm:inline">Compra segura</span>
            <span className="sm:hidden">Seguro</span>
          </p>
        </div>
      </header>

      <main id="conteudo" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-graf-200 bg-white">
        <div className="container-jb max-w-[80rem] py-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-graf-950">
                Precisa de ajuda para concluir?
              </p>
              <p className="texto-apoio mt-1 text-graf-600">
                {s.horario || "Equipe JB no horário comercial."}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                {s.whatsapp ? (
                  <a
                    href={whatsappHref(s.whatsapp, "Olá! Estou finalizando uma compra no site da JB.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="foco-jb inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-bold text-graf-800 hover:text-jb-700"
                  >
                    <MessageCircle className="size-4 text-jb-600" aria-hidden />
                    WhatsApp {s.whatsapp}
                  </a>
                ) : null}
                {s.telefone ? (
                  <a
                    href={telHref(s.telefone)}
                    className="foco-jb inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-bold text-graf-800 hover:text-jb-700"
                  >
                    <Phone className="size-4 text-jb-600" aria-hidden />
                    {s.telefone}
                  </a>
                ) : null}
              </div>
            </div>

            {/* Só o que é obrigação legal. Nenhuma vitrine, nenhuma categoria. */}
            <nav aria-label="Documentos da compra" className="flex flex-wrap gap-x-5 gap-y-1">
              <Link
                href="/termos"
                className="foco-jb texto-apoio inline-flex min-h-10 items-center font-semibold text-graf-600 hover:text-graf-950"
              >
                Termos de uso
              </Link>
              <Link
                href="/privacidade"
                className="foco-jb texto-apoio inline-flex min-h-10 items-center font-semibold text-graf-600 hover:text-graf-950"
              >
                Privacidade
              </Link>
              <Link
                href="/trocas-e-devolucoes"
                className="foco-jb texto-apoio inline-flex min-h-10 items-center font-semibold text-graf-600 hover:text-graf-950"
              >
                Trocas e devoluções
              </Link>
            </nav>
          </div>

          <p className="texto-apoio mt-6 border-t border-graf-150 pt-4 text-graf-500">
            {s.empresa_nome}
            {s.empresa_desde ? ` · no mercado odontológico desde ${s.empresa_desde}` : ""}
          </p>
        </div>
      </footer>
    </div>
  );
}
