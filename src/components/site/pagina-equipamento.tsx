import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BadgeCheck, FileCheck2, Phone, ShieldAlert } from "lucide-react";

import { BotaoWhatsapp, LinkWhatsapp } from "@/components/site/botao-whatsapp";
import { ChamadaFinal } from "@/components/site/chamada-final";
import { ClinicaOuBancada } from "@/components/site/clinica-ou-bancada";
import { ComoFunciona } from "@/components/site/como-funciona";
import { Duvidas } from "@/components/site/duvidas";
import { FaixaAutorizada } from "@/components/site/faixa-autorizada";
import { ICONE_DO_EQUIPAMENTO, IMAGEM_DO_EQUIPAMENTO } from "@/components/site/icones-equipamento";
import { MarcaWhatsapp } from "@/components/site/marca-whatsapp";
import { PorQueJb } from "@/components/site/por-que-jb";
import { StatusAtendimento } from "@/components/site/status-atendimento";
import { classesBotao } from "@/components/ui/button";
import { montarMensagem, type Equipamento } from "@/lib/diagnostico";
import { telHref } from "@/lib/format";
import {
  PAGINAS_DE_EQUIPAMENTO,
  descricaoDaPagina,
  equipamentoDaPagina,
  paginaPorSlug,
  tituloDaPagina,
  type PaginaDeEquipamento,
} from "@/lib/paginas-equipamento";
import { JsonLd, metadataDePagina, servicoJsonLd, trilhaJsonLd } from "@/lib/seo";
import { anosDesde, configuracoesPublicas } from "@/lib/site-publico";
import { cn } from "@/lib/utils";

/* ============================================================================
   Página de um equipamento

   A página de pouso do anúncio: quem clicou em "conserto de autoclave" cai
   aqui e vê a autoclave antes de qualquer texto (no celular a foto vem
   primeiro), o título com o nome dela, e os defeitos como botões. Cada
   defeito abre o WhatsApp com equipamento e problema já escritos: um toque
   entre o anúncio e a conversa.

   O resto reaproveita a home, com a mensagem do equipamento em todo botão:
   como funciona, clínica ou bancada, por que a JB, dúvidas (as do equipamento
   primeiro) e a chamada final. A faixa EVOXX só entra em equipamento da
   linha EVOXX.

   Cada página mora na sua pasta (`app/(site)/autoclave`, …), e não num
   `[equipamento]` na raiz: com Cache Components não existe `dynamicParams`,
   e um segmento dinâmico na raiz passaria a responder por qualquer endereço
   de um nível só.
   ============================================================================ */

function paginaOu404(slug: string): PaginaDeEquipamento {
  const pagina = paginaPorSlug(slug);
  if (!pagina) notFound();
  return pagina;
}

export async function metadataDoEquipamento(slug: string): Promise<Metadata> {
  const pagina = paginaOu404(slug);
  const s = await configuracoesPublicas();
  return metadataDePagina({
    titulo: tituloDaPagina(pagina, s.endereco_cidade),
    descricao: descricaoDaPagina(pagina, s.endereco_cidade),
    caminho: `/${pagina.slug}`,
    imagemDoArquivo: true,
  });
}

