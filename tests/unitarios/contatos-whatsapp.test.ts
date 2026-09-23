import { describe, expect, it } from "vitest";

import { contatosWhatsapp, saudarPeloNome } from "@/lib/contatos-whatsapp";
import { MENSAGEM_PADRAO } from "@/lib/diagnostico";
import { SETTING_DEFAULTS } from "@/lib/settings";

const base = {
  whatsapp: "(11) 96341-7994",
  whatsapp_nome: "Jeferson",
  whatsapp_alternativo: "(11) 98603-8421",
  whatsapp_alternativo_nome: "Jackson",
};

describe("contatosWhatsapp", () => {
  it("traz os dois, principal primeiro, com o nome de quem atende", () => {
    expect(contatosWhatsapp(base)).toEqual([
      { numero: "(11) 96341-7994", nome: "Jeferson" },
      { numero: "(11) 98603-8421", nome: "Jackson" },
    ]);
  });

  it("os padrões são os WhatsApps do Jeferson e do Jackson", () => {
    expect(contatosWhatsapp(SETTING_DEFAULTS).map((c) => `${c.nome} ${c.numero}`)).toEqual([
      "Jeferson (11) 96341-7994",
      "Jackson (11) 98603-8421",
    ]);
  });

  it("segundo vazio ou igual ao primeiro não aparece", () => {
    expect(contatosWhatsapp({ ...base, whatsapp_alternativo: "" })).toHaveLength(1);
    expect(contatosWhatsapp({ ...base, whatsapp_alternativo: "11963417994" })).toHaveLength(1);
  });

  it("sem o principal, o segundo sobe sozinho", () => {
    expect(contatosWhatsapp({ ...base, whatsapp: "  " })).toEqual([
      { numero: "(11) 98603-8421", nome: "Jackson" },
    ]);
  });

  it("nome em branco vira contato só com número", () => {
    expect(contatosWhatsapp({ ...base, whatsapp_nome: "   " })[0].nome).toBe("");
  });
});

describe("saudarPeloNome", () => {
  it("troca o 'Olá, JB!' da mensagem pronta pelo nome", () => {
    expect(saudarPeloNome(MENSAGEM_PADRAO, "Jackson")).toMatch(/^Olá, Jackson! Vim pelo site/);
  });

  it("sem nome, a mensagem fica como está", () => {
    expect(saudarPeloNome(MENSAGEM_PADRAO, "")).toBe(MENSAGEM_PADRAO);
  });

  it("não mexe em mensagem que não começa com a saudação", () => {
    expect(saudarPeloNome("Preciso de ajuda. Olá, JB!", "Jackson")).toBe("Preciso de ajuda. Olá, JB!");
  });
});
