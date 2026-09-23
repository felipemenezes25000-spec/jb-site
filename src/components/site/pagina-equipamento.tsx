import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BadgeCheck, FileCheck2, ShieldAlert } from "lucide-react";

import { ChamadaFinal } from "@/components/site/chamada-final";
import { ClinicaOuBancada } from "@/components/site/clinica-ou-bancada";
import { ComoFunciona } from "@/components/site/como-funciona";
import { Duvidas } from "@/components/site/duvidas";
import { FaixaAutorizada } from "@/components/site/faixa-autorizada";
import { ICONE_DO_EQUIPAMENTO, IMAGEM_DO_EQUIPAMENTO } from "@/components/site/icones-equipamento";
import { EscolhaDoDefeito } from "@/components/site/escolha-do-defeito";
import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
import { PorQueJb } from "@/components/site/por-que-jb";
import { StatusAtendimento } from "@/components/site/status-atendimento";
import { contatosWhatsapp, type ContatoWhatsapp } from "@/lib/contatos-whatsapp";
import { montarMensagem } from "@/lib/diagnostico";
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

   A landing confirma imediatamente a intenção do anúncio: nome do equipamento,
   defeito e WhatsApp aparecem antes da fotografia no mobile. No desktop a foto
   continua compondo a abertura lado a lado. Assim a imagem reforça a marca sem
   virar pedágio entre o clique pago e a conversa.

   O resto reaproveita a home, com a mensagem do equipamento em todo botão:
   como funciona, clínica ou bancada, por que a JB, dúvidas (as do equipamento
   primeiro) e a chamada final. Nada aqui prende o equipamento a um
   fabricante: o selo é "todas as marcas", e a autorização EVOXX aparece só
   como credencial da empresa, na faixa de marcas.

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
  const mensagem = montarMensagem({ equipamento: equipamento.id });
  const contatos = contatosWhatsapp(s);
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
        className="jb-landing-hero relative overflow-clip border-b border-graf-200 bg-white"
      >

        <div className="container-jb relative grid gap-7 pb-12 pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:items-center lg:gap-14 lg:pb-16 lg:pt-12">
          <div>
            <p className="sobretitulo entrada">
              Conserto de {pagina.palavraChave} · {s.endereco_cidade}
            </p>

            <h1 id="abertura-titulo" className="text-hero texto-forte entrada mt-3 [animation-delay:70ms]">
              <span className="block">{pagina.nomeCurto} parou?</span>{" "}
              <span className="block text-jb-600">A JB assume daqui.</span>
            </h1>

            {/* No celular, o título e a escolha do defeito já confirmam o anúncio;
                o parágrafo de impacto entra a partir do tablet, para os dois
                atendentes caberem na primeira dobra. */}
            <p className="texto-guia entrada mt-5 hidden max-w-xl text-graf-600 [animation-delay:140ms] sm:block">
              {pagina.chamada}
            </p>

            <EscolhaDoDefeito
              equipamento={equipamento}
              naFrase={pagina.naFrase}
              contatos={contatos}
              className="entrada mt-5 [animation-delay:210ms] sm:mt-7"
            />

            <StatusAtendimento
              horario={s.horario}
              neutro={`Atendimento em ${s.endereco_cidade} e região`}
              className="entrada mt-4 [animation-delay:240ms]"
            />
          </div>

          <div className="entrada order-first lg:order-none [animation-delay:120ms]">
            <Visual pagina={pagina} />
          </div>
        </div>
      </section>

      <FaixaAutorizada desde={s.empresa_desde} cidade={s.endereco_cidade} />

      <EnquantoIsso pagina={pagina} contatos={contatos} mensagem={mensagem} equipamento={equipamento.id} />

      <ComoFunciona contatos={contatos} mensagem={mensagem} equipamento={equipamento.id} />
      <ClinicaOuBancada cidade={s.endereco_cidade} mensagem={mensagem} />
      <PorQueJb anos={anos} desde={s.empresa_desde} cidade={s.endereco_cidade} />
      <Duvidas cidade={s.endereco_cidade} horario={s.horario} extras={pagina.duvidas} />
      <OutrosEquipamentos atual={pagina.slug} />
      <ChamadaFinal
        contatos={contatos}
        horario={s.horario}
        cidade={s.endereco_cidade}
        mensagem={mensagem}
        equipamento={equipamento.id}
        titulo={`Conte o que ${pagina.naFrase} está fazendo.`}
      />
    </>
  );
}

