import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O Prisma faz acesso dinâmico ao sistema de arquivos; deixá-lo fora do
  // bundle evita que o rastreamento arraste a pasta public inteira para o
  // pacote do servidor.
  serverExternalPackages: ["@prisma/client", "sharp"],
};

export default nextConfig;
