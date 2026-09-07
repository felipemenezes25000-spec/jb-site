# Origem das imagens

Este arquivo existe para que ninguém precise adivinhar de onde veio uma foto —
nem para trocá-la, nem para responder a quem perguntar.

## Fotografia de ambiente

| Arquivo | Origem | Licença |
|---|---|---|
| `hero/ambiente-clinica.webp` | Unsplash — foto `e7MJLM5VGjY`, de Benyamin Bohlouli (<https://unsplash.com/photos/e7MJLM5VGjY>) | [Unsplash License](https://unsplash.com/license) — uso comercial liberado, sem exigência de atribuição |
| `../demo/ultrassom.webp` | Pexels — foto `31188652` (<https://www.pexels.com/photo/31188652/>) | [Pexels License](https://www.pexels.com/license/) — uso comercial liberado, sem exigência de atribuição |

Recorte em retrato (640×1600), dessaturada e clareada para conviver com o
vermelho da marca. Ela aparece atrás do hero a 34% de opacidade e desfocada: é
textura de fundo, **não** é foto da estrutura da JB. As fotos reais da empresa
ficam em /estrutura e vêm do painel.

## Foto de produto — o que foi trocado e o que não foi

`demo/ultrassom.webp` passou a ser uma foto de estúdio de ultrassom
odontológico em fundo branco, 2200×2200, recortada em quadrado a partir de um
original de 6048×4024. Ela substitui um recorte de 840px com halo.

As outras quatro (`autoclave`, `compressor`, `bomba-vacuo`, `aspirador`)
continuam sendo as fotos dos equipamentos que a JB anuncia — e é de propósito.
Os bancos de licença livre não têm autoclave de bancada, compressor
odontológico nem bomba de vácuo em ensaio de estúdio: o que existe é (a) a
máquina de um concorrente fotografada numa clínica, com a marca dele legível no
painel, ou (b) compressor industrial em oficina. As duas opções são piores do
que a foto certa — a primeira anuncia a marca errada na página, a segunda
anuncia outro tipo de máquina.

O que essas quatro ganharam foi resolução e uma limpeza parcial:
`scripts/limpar-fotos-demo.mjs` esmaece o halo do recorte e reamostra de 840
para 2200px (lanczos + máscara de nitidez fraca). Ampliar não cria detalhe, mas
evita que o navegador estique 840px num palco de ~1050px com o filtro barato
dele.

**Parcial é a palavra.** O arquivo original traz dois defeitos: um "X" diagonal
claro atravessando o quadro e um fantasma escuro colado na silhueta. O X sai por
completo. O fantasma não — ele encosta no contorno do equipamento e vive na
mesma faixa de luminância que ele, então separar os dois exigiria um algoritmo
de matting de verdade. O que a ferramenta faz é rebaixá-lo até virar sombra
suave. O cabeçalho do script registra os três caminhos que foram tentados e por
que cada um falhou, para ninguém repetir.

Isso é remendo, não conserto. O conserto é a JB mandar a foto.

## O que NÃO pode virar banco de imagens

**Foto de produto.** A imagem de um equipamento à venda tem de ser daquele
equipamento. Trocar a foto de uma autoclave ALT 12L pela de outra autoclave
qualquer faz a página anunciar coisa diferente da que será entregue — e oferta
veiculada vincula quem anuncia (CDC, art. 30 e 35). Em seminovo é pior ainda: a
página promete "você receberá exatamente esta unidade".

**Foto da estrutura da JB.** Recepção, bancada e equipe são o que são. Foto de
banco no lugar delas é afirmação falsa sobre a empresa.

Nos dois casos o caminho é a JB enviar o arquivo. Resoluções que o site
aproveita hoje:

| Onde | Mínimo | Ideal |
|---|---|---|
| Foto de produto (galeria da ficha) | 1600 × 1600 | 2400 × 2400 |
| Foto de unidade seminova | 1600 × 1200 | 2400 × 1800 |
| Logotipo de marca | 600 px de largura | vetor (SVG) ou PNG 1200 px |
| Ilustração do rodapé / próximo passo | 2× do tamanho exibido | — |
