import { describe, expect, it } from "vitest";

import {
  decidirMigracao,
  hashDeCorpo,
  MARCA_MANUAL,
  type PaginaAtual,
} from "@/lib/conteudo/migracao";

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
