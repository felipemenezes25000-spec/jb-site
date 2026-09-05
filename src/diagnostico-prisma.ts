import { prisma } from "@/lib/prisma";

async function diagnosticarCreateServiceRequest() {
  await prisma.serviceRequest.create({ data: {} as any });
}

void diagnosticarCreateServiceRequest;
