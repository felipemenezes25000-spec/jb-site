"use client";

import { useActionState, useState } from "react";

import { salvarSeo, type EstadoAcao } from "@/app/acoes/admin-catalogo";
import {
  BarraSalvar,
  Bloco,
  Grade,
  RegiaoEstado,
  Secao,
} from "@/components/admin/catalogo/moldura-form";
import { Botao } from "@/components/ui/button";
import { Area, Campo, Selecao } from "@/components/ui/form";
import { cn } from "@/lib/utils";

/* ============================================================================
   Aba Ficha e SEO

   Título e descrição de busca são opcionais de propósito: em branco, a página
   usa o nome e o resumo do produto, que já são bons. A prévia mostra
   exatamente o texto que iria para o buscador e para o compartilhamento — com
   o mesmo corte que eles aplicam.

   Os campos regulatórios ficam aqui e continuam opcionais. Registro da Anvisa
   e detentor são dados que a JB precisa conferir na documentação do
   fabricante; a tela nunca preenche nada por conta própria.
   ============================================================================ */

export type ProdutoSeo = {
  id: string;
  name: string;
  shortDescription: string;
  slug: string;
  seoTitle: string | null;
  seoDescription: string | null;
  gtin: string | null;
  mpn: string | null;
  anvisaCode: string | null;
  manufacturer: string | null;
  regulatoryHolder: string | null;
  regulatoryNote: string | null;
  warrantyMonths: number | null;
  voltage: string | null;
  installationPolicy:
    | "nao_informada"
    | "nao_oferecida"
    | "opcional"
    | "inclusa"
    | "sob_consulta";
  installationNote: string;
  infrastructureNotes: string[];
  boxContents: string[];
};

const LIMITE_TITULO = 60;
const LIMITE_DESCRICAO = 155;

