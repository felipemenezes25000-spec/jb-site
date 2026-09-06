import { describe, expect, it } from "vitest";

import {
  decidirCategoria,
  decidirMigracao,
  hashDeCorpo,
  MARCA_MANUAL,
  md5DeTexto,
  type PaginaAtual,
} from "@/lib/conteudo/migracao";

import { CONTEUDO_CATEGORIAS } from "../../scripts/conteudo-categorias";
import { CONTEUDO_INSTITUCIONAL } from "../../scripts/conteudo-institucional";

/* ============================================================================
   Decisão da migração de conteúdo

   O que estes testes protegem é uma coisa só: que nenhuma execução do script
   apague texto que uma pessoa da JB escreveu no painel. O resto — idempotência
   e criação — é consequência da mesma regra.
   ============================================================================ */

const LEGADO = "<p>Texto herdado do site em PHP, com &ccedil;edilha errada.</p>";
const NOVO = "<h2>Comprar é só o começo</h2><p>Texto novo.</p>";

function pagina(parcial: Partial<PaginaAtual> = {}): PaginaAtual {
  return { slug: "sobre", body: LEGADO, systemHash: null, ...parcial };
}

describe("hashDeCorpo", () => {
  it("é estável para o mesmo conteúdo", () => {
    expect(hashDeCorpo(NOVO)).toBe(hashDeCorpo(NOVO));
  });

  it("ignora diferença de fim de linha entre editores", () => {
    expect(hashDeCorpo("<p>a</p>\r\n<p>b</p>")).toBe(hashDeCorpo("<p>a</p>\n<p>b</p>"));
  });

  it("ignora espaço nas pontas, mas não no miolo", () => {
    expect(hashDeCorpo("  <p>a</p>  ")).toBe(hashDeCorpo("<p>a</p>"));
    expect(hashDeCorpo("<p>a b</p>")).not.toBe(hashDeCorpo("<p>ab</p>"));
  });

  it("muda quando o conteúdo muda", () => {
    expect(hashDeCorpo(LEGADO)).not.toBe(hashDeCorpo(NOVO));
  });
});

describe("decidirMigracao", () => {
  it("cria a página que não existe", () => {
    const d = decidirMigracao(null, NOVO, "sobre");
    expect(d.acao).toBe("criar");
    expect(d.escreve).toBe(true);
    expect(d.guardaCopia).toBe(false);
  });

  it("substitui conteúdo legado e guarda cópia antes", () => {
    const d = decidirMigracao(pagina(), NOVO, "sobre");
    expect(d.acao).toBe("substituir-legado");
    expect(d.escreve).toBe(true);
    expect(d.guardaCopia).toBe(true);
  });

  it("não guarda cópia de página vazia — não há o que preservar", () => {
    const d = decidirMigracao(pagina({ body: "   " }), NOVO, "sobre");
    expect(d.acao).toBe("substituir-legado");
    expect(d.escreve).toBe(true);
    expect(d.guardaCopia).toBe(false);
  });

  it("é idempotente: a segunda execução não escreve", () => {
    const jaMigrada = pagina({ body: NOVO, systemHash: hashDeCorpo(NOVO) });
    const d = decidirMigracao(jaMigrada, NOVO, "sobre");
    expect(d.acao).toBe("em-dia");
    expect(d.escreve).toBe(false);
  });

  it("é idempotente mesmo se o systemHash tiver ficado para trás", () => {
    // Corpo já é o alvo, mas o carimbo é de uma migração anterior. Escrever de
    // novo só produziria uma revisão inútil.
    const d = decidirMigracao(pagina({ body: NOVO, systemHash: "hash-antigo" }), NOVO, "sobre");
    expect(d.acao).toBe("em-dia");
    expect(d.escreve).toBe(false);
  });

  it("NÃO sobrescreve página editada por humano depois da migração", () => {
    const editada = pagina({
      body: "<p>A equipe reescreveu isto no painel.</p>",
      systemHash: hashDeCorpo(NOVO),
    });
    const d = decidirMigracao(editada, "<p>Conteúdo alvo diferente.</p>", "sobre");
    expect(d.acao).toBe("editada-por-humano");
    expect(d.escreve).toBe(false);
    expect(d.guardaCopia).toBe(false);
  });

  it("atualiza quando a página está exatamente como a migração anterior a deixou", () => {
    const intacta = pagina({ body: NOVO, systemHash: hashDeCorpo(NOVO) });
    const d = decidirMigracao(intacta, "<h2>Versão 2</h2>", "sobre");
    expect(d.acao).toBe("atualizar");
    expect(d.escreve).toBe(true);
    expect(d.guardaCopia).toBe(true);
  });

  it("NÃO sobrescreve página marcada como salva pelo painel", () => {
    // Página que nunca passou por migração mas foi escrita à mão: sem a marca,
    // ela seria confundida com conteúdo legado e apagada.
    const daEquipe = pagina({ body: "<p>Escrito pela equipe.</p>", systemHash: MARCA_MANUAL });
    const d = decidirMigracao(daEquipe, NOVO, "sobre");
    expect(d.acao).toBe("editada-por-humano");
    expect(d.escreve).toBe(false);
  });

  it("o hash alvo devolvido é o que deve ficar em systemHash", () => {
    const d = decidirMigracao(pagina(), NOVO, "sobre");
    expect(d.hashAlvo).toBe(hashDeCorpo(NOVO));
  });

  it("uma edição humana que por acaso resulta no conteúdo alvo não é conflito", () => {
    // Coincidência improvável, mas o resultado certo é "em dia": o que está
    // publicado é o que a migração publicaria.
    const d = decidirMigracao(pagina({ body: NOVO, systemHash: hashDeCorpo(LEGADO) }), NOVO, "sobre");
    expect(d.acao).toBe("em-dia");
    expect(d.escreve).toBe(false);
  });
});


