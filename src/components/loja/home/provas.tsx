import { Estatistica, Estatisticas } from "@/components/ui/estatistica";
import { Secao } from "@/components/ui/secao";
import type { SettingsMap } from "@/lib/settings";

/* ============================================================================
   Provas objetivas

   Só o que é verificável: o ano em que a JB começou e a cidade em que atende,
   que vêm das configurações, e a contagem de equipamentos e marcas, que vem
   do banco. Nenhum número de clientes, nota ou porcentagem — se não está no
   dado, não existe aqui.

   Cada prova só é renderizada quando tem valor. Faixa sem prova nenhuma
   também não é renderizada.

   O vermelho fica no ano de início, que é a prova mais forte da faixa e não
   muda de peso conforme o catálogo cresce ou encolhe. Pôr o destaque na
   contagem de equipamentos faria o número mais frágil da página ser o mais
   gritado.
   ============================================================================ */

export function ProvasObjetivas({
  configuracoes: s,
  equipamentos,
  marcas,
}: {
  configuracoes: SettingsMap;
  /** Produtos publicados no catálogo. */
  equipamentos: number;
  /** Marcas publicadas com pelo menos um produto no ar. */
  marcas: number;
}) {
  const desde = s.empresa_desde.trim();
  const cidade = s.endereco_cidade.trim();

  const provas: React.ReactNode[] = [];

  if (desde) {
    provas.push(
      <Estatistica
        key="desde"
        valor={desde}
        rotulo="Em atividade desde"
        detalhe="Venda e assistência técnica de equipamento odontológico."
        destaque
      />,
    );
  }

  if (equipamentos > 0) {
    provas.push(
      <Estatistica
        key="equipamentos"
        valor={equipamentos}
        rotulo="Equipamentos no catálogo"
        detalhe="Com ficha técnica e disponibilidade atualizada."
      />,
    );
  }

  if (marcas > 0) {
    provas.push(
      <Estatistica key="marcas" valor={marcas} rotulo="Marcas no catálogo" />,
    );
  }

  if (cidade) {
    provas.push(
      <Estatistica
        key="cidade"
        valor={cidade}
        rotulo="Atendimento em"
        detalhe="Equipe técnica própria, não terceirizada."
      />,
    );
  }

  if (provas.length < 2) return null;

  return (
    <Secao
      fundo="branco"
      espaco="md"
      rotulo="A JB em dados"
      className="border-b border-graf-200"
    >
      <Estatisticas colunas={provas.length === 2 ? 2 : provas.length === 3 ? 3 : 4}>
        {provas}
      </Estatisticas>
    </Secao>
  );
}
