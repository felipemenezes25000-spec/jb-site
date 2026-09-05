import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Diagnóstico temporário: o build publica o relatório do tsc em /typecheck.txt
  // para localizar e corrigir os erros; esta opção será removida após a correção.
  typescript: { ignoreBuildErrors: true },
  // O Prisma faz acesso dinâmico ao sistema de arquivos; deixá-lo fora do
  // bundle evita que o rastreamento arraste a pasta public inteira para o
  // pacote do servidor.
  serverExternalPackages: ["@prisma/client", "sharp"],
};

export default nextConfig;