export async function PaginaEquipamento({ slug }: { slug: string }) {
  const pagina = paginaOu404(slug);
  const equipamento = equipamentoDaPagina(pagina);
  const s = await configuracoesPublicas();
  const anos = await anosDesde(s.empresa_desde);
  const ligar = telHref(s.whatsapp);
  const mensagem = montarMensagem({ equipamento: equipamento.id });
  const caminho = `/${pagina.slug}`;

  return (
    <>
      <JsonLd
        dados={[
          servicoJsonLd({
            nome: tituloDaPagina(pagina, s.endereco_cidade),
            caminho,
            descricao: descricaoDaPagina(pagina, s.endereco_cidade),
            prestador: s.empresa_nome,
            area: s.area_atendimento || s.endereco_cidade,
            tipo: `Assistência técnica de ${pagina.palavraChave}`,
          }),
          trilhaJsonLd([
            { rotulo: "Início", href: "/" },
            { rotulo: pagina.nomeCurto, href: caminho },
          ]),
        ]}
      />

      {/* ------------------------------------------------------- abertura */}
      <section
        aria-labelledby="abertura-titulo"
        className="relative overflow-hidden border-b border-graf-200 bg-white"
      >
        <span
          aria-hidden
          className="jb-flutua pointer-events-none absolute -right-40 -top-40 size-[36rem] rounded-full bg-[radial-gradient(closest-side,rgb(224_20_27/0.11),transparent)]"
        />

        <div className="container-jb relative grid gap-7 pb-12 pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:items-center lg:gap-14 lg:pb-16 lg:pt-12">
          <div>
            <p className="sobretitulo entrada">
              Conserto de {pagina.palavraChave} · {s.endereco_cidade}
            </p>

            <h1 id="abertura-titulo" className="text-hero texto-forte entrada mt-3 [animation-delay:70ms]">
              <span className="block">{pagina.nomeCurto} parou?</span>
              <span className="block text-jb-600">A JB conserta.</span>
            </h1>

            <p className="texto-guia entrada mt-5 max-w-xl text-graf-600 [animation-delay:140ms]">
              {pagina.chamada}
            </p>

            <div className="entrada mt-7 flex flex-col gap-3 sm:flex-row [animation-delay:210ms]">
              <BotaoWhatsapp
                numero={s.whatsapp}
                mensagem={mensagem}
                equipamento={equipamento.id}
                posicao="abertura"
                tamanho="lg"
                className="w-full sm:w-auto"
              >
                Chamar sobre {pagina.naFrase}
              </BotaoWhatsapp>
              {ligar ? (
                <a href={ligar} className={classesBotao("secundario", "lg", "w-full whitespace-nowrap sm:w-auto")}>
                  <Phone className="size-4" aria-hidden />
                  Ligar agora
                </a>
              ) : null}
            </div>

            <StatusAtendimento
              horario={s.horario}
              neutro={`Atendimento em ${s.endereco_cidade} e região`}
              className="entrada mt-4 [animation-delay:240ms]"
            />

            <Defeitos equipamento={equipamento} whatsapp={s.whatsapp} />
          </div>

          <div className="entrada order-first lg:order-none [animation-delay:120ms]">
            <Visual pagina={pagina} equipamento={equipamento} />
          </div>
        </div>
      </section>

      {equipamento.evoxx ? (
        <FaixaAutorizada desde={s.empresa_desde} cidade={s.endereco_cidade} />
      ) : null}

      <EnquantoIsso pagina={pagina} whatsapp={s.whatsapp} mensagem={mensagem} equipamento={equipamento.id} />

      <ComoFunciona whatsapp={s.whatsapp} mensagem={mensagem} equipamento={equipamento.id} />
      <ClinicaOuBancada cidade={s.endereco_cidade} mensagem={mensagem} />
      <PorQueJb anos={anos} desde={s.empresa_desde} cidade={s.endereco_cidade} />
      <Duvidas cidade={s.endereco_cidade} horario={s.horario} extras={pagina.duvidas} />
      <OutrosEquipamentos atual={pagina.slug} />
      <ChamadaFinal
        whatsapp={s.whatsapp}
        telefone={s.whatsapp}
        horario={s.horario}
        cidade={s.endereco_cidade}
        mensagem={mensagem}
        equipamento={equipamento.id}
        titulo={`Não deixe ${pagina.naFrase} parar a sua agenda.`}
      />
    </>
  );
}

/* ------------------------------------------------------------------ visual */

/**
 * O equipamento em destaque, boiando sobre um brilho da marca.
 *
 * Recorte de fundo branco entra com `mix-blend-multiply`, que some com o
 * branco da foto sobre o degradê; sem recorte bom (destilador), entra a foto
 * da bancada, que respira. No celular a altura é contida para o título e o
 * botão ainda caberem na primeira tela.
 */
