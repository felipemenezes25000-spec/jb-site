import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";

import { Serial } from "@/components/dominio/prontuario";
import { Cartao } from "@/components/ui/data";
import { formatarData } from "@/lib/format";

/* ============================================================================
   A ponte entre o pedido e o prontuário

   Depois que o pagamento é confirmado, cada item de produto vira um
   equipamento na Área da Clínica. Isso já acontecia — e ninguém era avisado. A
   pessoa fechava a compra, via "pagamento confirmado" e não sabia que existia
   uma ficha do aparelho, muito menos onde.

   Este bloco só aparece quando o equipamento EXISTE no banco. Ele não promete
   que vai existir: enquanto o pagamento está pendente, não há nada aqui, e é
   assim que deve ser — anunciar o prontuário antes de o pagamento confirmar
   afirmaria um estado que ainda não é verdade.

   O link é para a ficha real, que exige sessão. Quem comprou está logado (a
   compra passou a exigir conta), então o caminho funciona; quem chegar sem
   sessão cai no login e volta para a ficha.
   ============================================================================ */

export type EquipamentoDoPedido = {
  id: string;
  nome: string;
  serial: string;
  garantiaAte: Date | null;
};

export function ProntuarioDoPedido({
  equipamentos,
  className,
}: {
  equipamentos: EquipamentoDoPedido[];
  className?: string;
}) {
  if (equipamentos.length === 0) return null;

  const um = equipamentos.length === 1;

  return (
    <Cartao className={className}>
      <div className="flex items-start gap-3.5 border-b border-graf-200 px-5 py-4">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-jb-50 text-jb-600"
        >
          <ClipboardList className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-graf-950">
            {um ? "O equipamento entrou no prontuário" : "Os equipamentos entraram no prontuário"}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-graf-600">
            A partir de agora, garantia, documentos, chamados e manutenções deste{" "}
            {um ? "equipamento" : "conjunto"} ficam registrados na Área da Clínica.
          </p>
        </div>
      </div>

      <ul className="divide-y divide-graf-100">
        {equipamentos.map((equipamento) => (
          <li key={equipamento.id}>
            <Link
              href={`/minha-jb/equipamentos/${equipamento.id}`}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-graf-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
            >
              <span className="min-w-0">
                <span className="block text-corpo font-semibold text-graf-950">
                  {equipamento.nome}
                </span>
                <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {/* Serial ausente NÃO vira traço: o número costuma ser
                      atribuído na preparação ou na instalação, e um "—" faria
                      parecer que o dado se perdeu. */}
                  <Serial numero={equipamento.serial} />
                  {equipamento.garantiaAte ? (
                    <span className="text-apoio text-graf-500">
                      Garantia até {formatarData(equipamento.garantiaAte)}
                    </span>
                  ) : null}
                </span>
              </span>

              <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-jb-700">
                Abrir a ficha
                <ArrowRight className="size-4" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Cartao>
  );
}
