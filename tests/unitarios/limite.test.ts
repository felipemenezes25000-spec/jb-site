import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  LIMITE_CONTATO,
  LIMITE_RECUPERACAO,
  chaveDeEmail,
  chaveDeIp,
  checarFormulario,
  checarLimite,
  esquecerLimite,
  limparLimites,
  mensagemDeEspera,
  registrarUso,
  segundosDeEspera,
  usosNaJanela,
} from "@/lib/limite";

/* ==========================================================================
   Limite de taxa

   O módulo é pura decisão sobre um mapa em memória: nada de banco, nada de
   rede. O que precisa ser verdade:

   1. a janela é deslizante — o que saiu dela deixa de contar, e o que entrou
      conta a partir do próprio instante;
   2. recusa não grava. Se gravasse, quem está martelando o formulário
      renovaria o próprio castigo a cada tentativa e `esperaMs` viraria
      mentira;
   3. IP e e-mail são chaves independentes: uma nunca gasta o limite da outra;
   4. a limpeza (`esquecerLimite`, `limparLimites`) devolve a chave ao zero.

   O relógio é falso para que a janela possa ser atravessada sem esperar
   quinze minutos de verdade. `setSystemTime` mexe em `Date.now()`, que é o
   único relógio que o módulo consulta.
   ========================================================================== */

const AGORA = new Date("2026-03-10T09:00:00-03:00").getTime();
const OPCOES = { limite: 3, janelaMs: 60_000 };

function avancar(ms: number) {
  vi.setSystemTime(new Date(Date.now() + ms));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(AGORA));
  limparLimites();
});

afterEach(() => {
  limparLimites();
  vi.useRealTimers();
});

describe("checarLimite", () => {
  it("aceita até o teto e recusa a passagem seguinte", () => {
    expect(checarLimite("t", OPCOES)).toMatchObject({ ok: true, restante: 2, esperaMs: 0 });
    expect(checarLimite("t", OPCOES)).toMatchObject({ ok: true, restante: 1 });
    expect(checarLimite("t", OPCOES)).toMatchObject({ ok: true, restante: 0 });

    const quarta = checarLimite("t", OPCOES);
    expect(quarta.ok).toBe(false);
    expect(quarta.restante).toBe(0);
    expect(quarta.esperaMs).toBeGreaterThan(0);
  });

  it("libera de novo quando a marca mais antiga sai da janela", () => {
    checarLimite("t", OPCOES);
    avancar(30_000);
    checarLimite("t", OPCOES);
    checarLimite("t", OPCOES);
    expect(checarLimite("t", OPCOES).ok).toBe(false);

    // 31s depois a primeira marca (feita em t=0) completa 61s e sai da janela
    avancar(31_000);
    expect(checarLimite("t", OPCOES).ok).toBe(true);

    // as outras três ainda estão dentro: a vaga era uma só
    expect(checarLimite("t", OPCOES).ok).toBe(false);
  });

  it("a janela é deslizante, não um balde que zera no relógio", () => {
    for (let i = 0; i < 3; i += 1) checarLimite("t", OPCOES);

    // quase no fim da janela ainda está bloqueado
    avancar(59_000);
    expect(checarLimite("t", OPCOES).ok).toBe(false);

    // só depois de a janela inteira passar as três marcas saem juntas
    avancar(2_000);
    expect(checarLimite("t", OPCOES)).toMatchObject({ ok: true, restante: 2 });
  });

  it("recusa não renova o castigo nem empurra a espera para frente", () => {
    for (let i = 0; i < 3; i += 1) checarLimite("t", OPCOES);

    const primeiraRecusa = checarLimite("t", OPCOES);
    avancar(10_000);
    const segundaRecusa = checarLimite("t", OPCOES);

    // dez segundos se passaram: a espera tem de ter encolhido dez segundos
    expect(segundaRecusa.esperaMs).toBe(primeiraRecusa.esperaMs - 10_000);

    avancar(51_000);
    expect(checarLimite("t", OPCOES).ok).toBe(true);
  });

  it("teto e janela inválidos não abrem a porta", () => {
    expect(checarLimite("zero", { limite: 0, janelaMs: 60_000 }).ok).toBe(true);
    expect(checarLimite("zero", { limite: 0, janelaMs: 60_000 }).ok).toBe(false);
  });
});

describe("chaves", () => {
  it("IP e e-mail são chaves diferentes e não se contaminam", () => {
    const porIp = chaveDeIp("203.0.113.7", "/contato");
    const porEmail = chaveDeEmail("ana@clinica.com.br", "/contato");

    expect(porIp).toBe("/contato:ip:203.0.113.7");
    expect(porEmail).toBe("/contato:email:ana@clinica.com.br");
    expect(porIp).not.toBe(porEmail);

    for (let i = 0; i < 3; i += 1) checarLimite(porIp, OPCOES);
    expect(checarLimite(porIp, OPCOES).ok).toBe(false);
    // o e-mail continua com a janela dele intacta
    expect(checarLimite(porEmail, OPCOES).ok).toBe(true);
  });

  it("a rota separa formulários: contato não gasta o limite da recuperação", () => {
    const ip = "203.0.113.7";
    for (let i = 0; i < 3; i += 1) checarLimite(chaveDeIp(ip, "/contato"), OPCOES);

    expect(checarLimite(chaveDeIp(ip, "/contato"), OPCOES).ok).toBe(false);
    expect(checarLimite(chaveDeIp(ip, "/recuperar-senha"), OPCOES).ok).toBe(true);
  });

  it("sem IP conhecido a chave não some — vira 'desconhecido'", () => {
    expect(chaveDeIp("", "/contato")).toBe("/contato:ip:desconhecido");
  });

  it("a chave normaliza caixa alta, para o mesmo e-mail não virar duas chaves", () => {
    expect(chaveDeEmail("Ana@Clinica.com.BR", "/contato")).toBe(
      chaveDeEmail("ana@clinica.com.br", "/contato"),
    );
  });
});