function Visual({ pagina, equipamento }: { pagina: PaginaDeEquipamento; equipamento: Equipamento }) {
  const { visual } = pagina;
  const recorte = visual.tipo === "recorte";

  return (
    <div className="relative">
      <div
        className={cn(
          "relative h-56 overflow-hidden rounded-3xl ring-1 ring-graf-950/5 sm:h-72 lg:h-[30rem]",
          recorte ? "bg-gradient-to-br from-jb-50 via-white to-graf-50 shadow-card" : "bg-graf-100 shadow-raised",
        )}
      >
        {recorte ? (
          <>
            <span
              aria-hidden
              className="absolute left-1/2 top-1/2 size-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(224_20_27/0.16),transparent)]"
            />
            <div className="jb-boia absolute inset-x-[8%] bottom-[12%] top-[6%]">
              <Image
                src={visual.src}
                alt={pagina.palavraChave.charAt(0).toUpperCase() + pagina.palavraChave.slice(1)}
                fill
                priority
                sizes="(min-width: 1024px) 30rem, 90vw"
                className="object-contain mix-blend-multiply"
              />
            </div>
            <span
              aria-hidden
              className="absolute inset-x-[26%] bottom-[9%] h-4 rounded-[100%] bg-graf-950/15 blur-md"
            />
          </>
        ) : (
          <Image
            src={visual.src}
            alt="Técnico consertando um equipamento odontológico na bancada"
            fill
            priority
            sizes="(min-width: 1024px) 30rem, 92vw"
            className="jb-foto-viva object-cover"
            style={{ objectPosition: visual.posicao }}
          />
        )}
      </div>

      {equipamento.evoxx ? (
        <p className="jb-boia absolute -left-2 top-4 flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-xs font-extrabold text-graf-900 shadow-pop backdrop-blur sm:-left-4 sm:text-sm">
          <span className="flex size-7 items-center justify-center rounded-lg bg-jb-500 text-white">
            <BadgeCheck className="size-4" aria-hidden />
          </span>
          Autorizada EVOXX
        </p>
      ) : null}
      <p className="jb-boia-2 absolute -right-2 bottom-4 flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-xs font-extrabold text-graf-900 shadow-pop backdrop-blur sm:-right-4 sm:text-sm">
        <span className="flex size-7 items-center justify-center rounded-lg bg-ok-500 text-white">
          <FileCheck2 className="size-4" aria-hidden />
        </span>
        Orçamento antes da troca
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- defeitos */

/**
 * Os defeitos, cada um um atalho para o WhatsApp com o problema escrito.
 * É o diagnóstico da home reduzido a um toque, porque o equipamento a página
 * já sabe.
 */
function Defeitos({ equipamento, whatsapp }: { equipamento: Equipamento; whatsapp: string }) {
  return (
    <div className="entrada mt-8 [animation-delay:280ms]">
      <p className="text-sm font-extrabold text-graf-900">
        Qual é o defeito? Toque e a mensagem já vai com ele:
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {equipamento.defeitos.map((defeito) => (
          <li key={defeito}>
            <LinkWhatsapp
              numero={whatsapp}
              mensagem={montarMensagem({ equipamento: equipamento.id, defeito })}
              posicao="defeito"
              equipamento={equipamento.id}
              className="foco-jb group inline-flex min-h-11 items-center gap-2 rounded-full border border-graf-200 bg-white px-4 py-2 text-sm font-bold text-graf-800 shadow-xs transition-[border-color,color,transform] duration-200 hover:-translate-y-0.5 hover:border-jb-400 hover:text-jb-700 active:scale-[0.97]"
            >
              {defeito}
              <MarcaWhatsapp className="size-3.5 text-graf-400 transition-colors group-hover:text-jb-600" />
            </LinkWhatsapp>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ----------------------------------------------------------- enquanto isso */

function EnquantoIsso({
  pagina,
  whatsapp,
  mensagem,
  equipamento,
}: {
  pagina: PaginaDeEquipamento;
  whatsapp: string;
  mensagem: string;
  equipamento: string;
}) {
  return (
    <section aria-labelledby="enquanto-titulo" className="bg-white py-16 md:py-20">
      <div className="container-jb grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-16">
        <div>
          <p className="sobretitulo jb-revela flex items-center gap-2">
            <ShieldAlert className="size-4" aria-hidden />
            Antes da equipe chegar
          </p>
          <h2 id="enquanto-titulo" className="text-section texto-forte jb-revela mt-3 max-w-xl">
            Enquanto isso, <span className="text-jb-600">com segurança.</span>
          </h2>
          <p className="texto-guia jb-revela mt-5 max-w-lg text-graf-600" style={{ "--i": 1 } as React.CSSProperties}>
            Nada de abrir o equipamento ou testar peça por conta própria. Estes cuidados
            simples já protegem {pagina.naFrase} e ajudam a triagem.
          </p>
          <div className="jb-revela mt-8" style={{ "--i": 2 } as React.CSSProperties}>
            <BotaoWhatsapp
              numero={whatsapp}
              mensagem={mensagem}
              equipamento={equipamento}
              posicao="secao"
              tamanho="lg"
            >
              Mandar foto no WhatsApp
            </BotaoWhatsapp>
          </div>
        </div>

        <ol className="grid gap-3">
          {pagina.enquantoIsso.map((cuidado, indice) => (
            <li
              key={cuidado}
              className="jb-revela flex gap-4 rounded-2xl border border-graf-200 bg-surface-muted p-5"
              style={{ "--i": indice + 1 } as React.CSSProperties}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-extrabold text-jb-600 shadow-xs ring-1 ring-graf-200 tabular">
                {indice + 1}
              </span>
              <p className="self-center text-corpo font-semibold leading-snug text-graf-900">{cuidado}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------ outros equipamentos */

/**
 * Os outros equipamentos, cada um com a sua página. Quem veio pelo anúncio
 * da autoclave e tem também um compressor falhando descobre aqui que a JB
 * atende os dois; e o buscador encontra as páginas umas pelas outras.
 */
function OutrosEquipamentos({ atual }: { atual: string }) {
  const outros = PAGINAS_DE_EQUIPAMENTO.filter((pagina) => pagina.slug !== atual);

  return (
    <section aria-labelledby="outros-titulo" className="border-t border-graf-200 bg-white py-14 md:py-20">
      <div className="container-jb">
        <h2 id="outros-titulo" className="text-title texto-forte jb-revela">
          A JB também conserta
        </h2>
        <ul className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {outros.map((pagina, indice) => {
            const imagem = IMAGEM_DO_EQUIPAMENTO[pagina.equipamento];
            const Icone = ICONE_DO_EQUIPAMENTO[pagina.equipamento];
            return (
              <li key={pagina.slug} className="jb-revela" style={{ "--i": indice % 3 } as React.CSSProperties}>
                <Link
                  href={`/${pagina.slug}`}
                  className="foco-jb group flex h-full flex-col items-center gap-2 rounded-2xl border border-graf-200 bg-white p-4 text-center transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-1 hover:border-jb-300 hover:shadow-pop active:scale-[0.97] active:border-jb-300"
                >
                  <span className="relative flex size-20 items-center justify-center">
                    {imagem ? (
                      <Image
                        src={imagem}
                        alt=""
                        fill
                        sizes="80px"
                        className="jb-toque-foto object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <span className="flex size-14 items-center justify-center rounded-2xl bg-jb-50 text-jb-600">
                        <Icone className="size-7" aria-hidden />
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-extrabold text-graf-900">{pagina.nomeCurto}</span>
                  <span className="mt-auto inline-flex items-center gap-1 text-xs font-bold text-jb-600">
                    Ver conserto
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
