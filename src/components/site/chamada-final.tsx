import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
import { StatusAtendimento } from "@/components/site/status-atendimento";
import type { ContatoWhatsapp } from "@/lib/contatos-whatsapp";
import { MENSAGEM_PADRAO } from "@/lib/diagnostico";

/* ============================================================================
   Chamada final

   O último empurrão antes do rodapé: fundo vermelho clarinho da marca (nunca
   vermelho cheio em área grande), duas manchas de luz que flutuam devagar e
   a mesma escolha da abertura, Jeferson ou Jackson, com um anel que pulsa em
   volta do principal. O selo de horário se repete aqui porque é a pergunta
   que a pessoa faz antes de mandar a mensagem.
   ============================================================================ */

export function ChamadaFinal({
  contatos,
  horario,
  cidade,
  mensagem = MENSAGEM_PADRAO,
  equipamento,
  titulo = "Não deixe a agenda parar por causa de um equipamento.",
}: {
  /** Jeferson e Jackson, de `contatosWhatsapp`. */
  contatos: ContatoWhatsapp[];
  horario: string;
  cidade: string;
  /** Nas páginas de equipamento, a mensagem e o título já dizem qual é. */
  mensagem?: string;
  equipamento?: string;
  titulo?: string;
}) {
  return (
    <section aria-labelledby="chamada-final-titulo" className="relative overflow-clip bg-jb-50 py-20 md:py-28">
      <span
        aria-hidden
        className="jb-flutua pointer-events-none absolute -left-24 -top-24 size-[26rem] rounded-full bg-[radial-gradient(closest-side,rgb(224_20_27/0.16),transparent)]"
      />
      <span
        aria-hidden
        className="jb-flutua-lento pointer-events-none absolute -bottom-32 -right-20 size-[30rem] rounded-full bg-[radial-gradient(closest-side,rgb(224_20_27/0.12),transparent)]"
      />

      <div className="container-estreito relative text-center">
        <StatusAtendimento
          horario={horario}
          neutro={`Assistência técnica em ${cidade} e região`}
          className="jb-revela"
        />
        <h2
          id="chamada-final-titulo"
          className="text-display texto-forte jb-revela mx-auto mt-6 max-w-2xl"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          {titulo}
        </h2>
        <p
          className="texto-guia jb-revela mx-auto mt-5 max-w-xl text-graf-700"
          style={{ "--i": 2 } as React.CSSProperties}
        >
          Mande a mensagem agora. Quanto antes a equipe entende o defeito, antes ele volta a
          funcionar.
        </p>

        <OpcoesWhatsapp
          contatos={contatos}
          mensagem={mensagem}
          equipamento={equipamento}
          onde="fechamento"
          pulso
          className="jb-revela mt-9 sm:justify-center"
          style={{ "--i": 3 } as React.CSSProperties}
        />
      </div>
    </section>
  );
}