describe("limpeza", () => {
  it("esquecerLimite zera só a chave pedida", () => {
    for (let i = 0; i < 3; i += 1) checarLimite("a", OPCOES);
    for (let i = 0; i < 3; i += 1) checarLimite("b", OPCOES);

    esquecerLimite("a");

    expect(checarLimite("a", OPCOES)).toMatchObject({ ok: true, restante: 2 });
    expect(checarLimite("b", OPCOES).ok).toBe(false);
  });

  it("limparLimites apaga tudo", () => {
    for (let i = 0; i < 3; i += 1) checarLimite("a", OPCOES);
    for (let i = 0; i < 3; i += 1) checarLimite("b", OPCOES);

    limparLimites();

    expect(checarLimite("a", OPCOES).ok).toBe(true);
    expect(checarLimite("b", OPCOES).ok).toBe(true);
    expect(usosNaJanela("a", OPCOES.janelaMs)).toBe(1);
  });
});

describe("consulta e registro separados", () => {
  it("consultar não conta; registrar conta", () => {
    expect(usosNaJanela("t", 60_000)).toBe(0);
    expect(usosNaJanela("t", 60_000)).toBe(0);

    registrarUso("t", 60_000);
    registrarUso("t", 60_000);

    expect(usosNaJanela("t", 60_000)).toBe(2);
  });

  it("o que saiu da janela deixa de ser contado", () => {
    registrarUso("t", 60_000);
    avancar(61_000);
    expect(usosNaJanela("t", 60_000)).toBe(0);
  });
});

describe("checarFormulario", () => {
  it("recusa pelo IP e diz que foi o IP", () => {
    // e-mails diferentes a cada envio: quem satura é o endereço de rede, como
    // acontece numa clínica inteira atrás do mesmo IP
    const ip = "203.0.113.7";

    for (let i = 0; i < LIMITE_CONTATO.porIp.limite; i += 1) {
      expect(checarFormulario("/contato", { ip, email: `pessoa${i}@clinica.com.br` }, LIMITE_CONTATO).ok).toBe(
        true,
      );
    }

    const recusa = checarFormulario("/contato", { ip, email: "outra@clinica.com.br" }, LIMITE_CONTATO);
    expect(recusa).toMatchObject({ ok: false, origem: "ip" });
  });

  it("recusa pelo e-mail quando o IP muda mas a caixa é a mesma", () => {
    const email = "ana@clinica.com.br";

    for (let i = 0; i < LIMITE_CONTATO.porEmail.limite; i += 1) {
      expect(checarFormulario("/contato", { ip: `198.51.100.${i}`, email }, LIMITE_CONTATO).ok).toBe(
        true,
      );
    }

    const recusa = checarFormulario("/contato", { ip: "198.51.100.9", email }, LIMITE_CONTATO);
    expect(recusa).toMatchObject({ ok: false, origem: "email" });
  });

  it("IP recusado não queima o limite do e-mail", () => {
    const ip = "203.0.113.7";
    const email = "ana@clinica.com.br";

    for (let i = 0; i < LIMITE_RECUPERACAO.porIp.limite + 3; i += 1) {
      checarFormulario("/recuperar-senha", { ip, email }, LIMITE_RECUPERACAO);
    }

    // o e-mail só foi contado nas passagens que o IP deixou passar
    expect(usosNaJanela(chaveDeEmail(email, "/recuperar-senha"), LIMITE_RECUPERACAO.porEmail.janelaMs)).toBe(
      LIMITE_RECUPERACAO.porEmail.limite,
    );
  });

  it("sem e-mail informado, decide só pelo IP", () => {
    const resultado = checarFormulario("/contato", { ip: "203.0.113.7" }, LIMITE_CONTATO);
    expect(resultado).toMatchObject({ ok: true, origem: "ip" });
  });
});

describe("mensagem de espera", () => {
  it("arredonda para cima e nunca promete 'zero segundo'", () => {
    expect(segundosDeEspera(1)).toBe(1);
    expect(segundosDeEspera(1_200)).toBe(2);
    expect(mensagemDeEspera(4_000)).toBe("Tente de novo em 4 segundos.");
    expect(mensagemDeEspera(60_000)).toBe("Tente de novo em 1 minuto.");
    expect(mensagemDeEspera(10 * 60_000)).toBe("Tente de novo em 10 minutos.");
  });
});
