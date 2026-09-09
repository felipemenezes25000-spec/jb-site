"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";

import { cartoesVistos, type VistosRecentes } from "@/app/acoes/vistos";
import { CardProduto } from "@/components/loja/card-produto";
import { Secao } from "@/components/ui/secao";
import { TituloSecao } from "@/components/ui/data";

/* ============================================================================
   Vistos recentemente

   Comprar equipamento não é decisão de uma sessão: a pessoa abre três
   autoclaves, fecha o navegador, conversa com a sócia e volta no dia seguinte.
   Sem esta tira, voltar significa procurar tudo de novo.

   O navegador guarda só os `slug` — a ordem da visita e nada mais. Preço,
   estoque e condição vêm do servidor a cada renderização, por
   `cartoesVistos`: preço guardado no `localStorage` envelhece, e valor
   exibido vincula quem anuncia.
   ============================================================================ */

const CHAVE = "jb:vistos";
const TETO = 12;

function ler(): string[] {
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (!bruto) return [];
    const dados: unknown = JSON.parse(bruto);
    if (!Array.isArray(dados)) return [];
    return dados.filter((item): item is string => typeof item === "string").slice(0, TETO);
  } catch {
    return [];
  }
}

/**
 * Marca a visita e mantém a faixa de continuidade da PDP no mesmo ponto do
 * documento. O registro continua local; a tira só aparece quando existe
 * histórico suficiente para realmente ajudar.
 */
export function RegistrarVisita({ slug }: { slug: string }) {
  useEffect(() => {
    if (!slug) return;
    try {
      const atuais = ler().filter((item) => item !== slug);
      window.localStorage.setItem(CHAVE, JSON.stringify([slug, ...atuais].slice(0, TETO)));
    } catch {
      /* navegação privada: a visita simplesmente não é lembrada */
    }
  }, [slug]);

  return <VistosRecentemente excluir={slug} />;
}

export function VistosRecentemente({
  excluir,
  titulo = "Você viu recentemente",
  larguraInterna,
}: {
  /** O que não deve aparecer nesta lista. */
  excluir?: string | string[];
  titulo?: string;
  /** Teto do container desta faixa. */
  larguraInterna?: string;
}) {
  const [dados, setDados] = useState<VistosRecentes | null>(null);

  /* Serializado para o efeito não redisparar a cada renderização por causa de
     um array novo com o mesmo conteúdo. */
  const foraDaLista = Array.isArray(excluir) ? excluir.join(",") : (excluir ?? "");

  useEffect(() => {
    const fora = new Set(foraDaLista.split(",").filter(Boolean));
    const slugs = ler().filter((slug) => !fora.has(slug));
    if (slugs.length === 0) return;

    let vivo = true;
    void cartoesVistos(slugs).then((resposta) => {
      if (vivo) setDados(resposta);
    });
    return () => {
      vivo = false;
    };
  }, [foraDaLista]);

  // Com menos de dois, a tira é só ruído e não ajuda a comparar nada.
  if (!dados || dados.produtos.length < 2) return null;

  return (
    <Secao espaco="md" separador classNameInterno={larguraInterna}>
      <TituloSecao
        como="h2"
        titulo={titulo}
        descricao="A lista fica só neste navegador. Preço e disponibilidade são os de agora."
      />

      <div className="mt-6">
        <ul className="scrollbar-none -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0">
          {dados.produtos.map((produto) => (
            <li
              key={produto.slug}
              className="w-[16.5rem] shrink-0 snap-start sm:w-[18rem]"
            >
              <CardProduto
                produto={produto}
                parcelamento={dados.parcelamento}
                className="h-full"
              />
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-3 flex items-center gap-2 text-[0.8125rem] text-graf-500">
        <History className="size-4 shrink-0 text-graf-500" aria-hidden />
        Guardado no seu navegador. Limpar os dados do site apaga esta lista.
      </p>
    </Secao>
  );
}
