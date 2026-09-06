import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Logo } from "@/components/ui/logo";
import {
  RODAPE_ASSISTENCIA,
  RODAPE_CLIENTE,
  RODAPE_INSTITUCIONAL,
  RODAPE_LOJA,
  RODAPE_POLITICAS,
  type ItemMenu,
} from "@/lib/navegacao";
import { formatarTelefone, telHref, whatsappHref } from "@/lib/format";
import { enderecoCompleto, getSettings, redesSociais } from "@/lib/settings";

/* ==========================================================================
   Rodapé da loja

   O rodapé antigo ocupava mais de duas telas no celular: cada contato era um
   cartão de 44px com ícone em chapa vermelha, o resumo da empresa vinha em
   três linhas, as redes sociais eram botões e a barra de políticas empilhava
   quatro linhas. Aqui a densidade foi refeita sem perder um único link — os
   mesmos endereços continuam saindo de `@/lib/navegacao`, que também alimenta
   o sitemap.

   A hierarquia agora é explícita: o telefone é a peça de maior peso do bloco
   da marca (é o que uma clínica com equipamento parado procura), os demais
   canais vêm em corpo de texto e endereço/horário fecham em letra menor. O
   mapa do site perde o rótulo em caixa alta e ganha um título de coluna em
   13px, que é o mínimo confortável de leitura.

   Campo vazio não vira travessão: some. Uma clínica que não vê o WhatsApp é
   melhor do que uma clínica que vê um WhatsApp que não existe.
   ========================================================================== */

/* No mouse a linha fecha em 36px, o que encurta muito a coluna; no toque ela
   volta para os 44px do alvo mínimo. */
const CLASSE_LINK =
  "foco-jb flex min-h-9 items-center rounded-xs text-sm text-graf-600 transition-colors hover:text-jb-700 pointer-coarse:min-h-11";

function Coluna({ titulo, itens }: { titulo: string; itens: ItemMenu[] }) {
  return (
    <div>
      <h2 className="text-[0.8125rem] font-bold text-graf-950">{titulo}</h2>
      <ul className="mt-2">
        {itens.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className={CLASSE_LINK}>
              {item.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function Rodape() {
  const s = await getSettings();
  const sociais = redesSociais(s);
  const ano = new Date().getFullYear();
  const endereco = enderecoCompleto(s);
  const whatsapp = whatsappHref(s.whatsapp, "Olá! Vim pelo site da JB.");

  return (
    <footer className="mt-auto border-t border-graf-200 bg-graf-50">
      <div className="container-jb py-10 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-16">
          {/* ------------------------------------------- marca e contato */}
          <div>
            <Logo altura={40} />

            {s.empresa_resumo ? (
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-graf-600">
                {s.empresa_resumo}
              </p>
            ) : null}

            {/* O título saiu da tela para o rodapé encolher, mas continua
                existindo para quem navega por cabeçalhos. */}
            <h2 className="sr-only">Fale com a JB</h2>
            <div className="mt-6">
              {s.telefone ? (
                <a
                  href={telHref(s.telefone)}
                  className="tabular foco-jb inline-flex min-h-11 items-center rounded-xs text-lg font-bold text-graf-950 transition-colors hover:text-jb-700"
                >
                  {formatarTelefone(s.telefone)}
                </a>
              ) : null}

              {/* Segundo telefone e WhatsApp dividem uma linha só: dois
                  contatos alternativos não precisam de dois blocos. */}
              {s.telefone_alternativo || whatsapp ? (
                <div className="flex flex-wrap items-center gap-x-5">
                  {s.telefone_alternativo ? (
                    <a
                      href={telHref(s.telefone_alternativo)}
                      className="tabular foco-jb inline-flex min-h-9 items-center rounded-xs text-sm text-graf-600 transition-colors hover:text-jb-700 pointer-coarse:min-h-11"
                    >
                      {formatarTelefone(s.telefone_alternativo)}
                    </a>
                  ) : null}

                  {whatsapp ? (
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="foco-jb inline-flex min-h-9 items-center rounded-xs text-sm font-semibold text-graf-700 transition-colors hover:text-jb-700 pointer-coarse:min-h-11"
                    >
                      WhatsApp
                    </a>
                  ) : null}
                </div>
              ) : null}

              {s.email ? (
                <a
                  href={`mailto:${s.email}`}
                  className="foco-jb flex min-h-9 items-center rounded-xs text-sm text-graf-600 transition-colors hover:text-jb-700 pointer-coarse:min-h-11"
                >
                  <span className="[overflow-wrap:anywhere]">{s.email}</span>
                </a>
              ) : null}
            </div>

            {endereco || s.horario ? (
              <div className="mt-4 space-y-1 text-[0.8125rem] leading-relaxed text-graf-500">
                {endereco ? (
                  <address className="not-italic">
                    {endereco}
                    {s.endereco_cep ? <> — CEP {s.endereco_cep}</> : null}
                  </address>
                ) : null}
                {s.horario ? <p>{s.horario}</p> : null}
              </div>
            ) : null}

            {sociais.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-x-5">
                {sociais.map((rede) => (
                  <li key={rede.chave}>
                    <a
                      href={rede.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="foco-jb inline-flex min-h-9 items-center gap-1 rounded-xs text-[0.8125rem] font-semibold text-graf-700 transition-colors hover:text-jb-700 pointer-coarse:min-h-11"
                    >
                      {rede.rotulo}
                      <ArrowUpRight className="size-3.5 text-graf-400" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* ------------------------------------------------ mapa do site */}
          <nav aria-label="Rodapé" className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
            <Coluna titulo="Loja" itens={RODAPE_LOJA} />
            <Coluna titulo="Assistência" itens={RODAPE_ASSISTENCIA} />
            <Coluna titulo="Área da Clínica" itens={RODAPE_CLIENTE} />
            <Coluna titulo="Institucional" itens={RODAPE_INSTITUCIONAL} />
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-x-8 gap-y-2 border-t border-graf-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.8125rem] text-graf-500">
            © {ano} {s.empresa_nome}
            {s.empresa_desde ? <> · Em atividade desde {s.empresa_desde}</> : null}
          </p>
          <ul className="flex flex-wrap gap-x-5">
            {RODAPE_POLITICAS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="foco-jb inline-flex min-h-9 items-center rounded-xs text-[0.8125rem] text-graf-500 transition-colors hover:text-jb-700 pointer-coarse:min-h-11"
                >
                  {item.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
