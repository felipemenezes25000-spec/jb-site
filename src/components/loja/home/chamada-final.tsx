import { LinkBotao } from "@/components/ui/button";
import { FaixaChamada } from "@/components/ui/secao";
import { telHref, whatsappHref } from "@/lib/format";
import type { SettingsMap } from "@/lib/settings";

/* ============================================================================
   Chamada final

   Dois destinos, não três: a proposta escrita e a conversa direta. O botão de
   texto solto que existia aqui ao lado de dois botões cheios não parecia um
   controle, e "Falar com a JB" e "WhatsApp" resolviam a mesma intenção com
   duas palavras diferentes.

   Sem WhatsApp configurado, a segunda ação vira o formulário de contato. O
   telefone e o horário continuam no parágrafo, direto das configurações.
   ============================================================================ */

export function ChamadaFinal({ configuracoes: s }: { configuracoes: SettingsMap }) {
  const telefone = s.telefone.trim();
  const whatsapp = s.whatsapp.trim();
  const horario = s.horario.trim();

  return (
    <FaixaChamada
      fundo="marca"
      titulo="Precisa de um equipamento, de um orçamento ou de um técnico?"
      descricao={
        <>
          Conte o que a sua clínica precisa e a equipe da JB retorna com a proposta.
          {telefone ? (
            <>
              {" "}
              Também dá para ligar:{" "}
              <a
                href={telHref(telefone)}
                className="font-bold text-jb-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
              >
                {telefone}
              </a>
              {horario ? <span className="text-graf-500">{` · ${horario}`}</span> : null}.
            </>
          ) : null}
        </>
      }
      acoes={
        <>
          <LinkBotao href="/orcamento" tamanho="lg">
            Pedir orçamento
          </LinkBotao>
          {whatsapp ? (
            <LinkBotao
              href={whatsappHref(
                whatsapp,
                "Olá! Vim pelo site da JB e gostaria de falar com a equipe.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              variante="secundario"
              tamanho="lg"
            >
              Falar no WhatsApp
            </LinkBotao>
          ) : (
            <LinkBotao href="/contato" variante="secundario" tamanho="lg">
              Falar com a JB
            </LinkBotao>
          )}
        </>
      }
    />
  );
}
