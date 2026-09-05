import { prisma } from "@/lib/prisma";

async function diagnosticarCreateServiceRequest() {
  await prisma.serviceRequest.create({
    data: {
      number: "AT-DIAG",
      customerId: null,
      equipmentId: null,
      contactName: "Teste",
      contactEmail: "teste@example.com",
      contactPhone: "11999999999",
      categoryId: null,
      brandName: "Marca",
      modelName: "Modelo",
      serialNumber: "SERIE",
      problemKind: "Não liga",
      description: "Descrição de diagnóstico",
      urgency: "normal",
      addressZip: "01001000",
      addressStreet: "Praça da Sé",
      addressNumber: "1",
      addressComplement: "",
      addressDistrict: "Sé",
      addressCity: "São Paulo",
      addressState: "SP",
      availability: "Comercial",
    },
  });
}

void diagnosticarCreateServiceRequest;
