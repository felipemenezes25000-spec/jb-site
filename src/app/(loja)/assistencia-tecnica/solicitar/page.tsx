import type { Metadata } from "next";
import Link from "next/link";
import { Camera, IdCard, MessageCircle, Phone, Tag } from "lucide-react";

import {
  AssistenteChamado,
  type CategoriaEscolha,
  type EquipamentoEscolha,
  type UnidadeEscolha,
} from "@/components/assistencia/assistente-chamado";
import { Cartao, Trilha } from "@/components/ui/data";
import { sessaoCliente } from "@/lib/auth-cliente";
import { equipamentosDoCliente } from "@/lib/equipamento";
import { telHref, whatsappHref } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

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

  const listaCategorias: CategoriaEscolha[] = categorias.map((categoria) => ({
    id: categoria.id,
    nome: categoria.name,
  }));

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

  const whatsapp = whatsappHref(
    s.whatsapp,
    "Olá! Quero abrir um chamado de assistência técnica.",
  );

  return (
    <div className="container-jb py-8 lg:py-12">
      <JsonLd dados={trilhaJsonLd(TRILHA)} />
      <Trilha itens={TRILHA} className="mb-6" />

      <header className="max-w-2xl">
        <h1 className="text-display leading-tight">Solicitar assistência técnica</h1>
        <p className="mt-4 text-base leading-relaxed text-graf-600">
          Cinco passos rápidos. Ao final o chamado ganha um número e entra na fila da equipe
          técnica — e você acompanha cada etapa por ele.
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <Cartao className="p-6 lg:p-8">
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

        {/* ------------------------------------------------------ apoio ao lado */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Cartao className="p-5">
            <h2 className="text-sm font-bold text-graf-950">O que deixar por perto</h2>
            <ul className="mt-4 space-y-4 text-sm">
              {[
                {
                  icone: Tag,
                  texto: "A marca e o modelo, como estão escritos no aparelho.",
                },
                {
                  icone: IdCard,
                  texto:
                    "O número de série — costuma ficar em uma etiqueta na traseira ou na base.",
                },
                {
                  icone: Camera,
                  texto: "Uma foto do problema e outra da etiqueta de identificação.",
                },
              ].map((item) => (
                <li key={item.texto} className="flex gap-3">
                  <item.icone className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
                  <span className="leading-relaxed text-graf-600">{item.texto}</span>
                </li>
              ))}
            </ul>
          </Cartao>

          {!cliente ? (
            <Cartao className="p-5">
              <h2 className="text-sm font-bold text-graf-950">Já é cliente JB?</h2>
              <p className="mt-2 text-sm leading-relaxed text-graf-600">
                Entrando na conta, seus equipamentos e endereços já aparecem preenchidos, e
                dá para anexar fotos direto pelo site.
              </p>
              <Link
                href="/entrar?destino=/assistencia-tecnica/solicitar"
                className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-jb-700 underline underline-offset-2 hover:text-jb-800"
              >
                Entrar na conta
              </Link>
            </Cartao>
          ) : null}

          <Cartao className="p-5">
            <h2 className="text-sm font-bold text-graf-950">Prefere falar com alguém?</h2>
            <p className="mt-2 text-sm leading-relaxed text-graf-600">{s.horario}</p>
            <div className="mt-4 space-y-3 text-sm">
              {s.telefone ? (
                <a
                  href={telHref(s.telefone)}
                  className="flex min-h-11 items-center gap-3 font-semibold text-graf-900 hover:text-jb-700"
                >
                  <Phone className="size-4 shrink-0 text-jb-600" aria-hidden />
                  {s.telefone}
                </a>
              ) : null}
              {whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 items-center gap-3 font-semibold text-graf-900 hover:text-jb-700"
                >
                  <MessageCircle className="size-4 shrink-0 text-jb-600" aria-hidden />
                  {s.whatsapp}
                </a>
              ) : null}
            </div>
          </Cartao>
        </aside>
      </div>
    </div>
  );
}
