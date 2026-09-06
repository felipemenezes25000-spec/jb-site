"use client";

import { useState, useTransition } from "react";
import { ListPlus } from "lucide-react";
import { toast } from "sonner";

import { gerarConvites } from "@/app/acoes/admin-avaliacoes";
import { Botao } from "@/components/ui/button";

/**
 * Gerar a fila.
 *
 * Botão próprio, e não `BotaoAcao`, porque a ação não recebe formulário: ela
 * varre o que está elegível e devolve um resumo. O texto do botão diz que
 * nada sai — é a informação que muda a disposição de clicar.
 */
export function BotaoGerarConvites() {
  const [pendente, iniciar] = useTransition();
  const [ultimo, setUltimo] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Botao
        variante="secundario"
        tamanho="sm"
        carregando={pendente}
        onClick={() =>
          iniciar(async () => {
            const resultado = await gerarConvites();
            if (resultado.erro) toast.error(resultado.erro);
            else if (resultado.ok) {
              toast.success(resultado.ok);
              setUltimo(resultado.ok);
            }
          })
        }
      >
        <ListPlus className="size-4" aria-hidden />
        Gerar fila
      </Botao>
      <p className="text-[0.75rem] text-graf-500" role="status">
        {ultimo ?? "Gerar não envia nada."}
      </p>
    </div>
  );
}
