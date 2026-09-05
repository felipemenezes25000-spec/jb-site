import type { Metadata } from "next";
import type { ShippingKind } from "@prisma/client";
import Link from "next/link";

import { CaixaDeAjuda } from "@/components/institucional/canais";
import {
  CorpoLegal,
  IndiceLegal,
  NotaDeRevisao,
  type SecaoLegal,
} from "@/components/institucional/documento-legal";
import { MolduraInstitucional } from "@/components/institucional/moldura";
import { CorpoCms, carregarPaginaCms, temTexto } from "@/components/institucional/pagina-cms";
import { Cartao, Etiqueta } from "@/components/ui/data";
import { formatarCep, formatarPreco, plural } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";
import { enderecoCompleto, getSettings, ligado } from "@/lib/settings";

const SLUG = "entrega";
const CAMINHO = "/entrega";

const ROTULO_FRETE: Record<ShippingKind, string> = {
  retirada: "Retirada na JB",
  entrega_local: "Entrega local",
  transportadora: "Transportadora",
  sob_orcamento: "Frete sob orçamento",
  gratis: "Frete grátis",
  nao_aplicavel: "Sem frete",
};

const TOM_FRETE: Record<ShippingKind, "ok" | "andamento" | "aguardando" | "neutro"> = {
  retirada: "andamento",
  entrega_local: "andamento",
  transportadora: "andamento",
  sob_orcamento: "aguardando",
  gratis: "ok",
  nao_aplicavel: "neutro",
};

export async function generateMetadata(): Promise<Metadata> {
  const pagina = await carregarPaginaCms(SLUG);

  return metadataDePagina({
    titulo: pagina?.seoTitle || pagina?.title || "Entrega e retirada",
    descricao:
      pagina?.seoDescription ||
      pagina?.lead ||
      "Como o equipamento chega até a sua clínica: formas de envio, retirada no local, prazos e conferência no recebimento.",
    caminho: CAMINHO,
  });
}