/* ============================================================================
   Contrato entre o seed e a migração

   `prisma/seed.ts` cria Sobre e Estrutura a partir de
   `scripts/conteudo-institucional.ts` e grava `systemHash` na criação. Isso
   existe para que um ambiente novo (preview, máquina de alguém que acabou de
   clonar, banco efêmero da CI) nasça com o texto certo — antes ele nascia com
   o corpo herdado do site em PHP e só ficava correto se alguém lembrasse de
   rodar `pnpm conteudo:migrar` depois.

   O que estes testes seguram é o encaixe: nascer certo e a migração enxergar
   isso como "em dia". Se o seed voltar a gravar `systemHash` nulo, ou se o
   texto do arquivo de conteúdo divergir do que foi semeado, a decisão deixa de
   ser "em-dia" e um destes casos cai.
   ============================================================================ */

describe("ambiente novo nasce em dia", () => {
  it.each(CONTEUDO_INSTITUCIONAL.map((c) => [c.slug, c] as const))(
    "/%s semeada pelo seed não dá trabalho à migração",
    (slug, conteudo) => {
      // Exatamente o que o seed grava no `create`.
      const semeada: PaginaAtual = {
        slug,
        body: conteudo.body,
        systemHash: hashDeCorpo(conteudo.body),
      };

      const d = decidirMigracao(semeada, conteudo.body, slug);

      expect(d.acao).toBe("em-dia");
      expect(d.escreve).toBe(false);
      expect(d.guardaCopia).toBe(false);
    },
  );

  it("semear com systemHash nulo seria a regressão — e ela é visível", () => {
    // O estado anterior à correção: corpo certo, `systemHash` nulo. A migração
    // ainda escreveria, e este teste existe para que voltar atrás doa.
    const [primeira] = CONTEUDO_INSTITUCIONAL;
    const semHash: PaginaAtual = { slug: primeira.slug, body: primeira.body, systemHash: null };

    expect(decidirMigracao(semHash, primeira.body, primeira.slug).acao).toBe("em-dia");

    const comLegado: PaginaAtual = { slug: primeira.slug, body: LEGADO, systemHash: null };
    expect(decidirMigracao(comLegado, primeira.body, primeira.slug).acao).toBe(
      "substituir-legado",
    );
  });
});

