import type { Metadata } from "next";
import { MapPin, PackageCheck } from "lucide-react";

import { CanaisDeContato } from "@/components/institucional/canais";
import { FormularioContato } from "@/components/institucional/formulario-contato";
import { MapaDaUnidade } from "@/components/institucional/mapa";
import { MolduraInstitucional } from "@/components/institucional/moldura";
import { CorpoCms, carregarPaginaCms } from "@/components/institucional/pagina-cms";
import { Cartao } from "@/components/ui/data";
import { JsonLd, localNegocioJsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";
import { enderecoCompleto, getSettings, ligado } from "@/lib/settings";

const SLUG = "contato";
const CAMINHO = "/contato";

export async function generateMetadata(): Promise<Metadata> {
  const [pagina, s] = await Promise.all([carregarPaginaCms(SLUG), getSettings()]);

  return metadataDePagina({
    titulo: pagina?.seoTitle || pagina?.title || "Contato",
    descricao:
      pagina?.seoDescription ||
      pagina?.lead ||
      `Fale com a ${s.empresa_nome}: telefone, WhatsApp, e-mail e endereço em ${s.endereco_cidade}.`,
    caminho: CAMINHO,
  });
}

export default async function ContatoPage() {
  const [pagina, s] = await Promise.all([carregarPaginaCms(SLUG), getSettings()]);

  const endereco = enderecoCompleto(s);
  const aceitaRetirada = ligado(s.retirada_disponivel);

  return (
    <>
      <JsonLd
        dados={[
          localNegocioJsonLd(s),
          trilhaJsonLd([{ rotulo: "Início", href: "/" }, { rotulo: "Contato", href: CAMINHO }]),
        ]}
      />

      <MolduraInstitucional
        trilha={[{ rotulo: "Início", href: "/" }, { rotulo: "Contato" }]}
        sobretitulo="Fale com a JB"
        titulo={pagina?.title || "Contato"}
        resumo={
          pagina?.lead ||
          "Conte o que a sua clínica precisa. A equipe responde no horário de atendimento, pelo canal que você preferir."
        }
        lateral={
          <div className="space-y-5">
            <Cartao className="p-5">
              <h2 className="text-base font-bold text-graf-950">Canais diretos</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-graf-600">
                Para urgência com equipamento parado, o telefone e o WhatsApp são o caminho
                mais curto.
              </p>
              <CanaisDeContato s={s} className="mt-4" />
            </Cartao>

            {aceitaRetirada && s.retirada_instrucoes ? (
              <Cartao className="p-5">
                <h2 className="flex items-center gap-2 text-base font-bold text-graf-950">
                  <PackageCheck className="size-4.5 text-jb-600" aria-hidden />
                  Retirada no local
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-graf-600">
                  {s.retirada_instrucoes}
                </p>
              </Cartao>
            ) : null}
          </div>
        }
      >
        <div className="space-y-8">
          {/* Quando existe página de CMS com o slug "contato", o texto dela
              entra antes do formulário — a rota fixa é só o esqueleto. */}
          <CorpoCms html={pagina?.body ?? ""} />

          <div>
            <h2 className="text-xl font-bold text-graf-950">Envie sua mensagem</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-graf-600">
              Os campos marcados com asterisco são obrigatórios. Nada é publicado no site:
              a mensagem vai direto para a equipe da JB.
            </p>
            <div className="mt-6">
              <FormularioContato />
            </div>
          </div>
        </div>
      </MolduraInstitucional>

      <section id="mapa" className="container-jb scroll-mt-24 pb-14 lg:pb-20">
        <h2 className="flex items-center gap-2 text-xl font-bold text-graf-950">
          <MapPin className="size-5 text-jb-600" aria-hidden />
          Onde a JB fica
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-graf-600">
          {s.horario
            ? `Atendimento presencial ${s.horario.charAt(0).toLowerCase()}${s.horario.slice(1)}.`
            : "Visitas com hora marcada."}{" "}
          {aceitaRetirada
            ? "A retirada de equipamento é feita neste endereço, com agendamento."
            : null}
        </p>

        <MapaDaUnidade
          className="mt-6"
          src={s.maps_embed}
          endereco={endereco}
          titulo={`Mapa com a localização da ${s.empresa_nome}`}
        />
      </section>
    </>
  );
}
