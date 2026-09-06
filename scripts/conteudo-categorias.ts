/* ============================================================================
   Descrições de categoria — correção do texto herdado do site em PHP

   As seis categorias entraram na plataforma com a descrição copiada do site
   antigo: `<span style="color: #fd0003;">&bull;</span>` como marcador de
   lista, `&ccedil;` no lugar do "ç", cor fixa em HTML e erros de grafia. Esse
   texto aparece na home, na faixa "O que a JB vende e atende", e na página de
   cada categoria — é conteúdo público, lido antes de qualquer outra coisa
   sobre o catálogo.

   Correções de grafia aplicadas, todas verificáveis:

     Biosegurança          → Biossegurança      (grafia correta do termo)
     Auto claves           → Autoclaves         (palavra única)
     ultrasônica           → ultrassônica
     Câmera intra oral     → Câmera intraoral
     Bomba vácuo           → Bomba de vácuo
     Laser de baixa e alta potencia → ...potência
     escova de robson      → escova de Robson   (nome próprio)

   O que NÃO mudou: quais itens cada categoria lista. A lista é a definição
   comercial da JB e não cabe a esta migração reescrevê-la — só corrigir como
   ela está escrita e trocar HTML de espaçador por lista de verdade (`<ul>`),
   que é o que `.prose-jb` estiliza.

   A trava contra sobrescrever edição humana aqui é diferente da das páginas,
   porque `Category` não tem `systemHash`: a migração só escreve quando a
   descrição atual ainda é EXATAMENTE o texto legado, identificado pelo hash
   registrado abaixo. Qualquer edição no painel muda o hash e a linha passa a
   ser ignorada. É conservador de propósito — na dúvida, não mexe.
   ============================================================================ */

export type ConteudoDeCategoria = {
  slug: string;
  /** Nome corrigido; `null` quando o nome atual já está certo. */
  name: string | null;
  description: string;
  /** MD5 do texto legado que esta correção substitui. */
  md5Legado: string;
};

/** Lista simples, no formato que `.prose-jb` estiliza. */
function lista(itens: string[]) {
  return `<ul>\n${itens.map((item) => `<li>${item}</li>`).join("\n")}\n</ul>`;
}

export const CONTEUDO_CATEGORIAS: ConteudoDeCategoria[] = [
  {
    slug: "bioseguranca",
    name: "Biossegurança",
    md5Legado: "1d4497b51117b5fa5d6ceac742725a87",
    description: lista([
      "Autoclaves",
      "Cuba lavadora ultrassônica",
      "Seladora",
      "Destiladora de água",
    ]),
  },
  {
    slug: "profilaxia",
    name: null,
    md5Legado: "915f692be88e9418fbd3607b7e8ecc72",
    description: lista([
      "Jato de bicarbonato",
      "Ultrassom",
      "Contra-ângulo com escova de Robson",
    ]),
  },
  {
    slug: "cirurgia",
    name: null,
    md5Legado: "90bab397d176f595efa5cb8763d4516b",
    description: lista([
      "Câmera intraoral",
      "Bomba de vácuo",
      "Motor de implante",
      "Laser de baixa e alta potência",
    ]),
  },
  {
    slug: "estetica",
    name: null,
    md5Legado: "5cb2cc6de1ce30d3c63985ea502aa023",
    description: lista(["Fotopolimerizador", "Laser para clareamento"]),
  },
  {
    slug: "outros-perifericos",
    name: null,
    md5Legado: "9b03e650563df1ec506e054fc457194c",
    description: lista([
      "Motor de instrumentação rotatória",
      "Vibrador de gesso",
      "Solda a ponto",
      "Equipamentos para implante em geral",
    ]),
  },
  {
    slug: "unidade-basica-de-tratamento",
    name: null,
    md5Legado: "acb57bed83cde44a10146dd57828b379",
    description: lista([
      "Cadeira",
      "Equipo",
      "Cuspideira e sugadores",
      "Refletor",
      "Mocho",
      "Compressor",
      "Micromotores, peça reta e contra-ângulo",
      "Turbinas de alta e baixa rotação",
    ]),
  },
];