export default async function EntregaPage() {
  const [pagina, s, perfis] = await Promise.all([
    carregarPaginaCms(SLUG),
    getSettings(),
    prisma.shippingProfile.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        kind: true,
        description: true,
        freeAboveCents: true,
        isDefault: true,
        zones: {
          orderBy: [{ order: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            zipStart: true,
            zipEnd: true,
            priceCents: true,
            etaDays: true,
          },
        },
      },
    }),
  ]);

  const endereco = enderecoCompleto(s);
  const aceitaRetirada = ligado(s.retirada_disponivel);
  const temCms = temTexto(pagina?.body);

  /* As seções abaixo são o conteúdo padrão da rota. Quando existe página de
     CMS com o slug "entrega", o texto dela entra no lugar destas seções — os
     blocos de dados vivos (perfis de frete e retirada) continuam, porque saem
     do próprio painel da JB. */
  const secoes: SecaoLegal[] = [
    {
      id: "como-funciona",
      titulo: "Como a entrega é combinada",
      conteudo: (
        <>
          <p>
            Equipamento odontológico não é encomenda comum: peso, dimensões, necessidade de
            içamento e o acesso da clínica mudam completamente o custo e o modo de
            transporte. Por isso o frete da maior parte dos itens é fechado depois do
            pedido, com o endereço em mãos.
          </p>
          <p>
            No fechamento do pedido você escolhe entre entrega e retirada quando as duas
            estiverem disponíveis para o item. Se o frete depender de análise, o pedido é
            registrado com a condição <strong>frete a combinar</strong> e a equipe entra em
            contato com o valor antes de qualquer cobrança adicional.
          </p>
        </>
      ),
    },
    {
      id: "prazos",
      titulo: "Prazos",
      conteudo: (
        <>
          <p>
            O prazo é informado na confirmação do pedido. Ele depende de três coisas: a
            disponibilidade da unidade em estoque, o porte do equipamento e o endereço de
            entrega. Faixas de CEP com prazo fechado aparecem na tabela de formas de envio
            acima quando estiverem cadastradas.
          </p>
          <p>
            O andamento fica registrado na{" "}
            <Link href="/minha-jb/pedidos">Área da Clínica</Link>, com a data de cada etapa — do
            pagamento confirmado até a entrega e, quando contratada, a instalação.
          </p>
        </>
      ),
    },
    {
      id: "recebimento",
      titulo: "Conferência no recebimento",
      conteudo: (
        <>
          <p>
            Confira a embalagem antes de assinar o comprovante. Havendo avaria visível,
            recuse a entrega ou anote a ressalva no próprio comprovante e avise a JB no
            mesmo dia, com fotos — é o que garante a troca sem discussão.
          </p>
          <p>
            Depois de aberto, confira também os acessórios e a documentação do equipamento.
            Qualquer divergência deve ser comunicada em até 7 dias corridos.
          </p>
        </>
      ),
    },
    {
      id: "instalacao",
      titulo: "Instalação e orientação de uso",
      conteudo: (
        <>
          <p>
            Instalação, orientação de uso e retirada do equipamento antigo são serviços
            contratados junto com o pedido, quando disponíveis para o item. Eles aparecem
            no carrinho como itens próprios e entram na mesma ordem de serviço.
          </p>
          <p>
            A entrega e a instalação podem acontecer em dias diferentes: a data da
            instalação é combinada com a clínica depois que o equipamento chega.
          </p>
        </>
      ),
    },
    {
      id: "area",
      titulo: "Região atendida",
      conteudo: (
        <p>
          A base da JB fica em {endereco || `${s.endereco_cidade}/${s.endereco_uf}`}. Entrega
          própria e visita técnica são combinadas conforme a região; para endereços fora da
          área de atendimento direto, o envio é feito por transportadora. Em caso de dúvida
          sobre a sua região, <Link href="/contato">fale com a equipe</Link> antes de
          fechar o pedido.
        </p>
      ),
    },
  ];

  return (
    <>
      <JsonLd
        dados={trilhaJsonLd([
          { rotulo: "Início", href: "/" },
          { rotulo: "Entrega e retirada", href: CAMINHO },
        ])}
      />

      <MolduraInstitucional
        trilha={[{ rotulo: "Início", href: "/" }, { rotulo: "Entrega e retirada" }]}
        sobretitulo="Políticas"
        titulo={pagina?.title || "Entrega e retirada"}
        resumo={pagina?.lead || "Como o equipamento sai da JB e chega até a sua clínica."}
        atualizadoEm={pagina?.updatedAt ?? null}
        lateral={
          <div className="space-y-5">
            {temCms ? null : <IndiceLegal secoes={secoes} />}
            <CaixaDeAjuda s={s} titulo="Dúvida sobre o frete?" />
          </div>
        }
      >
        <div className="space-y-12">
          {perfis.length > 0 ? (
            <section id="formas-de-envio" className="scroll-mt-28">
              <h2 className="text-title texto-forte">Formas de envio</h2>
              <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-graf-600">
                Cada produto usa uma destas condições, indicada na própria página do item.
              </p>

              <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                {perfis.map((perfil) => (
                  <li key={perfil.id}>
                    <Cartao className="flex h-full flex-col p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <h3 className="text-base font-bold text-graf-950">{perfil.name}</h3>
                        <Etiqueta tom={TOM_FRETE[perfil.kind]}>
                          {ROTULO_FRETE[perfil.kind]}
                        </Etiqueta>
                      </div>

                      {perfil.description ? (
                        <p className="mt-2 text-sm leading-relaxed text-graf-600">
                          {perfil.description}
                        </p>
                      ) : null}

                      {perfil.freeAboveCents && perfil.freeAboveCents > 0 ? (
                        <p className="mt-3 text-sm font-semibold text-ok-700">
                          Frete grátis acima de {formatarPreco(perfil.freeAboveCents)}.
                        </p>
                      ) : null}

                      {perfil.zones.length > 0 ? (
                        <dl className="mt-4 space-y-2 border-t border-graf-200 pt-4">
                          {perfil.zones.map((zona) => (
                            <div key={zona.id} className="text-sm">
                              <dt className="font-semibold text-graf-800">{zona.name}</dt>
                              <dd className="tabular text-graf-600">
                                CEP {formatarCep(zona.zipStart)} a {formatarCep(zona.zipEnd)}
                                {" · "}
                                {zona.priceCents > 0
                                  ? formatarPreco(zona.priceCents)
                                  : "sem custo de frete"}
                                {zona.etaDays
                                  ? ` · até ${plural(zona.etaDays, "dia útil", "dias úteis")}`
                                  : ""}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}
                    </Cartao>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {aceitaRetirada ? (
            <section id="retirada" className="scroll-mt-28">
              <h2 className="text-title texto-forte">Retirada no local</h2>
              <div className="prose-jb mt-3 max-w-none">
                {s.retirada_instrucoes ? <p>{s.retirada_instrucoes}</p> : null}
                {endereco ? (
                  <p>
                    Endereço para retirada: {endereco}.{" "}
                    <Link href="/contato#mapa">Ver no mapa</Link>.
                  </p>
                ) : null}
                {s.horario ? <p>Horário: {s.horario}.</p> : null}
              </div>
            </section>
          ) : null}

          {temCms ? <CorpoCms html={pagina?.body ?? ""} className="max-w-3xl" /> : <CorpoLegal secoes={secoes} />}

          <NotaDeRevisao>
            As condições desta página valem para as compras feitas neste site e não
            substituem o que estiver escrito na confirmação do seu pedido. Para trocas,
            devoluções e prazo de arrependimento, veja a página de{" "}
            <Link
              href="/trocas-e-devolucoes"
              className="font-semibold text-graf-700 underline underline-offset-4 hover:text-jb-700"
            >
              trocas e devoluções
            </Link>
            .
          </NotaDeRevisao>
        </div>
      </MolduraInstitucional>
    </>
  );
}
