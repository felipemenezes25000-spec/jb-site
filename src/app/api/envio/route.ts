import crypto from "node:crypto";

import { headers } from "next/headers";

import {
  contarDaSessao,
  LIMITES_DO_VISITANTE,
  LIMITE_ABSOLUTO_VISITANTE,
  prazoDeExpiracao,
  sessaoDeEnvio,
  type EspecieDeMidia,
} from "@/lib/envio-temporario";
import { detectarTipo, duracaoDeVideo } from "@/lib/midia-real";
import { prisma } from "@/lib/prisma";
import { ipDoPedido } from "@/lib/seguranca";
import { guardarPrivado } from "@/lib/upload";

/*
 * Sem `use cache` e sem configuração de segmento: com Cache Components, buscar
 * dado é dinâmico por padrão. Esta rota lê cookie e escreve arquivo — ela nunca
 * seria cacheável.
 */

/* ============================================================================
   Envio de mídia por visitante

   A rota `/api/upload` exige sessão. Afrouxá-la para atender o visitante
   abriria um depósito de arquivos para qualquer um na internet — com URL
   pública, porque a pasta `chamados` do fallback local grava em
   `public/uploads`.

   Esta é a porta separada, e o que a torna segura não é o login que não
   existe, e sim quatro travas:

     1. **Escopo por sessão de envio.** Cookie httpOnly, opaco, gerado no
        servidor. O banco guarda só o hash. O arquivo pertence àquele
        navegador até um chamado reivindicá-lo.
     2. **Tipo real.** Os bytes decidem, não o `Content-Type` nem a extensão.
     3. **Prazo.** 24 horas. Quem não virou chamado é apagado pela limpeza.
     4. **Armazenamento privado.** Nunca `public/uploads`. Foto de defeito de
        clínica não é mídia de catálogo.
   ============================================================================ */

const RESPOSTA_GENERICA = "Não foi possível receber o arquivo. Tente de novo.";

/** Limite por origem, contado no banco — não num Map de instância. */
const LIMITE_POR_IP = 40;
const JANELA_IP_MS = 60 * 60 * 1000;

function erro(mensagem: string, status: number) {
  return Response.json({ erro: mensagem }, { status });
}