describe("conteúdo institucional publicado", () => {
  // Os termos que a migração existe para tirar do ar. Se um deles reaparecer no
  // arquivo de conteúdo, ele volta ao site — e agora também ao seed.
  const PROIBIDOS = [
    "auto claves",
    "referencia",
    "responsavel",
    "renomados",
    "vai de encontro",
    "Gerencia",
    "100% de qualidade",
    "Missão",
    "Visão",
    "altamente preparados",
  ];

  it.each(CONTEUDO_INSTITUCIONAL.map((c) => [c.slug, c] as const))(
    "/%s não carrega nenhum termo do texto legado",
    (_slug, conteudo) => {
      const texto = `${conteudo.title} ${conteudo.lead} ${conteudo.body}`;
      for (const termo of PROIBIDOS) {
        expect(texto).not.toContain(termo);
      }
    },
  );

  it("nenhuma descrição de categoria repete o texto que ela corrige", () => {
    // A trava da migração em `Category` é o MD5 do legado. Descrição nova igual
    // à legada seria uma correção que não corrige nada.
    for (const categoria of CONTEUDO_CATEGORIAS) {
      expect(categoria.description.trim().length).toBeGreaterThan(0);
      expect(categoria.description).not.toContain("Auto claves");
      expect(categoria.description).not.toContain("ultrasônica");
      expect(categoria.description).not.toContain("style=");
    }
  });
});

/* ============================================================================
   Descrição de categoria

   O caso que motivou estes testes: as seis categorias do banco de preview
   estavam com `description` vazia, e a migração as reportava como "alguém
   editou. Ignorada." — recusando-se a preencher texto público que ninguém
   havia escrito, com um motivo que não era verdade.

   Vazio é ausência, não autoria. O resto da regra continua conservador.
   ============================================================================ */

const LEGADO_CAT = '<span style="color: #fd0003;">&bull;</span> Auto claves';
const NOVA_CAT = "<ul>\n<li>Autoclaves</li>\n</ul>";

const alvoCat = {
  slug: "bioseguranca",
  description: NOVA_CAT,
  md5Legado: md5DeTexto(LEGADO_CAT),
};

describe("decidirCategoria", () => {
  it("preenche descrição vazia — vazio não é edição humana", () => {
    const d = decidirCategoria("", alvoCat);
    expect(d.acao).toBe("preencher-vazia");
    expect(d.escreve).toBe(true);
    // Nada a preservar: cópia de vazio seria ruído no arquivo de backup.
    expect(d.guardaCopia).toBe(false);
  });

  it("trata só espaço em branco como vazio", () => {
    expect(decidirCategoria("   \n  ", alvoCat).acao).toBe("preencher-vazia");
  });

  it("trata null como vazio", () => {
    expect(decidirCategoria(null, alvoCat).acao).toBe("preencher-vazia");
  });

  it("substitui o texto legado, guardando cópia", () => {
    const d = decidirCategoria(LEGADO_CAT, alvoCat);
    expect(d.acao).toBe("substituir-legado");
    expect(d.escreve).toBe(true);
    expect(d.guardaCopia).toBe(true);
  });

  it("não toca em descrição escrita por gente", () => {
    const d = decidirCategoria("<p>Texto que a equipe escreveu no painel.</p>", alvoCat);
    expect(d.acao).toBe("editada-por-humano");
    expect(d.escreve).toBe(false);
  });

  it("é idempotente: rodar de novo não reescreve", () => {
    const d = decidirCategoria(NOVA_CAT, alvoCat);
    expect(d.acao).toBe("em-dia");
    expect(d.escreve).toBe(false);
  });

  it("descrição vazia vence a comparação com legado vazio", () => {
    // Se algum dia o legado registrado for a string vazia, "em-dia" tem de
    // ganhar de "preencher-vazia" — senão a migração escreveria em laço.
    const alvoVazio = { slug: "x", description: "", md5Legado: md5DeTexto("") };
    expect(decidirCategoria("", alvoVazio).acao).toBe("em-dia");
  });
});
