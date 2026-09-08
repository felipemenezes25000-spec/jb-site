import type { Metadata } from "next";
import Link from "next/link";
import { Camera, IdCard, Tag } from "lucide-react";

import {
  AssistenteChamado,
  type CategoriaEscolha,
  type EquipamentoEscolha,
  type UnidadeEscolha,
} from "@/components/assistencia/assistente-chamado";
import {
  CabecalhoAssistencia,
  CanaisDiretos,
  CartaoApoio,
  ListaDeApoio,
} from "@/components/assistencia/apoio";
import { Cartao, Trilha } from "@/components/ui/data";
import { sessaoCliente } from "@/lib/auth-cliente";
import { equipamentosDoCliente } from "@/lib/equipamento";
import { unificarPorNome } from "@/lib/homonimos";
import { prisma } from "@/lib/prisma";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

/*
 * Migração para Cache Components — esta rota ainda não foi migrada.
 *
 * `instant = false` desliga a validação de navegação instantânea para este
 * segmento. É a saída documentada para migrar rota a rota
 * (node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md,
 * "Following validation"): a casca da loja já foi migrada e prerenderiza, e
 * cada página vai deixando de precisar disto conforme a leitura dela ganha
 * `use cache` ou um `<Suspense>`.
 *
 * A lista do que ainda depende desta linha está em
 * docs/evolucao-jb/cobertura.md, fase 5. Ela é pendência declarada, não
 * conclusão.
 */
export const instant = false;

const CAMINHO = "/assistencia-tecnica/solicitar";

const TRILHA = [
  { rotulo: "Início", href: "/" },
  { rotulo: "Assistência técnica", href: "/assistencia-tecnica" },
  { rotulo: "Solicitar" },
];

export const metadata: Metadata = metadataDePagina({
  titulo: "Solicitar assistência técnica",
  descricao:
    "Abra um chamado de assistência técnica em cinco passos. Você recebe um número na hora e acompanha cada etapa do atendimento.",
  caminho: CAMINHO,
});

/** O que vale ter em mãos antes de começar. */
const PREPARO = [
  { icone: Tag, texto: "A marca e o modelo, como estão escritos no aparelho." },
  {
    icone: IdCard,
    texto: "O número de série — costuma ficar em uma etiqueta na traseira ou na base.",
  },
  { icone: Camera, texto: "Uma foto do problema e outra da etiqueta de identificação." },
];

/** Endereço da unidade em uma linha, para o cliente reconhecer qual é qual. */
function resumirEndereco(endereco: {
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
} | null) {
  if (!endereco) return "";
  return [
    [endereco.street, endereco.number].filter(Boolean).join(", "),
    endereco.district,
    [endereco.city, endereco.state].filter(Boolean).join("/"),
  ]
    .filter(Boolean)
    .join(" — ");
}

export default async function SolicitarPage() {
  const cliente = await sessaoCliente();

  const [s, categorias, dadosDoCliente, equipamentos, unidades] = await Promise.all([
    getSettings(),
    prisma.category.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    cliente
      ? prisma.customer.findUnique({
          where: { id: cliente.id },
          select: { name: true, email: true, phone: true },
        })
      : Promise.resolve(null),
    cliente ? equipamentosDoCliente(cliente.id) : Promise.resolve([]),
    cliente
      ? prisma.customerLocation.findMany({
          where: { customerId: cliente.id },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            address: {
              select: {
                street: true,
                number: true,
                district: true,
                city: true,
                state: true,
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  /* A escolha do tipo de equipamento oferecia "Biossegurança" duas vezes,
     porque o banco tem dois cadastros com esse nome. Duas opções idênticas
     numa pergunta de formulário não são uma escolha: são uma chance de errar
     sem saber. Aqui elas viram uma — e o chamado sai vinculado ao cadastro
     canônico. Conserto de verdade: `pnpm duplicatas:prever`. */
  const listaCategorias: CategoriaEscolha[] = unificarPorNome(
    categorias.map((categoria) => ({ slug: categoria.id, nome: categoria.name })),
  ).map((categoria) => ({ id: categoria.slug, nome: categoria.nome }));

  const listaEquipamentos: EquipamentoEscolha[] = equipamentos
    .filter((equipamento) => equipamento.status !== "desativado")
    .map((equipamento) => ({
      id: equipamento.id,
      nome: equipamento.name,
      marca: equipamento.brandName,
      modelo: equipamento.modelName,
      serie: equipamento.serialNumber,
      categoriaId: equipamento.categoryId,
      local: [equipamento.location?.name, equipamento.room].filter(Boolean).join(" · "),
    }));

  const listaUnidades: UnidadeEscolha[] = unidades.map((unidade) => ({
    id: unidade.id,
    nome: unidade.name,
    endereco: resumirEndereco(unidade.address),
  }));

  return (
    <>
      <JsonLd dados={trilhaJsonLd(TRILHA)} />

      {/* `compacto`: esta é tela de tarefa. A apresentação inteira ficava
          entre o topo e o primeiro campo no celular — ver
          `docs/auditoria-visual-2026-09-08/29-solicitar-mobile.png`. */}
      <CabecalhoAssistencia
        compacto
        trilha={<Trilha itens={TRILHA} />}
        sobretitulo="Abertura de chamado"
        titulo="Solicitar assistência técnica"
        resumo="Conte o que está acontecendo com o equipamento. No fim, o chamado ganha um número — é por ele que você acompanha cada etapa."
      />

      <div className="container-jb py-6 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-14">
          <Cartao className="p-5 sm:p-8 lg:p-10">
            <AssistenteChamado
              /* Carimbado no servidor: o relógio do navegador não entra nesta
                 conta, e assim não há divergência de hidratação. */
              inicio={Date.now()}
              categorias={listaCategorias}
              equipamentos={listaEquipamentos}
              unidades={listaUnidades}
              cliente={
                dadosDoCliente
                  ? {
                      nome: dadosDoCliente.name,
                      email: dadosDoCliente.email,
                      telefone: dadosDoCliente.phone,
                    }
                  : null
              }
              logado={Boolean(cliente)}
              telefone={s.telefone}
              whatsapp={s.whatsapp}
            />
          </Cartao>

          {/* ------------------------------------------------ apoio ao lado */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <CartaoApoio titulo="O que deixar por perto">
              <ListaDeApoio itens={PREPARO} />
            </CartaoApoio>

            {!cliente ? (
              <CartaoApoio
                titulo="Já é cliente JB?"
                descricao="Entrando na conta, seus equipamentos e endereços já aparecem preenchidos, e dá para anexar fotos direto pelo site."
              >
                <Link
                  href="/entrar?destino=/assistencia-tecnica/solicitar"
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-jb-700 underline underline-offset-2 hover:text-jb-800"
                >
                  Entrar na conta
                </Link>
              </CartaoApoio>
            ) : null}

            <CartaoApoio titulo="Prefere falar com alguém?" descricao={s.horario}>
              <CanaisDiretos
                telefone={s.telefone}
                whatsapp={s.whatsapp}
                mensagem="Olá! Quero abrir um chamado de assistência técnica."
              />
            </CartaoApoio>

            <p className="px-1 text-sm leading-relaxed text-graf-500">
              Quer saber o que acontece depois do envio?{" "}
              <Link
                href="/assistencia-tecnica#como-funciona"
                className="font-semibold text-jb-700 underline underline-offset-2 hover:text-jb-800"
              >
                Veja as seis etapas do atendimento
              </Link>
              .
            </p>
          </aside>
        </div>
      </div>
    </>
  );
}