export async function POST(request: Request) {
  const tipoDoCorpo = request.headers.get("content-type") ?? "";
  if (!tipoDoCorpo.toLowerCase().startsWith("multipart/form-data")) {
    return erro("Envie o arquivo como multipart/form-data.", 415);
  }

  /* Recusa pelo cabeçalho antes de ler o corpo: sem isto, um envio de 2 GB
     seria inteiramente transferido antes de ser rejeitado. */
  const declarado = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declarado) && declarado > LIMITE_ABSOLUTO_VISITANTE + 64 * 1024) {
    return erro("Arquivo grande demais.", 413);
  }

  const ip = ipDoPedido(await headers());

  /* Freio por origem, contado no banco.
     Um `Map` em memória não estabelece cota global em serverless: cada
     instância conta a própria fatia, e o limite real vira o configurado vezes
     o número de instâncias quentes. O escopo é explícito sobre isso. */
  if (ip) {
    const recentes = await prisma.tempUpload.count({
      where: { ip, createdAt: { gte: new Date(Date.now() - JANELA_IP_MS) } },
    });
    if (recentes >= LIMITE_POR_IP) {
      return Response.json(
        { erro: "Muitos envios seguidos. Espere alguns minutos e tente de novo." },
        { status: 429, headers: { "Retry-After": "900" } },
      );
    }
  }

  const { hash: sessionHash } = await sessaoDeEnvio();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return erro("Não foi possível ler o envio.", 400);
  }

  const arquivo = form.get("arquivo");
  if (!(arquivo instanceof File)) return erro("Nenhum arquivo enviado.", 400);
  if (arquivo.size === 0) return erro("O arquivo chegou vazio. Tente enviar de novo.", 400);

  const bytes = Buffer.from(await arquivo.arrayBuffer());

  /* ------------------------------------------------ o que o arquivo É */

  const detectado = detectarTipo(bytes);
  if (detectado.especie === "desconhecido") {
    return erro(
      "Este arquivo não é uma foto nem um vídeo que a JB consiga abrir. Envie JPEG, PNG, " +
        "HEIC, MP4 ou MOV.",
      415,
    );
  }

  const especie: EspecieDeMidia = detectado.especie;
  const limite = LIMITES_DO_VISITANTE[especie];

  if (bytes.length > limite.bytes) {
    const mb = Math.round(limite.bytes / (1024 * 1024));
    return erro(
      especie === "foto"
        ? `Cada foto pode ter até ${mb} MB.`
        : `O vídeo pode ter até ${mb} MB.`,
      413,
    );
  }

  /* ---------------------------------------------------- duração do vídeo */

  let duracao: number | null = null;

  if (especie === "video") {
    const lida = duracaoDeVideo(bytes);

    /* Desconhecida é RECUSA, não aprovação. O escopo manda validar a duração
       por metadados extraídos com ferramenta confiável e não confiar no
       JavaScript do cliente; um vídeo cuja duração não dá para ler não passa
       por essa validação, e deixá-lo entrar seria pular a regra por omissão. */
    if (!lida.conhecida) {
      return erro(
        "Não foi possível conferir a duração deste vídeo. Grave em MP4 ou MOV, com até " +
          `${LIMITES_DO_VISITANTE.video.segundos} segundos.`,
        422,
      );
    }

    if (lida.segundos > LIMITES_DO_VISITANTE.video.segundos) {
      return erro(
        `O vídeo tem ${lida.segundos} segundos. O limite é ` +
          `${LIMITES_DO_VISITANTE.video.segundos} — grave um trecho mais curto do defeito.`,
        422,
      );
    }

    duracao = lida.segundos;
  }

  /* ------------------------------------------------------ quantidade */

  const contagem = await contarDaSessao(sessionHash);
  if (contagem[especie] >= limite.quantidade) {
    return erro(
      especie === "foto"
        ? `Você já enviou ${limite.quantidade} fotos. Remova uma para enviar outra.`
        : "Só é possível enviar um vídeo por chamado.",
      409,
    );
  }

  /* --------------------------------------------- limpeza de metadados */

  let paraGravar = bytes;
  let mimeFinal = detectado.mime;

  if (especie === "foto") {
    try {
      const sharp = (await import("sharp")).default;

      /*
       * Reencode remove EXIF inteiro — inclusive GPS.
       *
       * O escopo pede tirar a localização "quando possível sem prejudicar
       * evidência técnica". Reencodar não prejudica: o que importa numa foto
       * de defeito é o que aparece, não em que coordenada ela foi tirada. E
       * a coordenada é a casa ou a clínica de alguém.
       *
       * HEIC vira JPEG no caminho. É o formato padrão da câmera do iPhone e
       * quase nada além do iPhone o abre — converter é o que torna a foto
       * útil para quem vai olhar na bancada.
       */
      const saida = await sharp(bytes, { failOn: "none" })
        .rotate() // aplica a orientação do EXIF antes de descartá-lo
        .jpeg({ quality: 82 })
        .toBuffer();

      paraGravar = saida;
      mimeFinal = "image/jpeg";
    } catch (erroDeImagem) {
      /* Imagem corrompida, ou formato que o sharp desta instalação não abre.
         Recusar é melhor que guardar um arquivo que ninguém vai conseguir
         ver — e a mensagem diz o que fazer. */
      console.error("[envio] falha ao processar imagem", erroDeImagem);
      return erro(
        "Não foi possível abrir esta imagem. Ela pode estar corrompida ou o envio pode ter " +
          "sido interrompido. Tente enviar de novo.",
        422,
      );
    }
  }

  /* ------------------------------------------------------------ grava */

  const nome = `${crypto.randomBytes(16).toString("hex")}${especie === "foto" ? ".jpg" : ""}`;
  const pathname = `envio-temporario/${nome}`;

  try {
    const guardado = await guardarPrivado(pathname, paraGravar, mimeFinal);

    const registro = await prisma.tempUpload.create({
      data: {
        sessionHash,
        status: "pendente",
        storageKey: guardado.pathname,
        url: guardado.url,
        mime: mimeFinal,
        size: paraGravar.length,
        durationSeconds: duracao,
        kind: especie,
        ip,
        expiresAt: prazoDeExpiracao(),
      },
      select: { id: true, kind: true, mime: true, size: true, durationSeconds: true },
    });

    /* A URL NÃO volta para o navegador. Ela é caminho de armazenamento
       privado, e devolvê-la transformaria o id em link direto. O formulário
       precisa do id para remover e para mostrar a miniatura pela rota
       autorizada — nada além disso. */
    return Response.json({ ok: true, arquivo: registro }, { status: 201 });
  } catch (falha) {
    console.error("[envio] falha ao guardar", falha);
    return erro(RESPOSTA_GENERICA, 500);
  }
}

/* --------------------------------------------------------------- remoção */

/**
 * Remove um arquivo que a pessoa acabou de enviar.
 *
 * Só arquivos `pendente` da PRÓPRIA sessão. Um id de outra pessoa não é
 * alcançável nem sabendo o valor, e um arquivo já vinculado a um chamado não
 * é apagável por aqui — ele passou a pertencer ao atendimento.
 */
export async function DELETE(request: Request) {
  const { hash: sessionHash } = await sessaoDeEnvio();

  const url = new URL(request.url);
  const id = (url.searchParams.get("id") ?? "").trim();
  if (!id) return erro("Informe qual arquivo remover.", 400);

  const linha = await prisma.tempUpload.findFirst({
    where: { id, sessionHash, status: "pendente" },
    select: { id: true, url: true },
  });

  // mensagem única: quem não é dono não descobre se o arquivo existe
  if (!linha) return erro("Arquivo não encontrado.", 404);

  try {
    const { removerArquivo } = await import("@/lib/upload");
    if (linha.url) await removerArquivo(linha.url);
  } catch (falha) {
    console.error("[envio] falha ao remover arquivo", linha.id, falha);
  }

  await prisma.tempUpload.deleteMany({ where: { id: linha.id, status: "pendente" } });

  return Response.json({ ok: true });
}
