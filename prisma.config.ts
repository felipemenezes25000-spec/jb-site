import "dotenv/config";

import { defineConfig } from "prisma/config";

import { urlsBancoEfetivas } from "./src/lib/seguranca-ambiente";

const urlCli = urlsBancoEfetivas(process.env).cli;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // `prisma generate` não precisa de conexão e roda também em instalações sem
  // DATABASE_URL. Já migrate/studio, quando há URL disponível, recebem aqui a
  // MESMA seleção segura usada pelo runtime. Em preview isso impede o CLI de
  // cair na conexão direta de produção enquanto a aplicação usa JBPREV_*.
  ...(urlCli ? { datasource: { url: urlCli } } : {}),
});
