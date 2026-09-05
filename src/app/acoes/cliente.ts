// @ts-nocheck
"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  autenticarCliente,
  bloqueadoPorTentativas,
  criarSessaoCliente,
  encerrarSessaoCliente,
  hashSenhaCliente,
  sessaoCliente,
} from "@/lib/auth-cliente";
import { proximoCodigo } from "@/lib/codigos";
import { documentoValido } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export type EstadoCliente = { erro?: string };

function destinoSeguro(valor: FormDataEntryValue | null, padrao = "/minha-jb") {
  const destino = String(valor ?? "");
  return destino.startsWith("/") && !destino.startsWith("//") ? destino : padrao;
}

const loginSchema = z.object({
  email: z.string().trim().email(),
  senha: z.string().min(1),
});

export async function entrarCliente(
  _anterior: EstadoCliente,
  formData: FormData,
): Promise<EstadoCliente> {
  const dados = loginSchema.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
  });

  if (!dados.success) return { erro: "Confira seu e-mail e sua senha." };
  if (await bloqueadoPorTentativas(dados.data.email)) {
    return { erro: "Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente." };
  }

  const cliente = await autenticarCliente(dados.data.email, dados.data.senha);
  if (!cliente) return { erro: "E-mail ou senha incorretos." };

  await criarSessaoCliente(cliente);
  redirect(destinoSeguro(formData.get("voltar")));
}

const cadastroSchema = z.object({
  nome: z.string().trim().min(3, "Informe seu nome."),
  email: z.string().trim().email("Informe um e-mail válido."),
  telefone: z.string().trim().max(30).default(""),
  tipo: z.enum(["fisica", "juridica"]).default("fisica"),
  documento: z.string().trim().max(30).default(""),
  empresa: z.string().trim().max(120).default(""),
  senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

export async function cadastrarCliente(
  _anterior: EstadoCliente,
  formData: FormData,
): Promise<EstadoCliente> {
  const dados = cadastroSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    telefone: formData.get("telefone") ?? "",
    tipo: formData.get("tipo") ?? "fisica",
    documento: formData.get("documento") ?? "",
    empresa: formData.get("empresa") ?? "",
    senha: formData.get("senha"),
  });

  if (!dados.success) {
    return { erro: dados.error.issues[0]?.message ?? "Revise os dados informados." };
  }

  if (dados.data.documento && !documentoValido(dados.data.documento, dados.data.tipo)) {
    return { erro: dados.data.tipo === "fisica" ? "Informe um CPF válido." : "Informe um CNPJ válido." };
  }

  const email = dados.data.email.toLowerCase();
  if (await prisma.customer.findUnique({ where: { email }, select: { id: true } })) {
    return { erro: "Já existe uma conta com este e-mail." };
  }

  const cliente = await prisma.customer.create({
    data: {
      name: dados.data.nome,
      email,
      phone: dados.data.telefone,
      personType: dados.data.tipo,
      document: dados.data.documento.replace(/\D/g, ""),
      companyName: dados.data.empresa,
      passwordHash: await hashSenhaCliente(dados.data.senha),
    },
    select: { id: true, name: true, email: true },
  });

  await criarSessaoCliente(cliente);
  redirect("/minha-jb");
}

export async function sairCliente() {
  await encerrarSessaoCliente();
  redirect("/");
}

const chamadoSchema = z.object({
  nome: z.string().trim().min(3),
  email: z.string().trim().email(),
  telefone: z.string().trim().min(8),
  equipamentoId: z.string().trim().optional(),
  categoriaId: z.string().trim().optional(),
  marca: z.string().trim().max(100).default(""),
  modelo: z.string().trim().max(100).default(""),
  serie: z.string().trim().max(100).default(""),
  problema: z.string().trim().max(120).default(""),
  descricao: z.string().trim().min(10, "Descreva um pouco melhor o que está acontecendo."),
  urgencia: z.enum(["baixa", "normal", "alta", "parado"]).default("normal"),
  cep: z.string().trim().max(20).default(""),
  endereco: z.string().trim().max(160).default(""),
  numero: z.string().trim().max(30).default(""),
  complemento: z.string().trim().max(100).default(""),
  bairro: z.string().trim().max(100).default(""),
  cidade: z.string().trim().max(100).default(""),
  estado: z.string().trim().max(2).default(""),
  disponibilidade: z.string().trim().max(300).default(""),
});

export async function solicitarAssistencia(
  _anterior: EstadoCliente,
  formData: FormData,
): Promise<EstadoCliente> {
  const dados = chamadoSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    telefone: formData.get("telefone"),
    equipamentoId: formData.get("equipamentoId") || undefined,
    categoriaId: formData.get("categoriaId") || undefined,
    marca: formData.get("marca") ?? "",
    modelo: formData.get("modelo") ?? "",
    serie: formData.get("serie") ?? "",
    problema: formData.get("problema") ?? "",
    descricao: formData.get("descricao"),
    urgencia: formData.get("urgencia") ?? "normal",
    cep: formData.get("cep") ?? "",
    endereco: formData.get("endereco") ?? "",
    numero: formData.get("numero") ?? "",
    complemento: formData.get("complemento") ?? "",
    bairro: formData.get("bairro") ?? "",
    cidade: formData.get("cidade") ?? "",
    estado: String(formData.get("estado") ?? "").toUpperCase(),
    disponibilidade: formData.get("disponibilidade") ?? "",
  });

  if (!dados.success) {
    return { erro: dados.error.issues[0]?.message ?? "Revise os dados do chamado." };
  }

  const sessao = await sessaoCliente();
  const equipamentoId = sessao ? dados.data.equipamentoId || null : null;

  if (equipamentoId && sessao) {
    const pertence = await prisma.equipment.count({
      where: { id: equipamentoId, customerId: sessao.id },
    });
    if (!pertence) return { erro: "O equipamento selecionado não pertence à sua conta." };
  }

  let categoriaId = dados.data.categoriaId || null;
  if (categoriaId) {
    const categoriaExiste = await prisma.category.count({
      where: { id: categoriaId, published: true },
    });
    if (!categoriaExiste) categoriaId = null;
  }

  const chamado = await prisma.$transaction(async (tx) => {
    const numero = await proximoCodigo("chamado", tx);
    return tx.serviceRequest.create({
      data: {
        number: numero,
        customerId: sessao?.id ?? null,
        equipmentId,
        contactName: dados.data.nome,
        contactEmail: dados.data.email.toLowerCase(),
        contactPhone: dados.data.telefone,
        categoryId,
        brandName: dados.data.marca,
        modelName: dados.data.modelo,
        serialNumber: dados.data.serie,
        problemKind: dados.data.problema,
        description: dados.data.descricao,
        urgency: dados.data.urgencia,
        addressZip: dados.data.cep,
        addressStreet: dados.data.endereco,
        addressNumber: dados.data.numero,
        addressComplement: dados.data.complemento,
        addressDistrict: dados.data.bairro,
        addressCity: dados.data.cidade,
        addressState: dados.data.estado,
        availability: dados.data.disponibilidade,
        events: {
          create: {
            status: "solicitacao_recebida",
            title: "Solicitação recebida",
            message: "A JB recebeu o chamado e ele entrou na fila de triagem.",
          },
        },
      },
      select: { number: true },
    });
  });

  redirect(`/assistencia-tecnica/sucesso?protocolo=${encodeURIComponent(chamado.number)}`);
}
