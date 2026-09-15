import { describe, expect, it } from "vitest";

import { sanitizarDestino } from "@/lib/seguranca";

/* ============================================================================
   Caminho de volta depois de autenticar

   Havia três filtros de redirecionamento no projeto, com regras ligeiramente
   diferentes, e o mais rigoroso — este — era o único que ninguém chamava. As
   telas de entrar e cadastrar usavam uma versão que só olhava `/` e `//`, e
   deixava passar `/\evil.com` e caracteres de controle para dentro de um
   `href`.

   Agora as três pontas chamam esta função. O que estes testes seguram é o
   contrato dela: nada que saia do site, nada que quebre um cabeçalho, e uma
   resposta previsível para o chamador — nunca `null`.

   O caso `/\` merece nome próprio: navegador e Windows normalizam contrabarra
   para barra, então `/\evil.com` chega ao usuário como `//evil.com`, que é
   URL absoluta. É redirecionamento aberto escrito de outro jeito.
   ============================================================================ */

describe("sanitizarDestino — o que passa", () => {
  it.each([
    "/checkout",
    "/loja/demo-autoclave-horizontal-21l",
    "/minha-jb/pedidos",
    "/busca?q=autoclave&pagina=2",
    "/pedido/JB-2026-0001#pagamento",
    "/categoria/biosseguran%C3%A7a",
  ])("aceita o caminho interno %s", (caminho) => {
    expect(sanitizarDestino(caminho)).toBe(caminho);
  });

  it("tira o espaço em volta antes de decidir", () => {
    expect(sanitizarDestino("  /checkout  ")).toBe("/checkout");
  });
});

describe("sanitizarDestino — o que não passa", () => {
  it.each([
    ["URL absoluta", "https://site-falso.example/roubo"],
    ["sem esquema, com duas barras", "//site-falso.example"],
    ["contrabarra depois da barra", "/\\site-falso.example"],
    ["contrabarra no meio", "/loja/\\\\site-falso.example"],
    ["javascript:", "javascript:alert(1)"],
    ["data:", "data:text/html,<script>alert(1)</script>"],
    ["caminho relativo", "loja/produto"],
    ["vazio", ""],
    ["só espaço", "   "],
  ])("recusa %s", (_rotulo, entrada) => {
    expect(sanitizarDestino(entrada)).toBe("/");
  });

  it("recusa quebra de linha, que injetaria cabeçalho Location", () => {
    expect(sanitizarDestino("/checkout\r\nLocation: https://site-falso.example")).toBe("/");
    expect(sanitizarDestino("/checkout\nSet-Cookie: sessao=1")).toBe("/");
  });

  it("recusa espaço e caractere de controle no meio do caminho", () => {
    /* Caminho legítimo traz `%20`. Espaço cru só aparece em valor colado à
       mão — e o filtro que este substituiu já barrava `<= 32`. Escrito com
       escapes de propósito: byte de controle literal em arquivo-fonte é
       exatamente o tipo de coisa que passa despercebida numa revisão. */
    expect(sanitizarDestino("/che ckout")).toBe("/");
    expect(sanitizarDestino("/che\tckout")).toBe("/");
    expect(sanitizarDestino("/che\u0000ckout")).toBe("/");
    expect(sanitizarDestino("/checkout\u007f")).toBe("/");
  });

  it("recusa o que nem string é", () => {
    expect(sanitizarDestino(undefined)).toBe("/");
    expect(sanitizarDestino(null)).toBe("/");
    expect(sanitizarDestino(42)).toBe("/");
    expect(sanitizarDestino(["/checkout"])).toBe("/");
    expect(sanitizarDestino({ toString: () => "/checkout" })).toBe("/");
  });
});

describe("sanitizarDestino — o padrão do chamador", () => {
  it('devolve o padrão pedido, e não "/", quando a entrada não serve', () => {
    expect(sanitizarDestino("https://site-falso.example", "/minha-jb")).toBe("/minha-jb");
  });

  it('aceita "" como padrão, para quem quer distinguir ausência', () => {
    expect(sanitizarDestino(undefined, "")).toBe("");
    expect(sanitizarDestino("//site-falso.example", "")).toBe("");
  });

  it("nunca devolve null nem undefined", () => {
    for (const entrada of [undefined, null, "", "  ", "http://x", 0, false]) {
      expect(typeof sanitizarDestino(entrada)).toBe("string");
    }
  });
});
