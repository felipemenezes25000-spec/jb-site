import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  nome: z.string().trim().min(3),
  email: z.string().trim().email(),
  descricao: z.string().trim().min(10),
  urgencia: z.enum(["baixa", "normal", "alta", "parado"]).default("normal"),
});

async function diagnosticarCreateServiceRequest() {
  const dados = schema.parse({
    nome: "Teste",
    email: "teste@example.com",
    descricao: "Descrição de diagnóstico",
    urgencia: "normal",
  });

  await prisma.serviceRequest.create({
    data: {
      number: "AT-DIAG",
      contactName: dados.nome,
      contactEmail: dados.email,
      description: dados.descricao,
      urgency: dados.urgencia,
    },
  });
}

void diagnosticarCreateServiceRequest;
