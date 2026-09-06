import "server-only";

import QRCode from "qrcode";

/* ============================================================================
   Geração de QR

   Server-side, em SVG, embutido no HTML. Não há biblioteca de QR no bundle do
   navegador — a etiqueta é impressa, e nada nela precisa reagir a clique.

   Duas escolhas que a folha impressa cobra caro se estiverem erradas:

   - **Quiet zone de 4 módulos.** É o mínimo do padrão. Etiqueta impressa
     encostada na borda de um adesivo, sem margem branca, é lida por leitor de
     bancada e recusada pela câmera de celular — que é justamente quem vai
     usar esta.
   - **Correção de erro M.** A etiqueta vai para o lado de um equipamento que
     recebe respingo, álcool e mão suja. `L` é frágil demais para isso; `Q` e
     `H` engordam o símbolo e reduzem o tamanho de cada módulo no mesmo espaço
     de papel, o que piora a leitura de longe.
   ============================================================================ */

export const QUIET_ZONE_MODULOS = 4;

/**
 * O SVG de um QR, pronto para ser embutido.
 *
 * `width` é o lado em pixels do símbolo inteiro, quiet zone incluída. A
 * etiqueta usa 132 px a 96 dpi, que dá cerca de 35 mm — o menor tamanho em
 * que uma câmera de celular comum acerta na primeira tentativa a 20 cm.
 */
export async function svgDoQr(texto: string, lado = 132): Promise<string> {
  return QRCode.toString(texto, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: QUIET_ZONE_MODULOS,
    width: lado,
    color: {
      /* Preto sobre branco. Não há aqui a opção de usar a cor da marca: o
         contraste do QR é requisito de leitura, não decisão de identidade. */
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}
