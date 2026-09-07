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

   A tira não aparece para quem não tem histórico, e não conta a própria
   página: estar vendo uma autoclave e ver "visto recentemente: esta
   autoclave" é ruído.
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
 * Marca a visita a um equipamento. Não renderiza nada — é só o registro.
 *
 * O slug entra na frente da lista e sai de qualquer posição anterior, para a
 * ordem ser sempre "o mais recente primeiro" mesmo quando a pessoa volta a um
 * equipamento que já tinha visto.
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

  return null;
}

export function VistosRecentemente({
  excluir,
  titulo = "Você viu recentemente",
}: {
  /** Slug da página atual, que não deve aparecer na própria lista. */
  excluir?: string;
  titulo?: string;
}) {
  const [dados, setDados] = useState<VistosRecentes | null>(null);

  useEffect(() => {
    const slugs = ler().filter((slug) => slug !== excluir);
    if (slugs.length === 0) return;

    let vivo = true;
    void cartoesVistos(slugs).then((resposta) => {
      if (vivo) setDados(resposta);
    });
    return () => {
      vivo = false;
    };
  }, [excluir]);

  // Com menos de dois, a tira é só o equipamento que a pessoa está vendo de
  // novo — não ajuda a comparar nada.
  if (!dados || dados.produtos.length < 2) return null;

  return (
    <Secao espaco="md" separador>
      <TituloSecao
        como="h2"
        titulo={titulo}
        descricao="A lista fica só neste navegador. Preço e disponibilidade são os de agora."
      />

      <div className="mt-8">
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
