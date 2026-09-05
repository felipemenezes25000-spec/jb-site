import { prisma } from "@/lib/prisma";

async function diagnosticarCreateServiceRequest() {
  await prisma.serviceRequest.create({
    data: {
      number: "AT-DIAG",
      contactName: "Teste",
      contactEmail: "teste@example.com",
      description: "Descrição de diagnóstico",
    },
  });
}

void diagnosticarCreateServiceRequest;