export function FormularioProdutoSeo({
  produto,
  somenteLeitura,
}: {
  produto: ProdutoSeo;
  somenteLeitura?: boolean;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoAcao, FormData>(salvarSeo, {});
  const [titulo, setTitulo] = useState(produto.seoTitle ?? "");
  const [descricao, setDescricao] = useState(produto.seoDescription ?? "");

  const tituloFinal = titulo.trim() || produto.name;
  const descricaoFinal = descricao.trim() || produto.shortDescription;

  return (
    <Bloco titulo="Ficha e SEO" descricao="Como o produto aparece no Google e ao ser compartilhado.">
      <form action={enviar} className="space-y-8">
        <input type="hidden" name="id" value={produto.id} />
        <RegiaoEstado estado={estado} />

        <fieldset disabled={somenteLeitura} className="space-y-8">
          <Secao titulo="Busca e compartilhamento">
            <Campo
              rotulo="Título para busca"
              name="seoTitle"
              value={titulo}
              onChange={(evento) => setTitulo(evento.target.value)}
              maxLength={70}
              ajuda={`Em branco, usa o nome do produto. Ideal até ${LIMITE_TITULO} caracteres.`}
              erro={estado.campo === "seoTitle" ? estado.erro : undefined}
            />
            <Area
              rotulo="Descrição para busca"
              name="seoDescription"
              value={descricao}
              onChange={(evento) => setDescricao(evento.target.value)}
              rows={3}
              maxLength={180}
              ajuda={`Em branco, usa o resumo. Ideal até ${LIMITE_DESCRICAO} caracteres.`}
              erro={estado.campo === "seoDescription" ? estado.erro : undefined}
            />

            <div className="rounded-lg border border-graf-200 bg-graf-50/60 p-4">
              <p className="mb-3 text-apoio font-bold uppercase tracking-[0.08em] text-graf-500">
                Prévia do resultado de busca
              </p>
              <p className="text-xs text-ok-700">jbsolucoes.com.br › loja › {produto.slug}</p>
              <p
                className={cn(
                  "mt-0.5 text-lg leading-snug text-info-700",
                  tituloFinal.length > LIMITE_TITULO && "line-2",
                )}
              >
                {tituloFinal}
              </p>
              <p className="line-2 mt-1 text-sm leading-relaxed text-graf-600">
                {descricaoFinal || "Sem resumo: escreva um na aba Básico ou preencha a descrição aqui."}
              </p>
              <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-apoio text-graf-500">
                <span className={tituloFinal.length > LIMITE_TITULO ? "font-semibold text-warn-700" : undefined}>
                  Título: {tituloFinal.length}/{LIMITE_TITULO}
                  {tituloFinal.length > LIMITE_TITULO ? " — o Google deve cortar" : ""}
                </span>
                <span
                  className={descricaoFinal.length > LIMITE_DESCRICAO ? "font-semibold text-warn-700" : undefined}
                >
                  Descrição: {descricaoFinal.length}/{LIMITE_DESCRICAO}
                  {descricaoFinal.length > LIMITE_DESCRICAO ? " — o Google deve cortar" : ""}
                </span>
              </p>
            </div>
          </Secao>

          <Secao
            titulo="Ficha do equipamento"
            descricao="Preencha só o que estiver na documentação do fabricante."
          >
            <Grade>
              <Campo
                rotulo="Garantia (meses)"
                name="warrantyMonths"
                type="number"
                inputMode="numeric"
                min={0}
                max={600}
                defaultValue={produto.warrantyMonths ?? ""}
                ajuda="Deixe em branco se não houver garantia declarada."
              />
              <Selecao rotulo="Voltagem" name="voltage" defaultValue={produto.voltage ?? ""}>
                <option value="">Não informada</option>
                <option value="110">110 V</option>
                <option value="220">220 V</option>
                <option value="bivolt">Bivolt</option>
              </Selecao>

              {/* ------------------------------------------ instalação ---

                  A política da instalação é escolha, não texto livre: "inclusa"
                  e "sob consulta" são promessas comerciais diferentes, e a
                  página precisa saber qual das duas afirmar. O padrão é "não
                  informada", e nesse caso a seção some do site em vez de
                  afirmar por omissão. */}
              <Selecao
                rotulo="Instalação"
                name="installationPolicy"
                defaultValue={produto.installationPolicy}
                ajuda="Sem escolher, a seção de instalação não aparece na página do produto."
              >
                <option value="nao_informada">Não informada</option>
                <option value="nao_oferecida">A JB não instala este equipamento</option>
                <option value="opcional">Opcional, contratada à parte</option>
                <option value="inclusa">Inclusa no preço</option>
                <option value="sob_consulta">Sob consulta</option>
              </Selecao>

              <Area
                rotulo="Condições da instalação"
                name="installationNote"
                rows={3}
                maxLength={400}
                defaultValue={produto.installationNote}
                ajuda="Elegibilidade, cobertura, o que está incluído e o que não está. Vazio some da página."
              />

              <Area
                rotulo="O que precisa estar pronto no local"
                name="infrastructureNotes"
                rows={4}
                defaultValue={produto.infrastructureNotes.join("\n")}
                ajuda="Um requisito por linha: ponto elétrico, ponto hidráulico, dreno, espaço, pé-direito."
                placeholder={"Tomada 220 V com aterramento a até 1,5 m\nPonto de água e dreno na parede\nBancada com 60 cm livres"}
              />

              <Area
                rotulo="O que vem na caixa"
                name="boxContents"
                rows={4}
                defaultValue={produto.boxContents.join("\n")}
                ajuda="Um item por linha. O que não estiver aqui a página declara como vendido à parte."
                placeholder={"Equipamento\nCabo de força\nManual do fabricante"}
              />
              {/* --------------------------------------- identificadores ---

                  GTIN e MPN existem para o feed do Google casar o produto da
                  JB com o produto certo. Preencher com o SKU interno "para
                  não deixar vazio" é o erro caro: o anúncio é aceito e um dia
                  o código casa com o item de outra empresa. A ação confere o
                  dígito verificador e recusa o SKU. */}
              <Campo
                rotulo="GTIN (código de barras)"
                name="gtin"
                defaultValue={produto.gtin ?? ""}
                maxLength={14}
                inputMode="numeric"
                ajuda="8, 12, 13 ou 14 dígitos, como está na embalagem. Em branco se não souber."
              />
              <Campo
                rotulo="MPN (código do fabricante)"
                name="mpn"
                defaultValue={produto.mpn ?? ""}
                maxLength={70}
                ajuda="O código que o fabricante dá à peça — nunca o SKU da JB."
              />

              <Campo
                rotulo="Fabricante"
                name="manufacturer"
                defaultValue={produto.manufacturer ?? ""}
                maxLength={120}
              />
              <Campo
                rotulo="Registro na Anvisa"
                name="anvisaCode"
                defaultValue={produto.anvisaCode ?? ""}
                maxLength={60}
                ajuda="Número exatamente como consta no registro."
              />
              <Campo
                rotulo="Detentor do registro"
                name="regulatoryHolder"
                defaultValue={produto.regulatoryHolder ?? ""}
                maxLength={160}
                className="sm:col-span-2"
              />
            </Grade>
            <Area
              rotulo="Observação regulatória"
              name="regulatoryNote"
              defaultValue={produto.regulatoryNote ?? ""}
              rows={3}
              maxLength={400}
              ajuda="Aparece em letra miúda na página do produto."
            />
          </Secao>
        </fieldset>

        {!somenteLeitura ? (
          <BarraSalvar ajuda="Salva apenas esta aba.">
            <Botao type="submit" carregando={enviando}>
              Salvar ficha e SEO
            </Botao>
          </BarraSalvar>
        ) : null}
      </form>
    </Bloco>
  );
}
