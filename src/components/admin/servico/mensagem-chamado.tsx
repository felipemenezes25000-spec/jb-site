"use client";

import { useState } from "react";
import { Eye, EyeOff, Send } from "lucide-react";

import { registrarMensagemNoChamado } from "@/app/acoes/admin-servico";
import { FormularioAcao, Oculto } from "@/components/admin/servico/formulario";
import { Area, Campo } from "@/components/ui/form";
import { cn } from "@/lib/utils";

/* ============================================================================
   Mensagem ao cliente ou nota interna

   As duas escritas caem na mesma linha do tempo do chamado e a única diferença
   é `visibleToCustomer` — por isso vivem no mesmo formulário, com a escolha
   explícita antes do texto. Separar em dois botões parecidos seria o caminho
   mais curto para alguém publicar para o cliente o que era recado da equipe.

   A escolha muda o rótulo do botão, o texto de ajuda e a moldura do bloco:
   quem está digitando enxerga para onde o texto vai antes de enviar.
   ============================================================================ */

export function MensagemDoChamado({ chamadoId }: { chamadoId: string }) {
  const [visivel, setVisivel] = useState(false);

  return (
    <FormularioAcao
      acao={registrarMensagemNoChamado}
      rotulo={visivel ? "Enviar ao cliente" : "Salvar nota interna"}
      variante={visivel ? "primario" : "secundario"}
      icone={visivel ? <Send className="size-4" aria-hidden /> : undefined}
      reiniciarAoConcluir
    >
      {({ estado }) => (
        <>
          <Oculto nome="chamadoId" valor={chamadoId} />
          {/* o valor real vai no hidden: o grupo de rádio é só a escolha visual */}
          <input type="hidden" name="visivel" value={visivel ? "on" : ""} />

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-graf-800">
              Para onde vai este texto
            </legend>
            <div className="flex flex-wrap gap-2">
              <Escolha
                selecionado={!visivel}
                aoEscolher={() => setVisivel(false)}
                icone={<EyeOff className="size-4" aria-hidden />}
                titulo="Nota interna"
                descricao="Só a equipe vê"
              />
              <Escolha
                selecionado={visivel}
                aoEscolher={() => setVisivel(true)}
                icone={<Eye className="size-4" aria-hidden />}
                titulo="Mensagem ao cliente"
                descricao="Aparece na Minha JB e gera aviso"
              />
            </div>
          </fieldset>

          <Campo
            rotulo="Título (opcional)"
            name="titulo"
            maxLength={180}
            placeholder={visivel ? "Ex.: peça encomendada" : "Ex.: contato feito por telefone"}
          />

          <Area
            rotulo={visivel ? "Mensagem para o cliente" : "Nota interna"}
            name="mensagem"
            rows={4}
            required
            maxLength={4000}
            erro={estado.campo === "mensagem" ? estado.erro : undefined}
            ajuda={
              visivel
                ? "O cliente recebe este texto na área dele, com aviso na caixa de notificações."
                : "Fica na linha do tempo da equipe e nunca chega ao cliente."
            }
          />
        </>
      )}
    </FormularioAcao>
  );
}

function Escolha({
  selecionado,
  aoEscolher,
  icone,
  titulo,
  descricao,
}: {
  selecionado: boolean;
  aoEscolher: () => void;
  icone: React.ReactNode;
  titulo: string;
  descricao: string;
}) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3.5 py-2 transition-colors",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-jb-500",
        selecionado
          ? "border-jb-500 bg-jb-50 text-jb-800"
          : "border-graf-300 bg-white text-graf-700 hover:border-graf-400",
      )}
    >
      <input
        type="radio"
        name="destino-da-mensagem"
        checked={selecionado}
        onChange={aoEscolher}
        className="sr-only"
      />
      <span className={selecionado ? "text-jb-600" : "text-graf-500"}>{icone}</span>
      <span>
        <span className="block text-sm font-semibold">{titulo}</span>
        <span className="block text-xs font-normal text-graf-500">{descricao}</span>
      </span>
    </label>
  );
}
