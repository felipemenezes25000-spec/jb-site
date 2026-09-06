# Leitura de etiqueta (OCR) — a decisão, e o que está pronto

**Nenhum mecanismo de OCR está configurado, e isso é uma escolha registrada.**
O caminho inteiro existe — captura, validação, interpretação, tela de
conferência, testes e limite de taxa. O que falta é uma decisão da JB sobre
provedor e custo.

O escopo prevê exatamente esta situação (§21.5) e diz o que fazer: implementar
contrato, adaptador, testes e fallback manual — e **não** fingir uma extração
com dado embutido chamando isso de OCR operante.

---

## As opções avaliadas

| Caminho | Por que não foi escolhido |
|---|---|
| **Tesseract em WebAssembly**, no navegador | Bundle de vários MB e leitura fraca em etiqueta metálica com reflexo — que é a etiqueta real de autoclave e compressor. O uso é celular na clínica, muitas vezes em 4G. |
| **Tesseract nativo** no servidor | Exige binário no host. A Vercel não o tem, e trocar de host pela funcionalidade menos crítica do escopo seria deixar a infraestrutura ser decidida pela cauda. |
| **Provedor de nuvem** (Google Vision, AWS Textract, Azure AI Vision) | É o que lê etiqueta metálica de verdade. Exige credencial que a JB não tem, custo por leitura que ninguém aprovou, e envio da foto do equipamento de uma clínica a um terceiro — o que precisa ser informado e autorizado antes. |

A recomendação, quando a JB decidir: **provedor de nuvem**. O caso de uso é
exatamente aquele em que OCR local perde — superfície metálica, reflexo, fonte
pequena, foto de celular sem tripé.

## O que já está pronto

- **Contrato** (`src/lib/ocr/tipos.ts`): `MecanismoDeOcr` recebe bytes e
  devolve linhas de texto. Nada além disso.
- **Adaptador** (`src/lib/ocr/index.ts`): valida tamanho, chama o mecanismo,
  trata exceção como `falha_do_provedor` e resposta fora do formato como
  `resposta_invalida`.
- **Interpretação** (`src/lib/ocr/interpretar.ts`): pura, 23 testes. Extrai
  marca, modelo, série e voltagem por rótulo; preserva o valor original;
  trata O/0, I/1, S/5 e B/8 como alternativas; recusa foto com duas etiquetas.
- **Ação** (`src/app/acoes/etiqueta.ts`): limite de 6 leituras por minuto,
  tipo real pelos bytes, e **nenhuma escrita no banco**. A foto é lida e
  descartada — não é armazenada.
- **Tela** (`src/components/conta/mj-leitor-etiqueta.tsx`): a frase do escopo
  ao pé da letra, campos editáveis, alternativas ambíguas como botões, e o
  aviso de que a leitura não determina defeito, segurança, originalidade nem
  garantia.
- **Integrada** ao cadastro de equipamento na Área da Clínica e ao pedido de
  assistência público.

## Como ligar, quando houver decisão

1. Escolher o provedor e aprovar o custo por leitura.
2. Criar a credencial e guardá-la como variável de ambiente.
3. Implementar o adaptador em `src/lib/ocr/`, exportando um objeto que
   satisfaça `MecanismoDeOcr`.
4. Fazer `mecanismoDeOcr()` devolvê-lo quando a credencial existir.
5. **Antes de ligar em produção:** decidir e escrever o que o usuário vê sobre
   o envio da foto a um terceiro. Hoje a tela diz que a foto é lida e
   descartada — com provedor externo, isso passa a ser "enviada para um
   serviço de leitura e descartada", e a diferença precisa estar na tela.

Nada mais muda. Interpretação, validação, limite, tela e testes já cobrem o
resto.

## As regras que valem com ou sem provedor

- **Texto extraído é dado, nunca instrução.** Ele vem de uma foto que qualquer
  pessoa pode ter tirado de qualquer coisa. É truncado (60 linhas, 200
  caracteres) e limpo de caracteres de controle antes de qualquer outro uso.
- **Confirmação antes de persistir.** `podeGravar` recusa sem confirmação
  explícita, e a tela não tem caminho que pule essa etapa.
- **Serial conferido pela equipe não é sobrescrito** por leitura de foto.
  Quando os dois divergem, quem decide é quem está com o aparelho.
- **Normalizar não apaga diferença.** O valor bruto viaja junto do limpo, e a
  tela mostra o original quando os dois divergem — "Vitale-21" e "Vitale 21"
  podem ser dois modelos.
- **Campo não encontrado fica vazio.** Não há heurística de "a linha mais
  comprida deve ser o modelo": palpite preenchido é palpite confirmado, porque
  quem confere clica em continuar.
- **A leitura identifica, não atesta.** Ela não diz se o equipamento tem
  defeito, se é seguro, se é original ou se está na garantia — e a frase está
  em código, exibida em toda leitura.

## Fixtures de teste

Sintéticas, em `tests/unitarios/ocr.test.ts`: etiqueta boa, desfocada,
incompleta, com caracteres ambíguos, com duas etiquetas no quadro, texto que
não é etiqueta, resposta com entrada nula, linha gigante e caractere de
controle. Os seis casos que o escopo pede estão cobertos.
