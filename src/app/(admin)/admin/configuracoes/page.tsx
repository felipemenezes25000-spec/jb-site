import type { Metadata } from "next";
import Link from "next/link";

import { salvarConfiguracoes } from "@/app/acoes/admin-conteudo";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import {
  FormularioConfiguracoes,
  type CampoDeConfiguracao,
} from "@/components/admin/conteudo/formulario-configuracoes";
import { Aviso } from "@/components/ui/aviso";
import { formatarDataHora } from "@/lib/format";
import { exigirArea } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { SETTING_FIELDS, getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Configurações",
};

/**
 * Configurações do site.
 *
 * A lista de campos é a de `SETTING_FIELDS`; o valor exibido vem de
 * `getSettings()`, que já mistura o que está gravado com os padrões. Campo
 * vazio no banco mostra o padrão — e salvar mantém esse padrão gravado, para
 * ficar explícito o que está valendo.
 */
export default async function PaginaConfiguracoes() {
  await exigirArea("configuracoes");

  const [valores, ultima] = await Promise.all([
    getSettings(),
    prisma.setting.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
  ]);

  const campos: CampoDeConfiguracao[] = SETTING_FIELDS.map((campo) => ({
    chave: campo.key,
    rotulo: campo.label,
    grupo: campo.group,
    tipo: campo.type,
    ajuda: campo.hint,
    valor: valores[campo.key],
  }));

  return (
    <div className="space-y-5">
      <CabecalhoDeSecao
        titulo="Configurações do site"
        descricao={
          ultima
            ? `Última alteração em ${formatarDataHora(ultima.updatedAt)}.`
            : "Nada foi alterado ainda: os valores abaixo são os padrões do sistema."
        }
      />

      <Aviso tom="info" titulo="Onde estes dados aparecem">
        Telefone, WhatsApp, e-mail, horário e endereço são usados no cabeçalho, no rodapé, na
        página de contato e nos avisos enviados ao cliente. Uma alteração aqui vale no site
        inteiro assim que você salvar. Para mudar textos de página, use{" "}
        <Link
          href="/admin/conteudo"
          className="font-semibold text-jb-700 underline underline-offset-2"
        >
          Conteúdo
        </Link>
        .
      </Aviso>

      <FormularioConfiguracoes acao={salvarConfiguracoes} campos={campos} />
    </div>
  );
}