/* ------------------------------------------------------------------ visual */

/**
 * O equipamento em destaque, sobre um brilho da marca. Parado: a imagem
 * confirma o anúncio, e nada nela precisa se mexer em laço.
 *
 * Recorte de fundo branco entra com `mix-blend-multiply`, que some com o
 * branco da foto sobre o degradê; sem recorte bom (destilador), entra a foto
 * da bancada. Como no mobile a ação vem antes da imagem, ela não recebe
 * preload e não compete com tipografia, diagnóstico e WhatsApp na chegada.
 */
function Visual({ pagina }: { pagina: PaginaDeEquipamento }) {
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
            <div className="absolute inset-x-[8%] bottom-[12%] top-[6%]">
              <Image
                src={visual.src}
                alt={pagina.palavraChave.charAt(0).toUpperCase() + pagina.palavraChave.slice(1)}
                fill
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
            sizes="(min-width: 1024px) 30rem, 92vw"
            className="object-cover"
            style={{ objectPosition: visual.posicao }}
          />
        )}
      </div>

      <p className="absolute -left-2 top-4 flex items-center gap-2 rounded-xl border border-graf-950/5 bg-white px-3 py-2 text-xs font-extrabold text-graf-900 shadow-pop sm:-left-4 sm:text-sm">
        <span className="flex size-7 items-center justify-center rounded-lg bg-jb-500 text-white">
          <BadgeCheck className="size-4" aria-hidden />
        </span>
        Todas as marcas
      </p>
      <p className="absolute -right-2 bottom-4 flex items-center gap-2 rounded-xl border border-graf-950/5 bg-white px-3 py-2 text-xs font-extrabold text-graf-900 shadow-pop sm:-right-4 sm:text-sm">
        <span className="flex size-7 items-center justify-center rounded-lg bg-ok-500 text-white">
          <FileCheck2 className="size-4" aria-hidden />
        </span>
        Orçamento antes da troca
      </p>
    </div>
  );
}

/* ----------------------------------------------------------- enquanto isso */

function EnquantoIsso({
  pagina,
  contatos,
  mensagem,
  equipamento,
}: {
  pagina: PaginaDeEquipamento;
  contatos: ContatoWhatsapp[];
  mensagem: string;
  equipamento: string;
}) {
  return (
    <section aria-labelledby="enquanto-titulo" className="bg-white py-16 md:py-20">
      <div className="container-jb grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-16">
        <div>
          <p className="sobretitulo jb-revela flex items-center gap-2">
            <ShieldAlert className="size-4" aria-hidden />
            Antes da avaliação técnica
          </p>
          <h2 id="enquanto-titulo" className="text-section texto-forte jb-revela mt-3 max-w-xl">
            Enquanto isso, <span className="text-jb-600">com segurança.</span>
          </h2>
          <p className="texto-guia jb-revela mt-5 max-w-lg text-graf-600" style={{ "--i": 1 } as React.CSSProperties}>
            Nada de abrir o equipamento ou testar peça por conta própria. Os cuidados abaixo são
            de segurança e observação externa, e ajudam a equipe a entender o sintoma.
          </p>
          <div className="jb-revela mt-8" style={{ "--i": 2 } as React.CSSProperties}>
            <p className="text-sm font-extrabold text-graf-900">Mande uma foto pelo WhatsApp:</p>
            <OpcoesWhatsapp
              contatos={contatos}
              mensagem={mensagem}
              equipamento={equipamento}
              posicao="secao"
              className="mt-3"
            />
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
 * Como o bloco fica no fim da landing, o prefetch automático é desligado para
 * não disputar rede com a conversa no WhatsApp.
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
                  prefetch={false}
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
