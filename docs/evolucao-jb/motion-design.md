# Motion Design — Plataforma JB

Este documento é a fonte de verdade para movimento na plataforma. Motion não é decoração: ele deve explicar hierarquia, continuidade, mudança de estado ou resposta de uma ação.

## Princípio

A assinatura da JB combina equipamento técnico físico com software moderno. A vitrine pode ter profundidade e presença; as superfícies operacionais devem ser rápidas e discretas.

A pergunta para qualquer animação nova é: **o usuário entende melhor o que mudou ou para onde olhar?** Se a resposta for não, a animação não entra.

## Intensidade por superfície

| Superfície | Intensidade | Regra |
| --- | --- | --- |
| Home | Alta, controlada | capítulos, profundidade, entradas cinematográficas e ambientação |
| Catálogo | Média | stagger da grade, resposta física de cards e filtros estáveis |
| PDP | Alta na apresentação, baixa na leitura | galeria contínua, planos de entrada, buybox estável e ficha técnica sóbria |
| Comparador | Média | layout animation para entrada/saída/reordenação e leitura das diferenças |
| Carrinho | Baixa | continuidade de quantidade, remoção, preço e subtotal |
| Checkout | Baixa | orientar etapa ativa e manter resumo/valores estáveis |
| Área da Clínica | Média funcional | KPI, status e timeline comunicam estado; sem efeitos decorativos persistentes |
| Admin | Mínima | drawers, modais, filtros e mudanças de tabela; prioridade total à operação |

## Tokens

Os tokens vivem em `src/app/motion.css`:

- `--jb-motion-fast`: resposta imediata de controles.
- `--jb-motion-base`: microinterações.
- `--jb-motion-slow`: reveal de conteúdo.
- `--jb-motion-cinematic`: entrada de grandes blocos públicos.
- `--jb-motion-ease`: desaceleração natural.
- `--jb-motion-ease-spring`: assentamento com sensação física sem bounce exagerado.

Não criar durações/easings ad hoc se um token já atende.

## Arquivos

- `src/components/ui/motion-cena.ts`: zona, cena e ponteiro gravados no `<html>`. Roda num `<script>` do `<head>` (antes da primeira pintura) e de novo a cada troca de rota.
- `src/components/ui/motion-system.tsx`: reveal por Web Animations, entrada de rota, aura e giro dos cartões.
- `src/app/motion.css`: fundação global e física dos elementos públicos.
- `src/app/motion-scenes.css`: direção de arte específica de catálogo, PDP e Área da Clínica.
- `src/app/motion-commerce.css`: carrinho, checkout e comparador.
- `src/app/motion-feedback.css`: feedbacks e toasts.

## Regras de implementação

1. Conteúdo essencial nunca nasce invisível no HTML. O servidor entrega a página utilizável; motion é progressive enhancement.
2. Preferir `transform` e `opacity`. Evitar animar `width`, `height`, `top` e `left` em fluxos frequentes.
3. Não transformar Server Components em Client Components apenas para animar.
4. Usar Motion React quando há entrada/saída/layout real que CSS não expressa bem; usar CSS para microinterações simples.
5. Um bloco não deve receber duas camadas de reveal simultâneas. `data-motion-chapter` é a unidade de coreografia da Home.
6. Não usar loop chamativo em CTA, preço, alerta, checkout ou dashboard.
7. Movimento de status deve preservar texto e semântica; cor nunca é a única informação.
8. Alterações de preço/frete devem manter números tabulares para evitar dança horizontal.
9. Não introduzir shared-element experimental enquanto a versão de React do projeto não oferecer API estável.
10. O motor não escreve atributo nem estilo em nó que o React renderizou. Seção em streaming chega antes de hidratar; atributo gravado nela reprova a hidratação. Reveal é `element.animate()`, giro é uma regra `:hover` numa folha adotada.
11. O repouso é o layout final. Não existe estado de espera com `transform`, `filter` ou `clip-path`: bloco fora da tela deslocado ou encolhido alarga a página e faz botão de 44px medir 43.
12. Entrada em um eixo só (vertical), só `opacity` e `translate`/`transform` de deslocamento. Sem escala, giro ou blur em bloco que contém controle.
13. Entrada de cena usa `fill: backwards` e keyframe sem `to`. `both` deixa a animação em efeito para sempre; em `<main>` ou em ancestral de `position: fixed`, prende um bloco de contenção e arrasta a barra fixa para fora da tela. Pelo mesmo motivo, nada de `perspective`, `filter` ou `transform` persistentes nesses ancestrais.
14. Entrada de cena em CSS depende da cena já estar no `<html>` na primeira pintura. Gravada depois (num efeito), a página pinta pronta e a animação arranca de `opacity: 0` por cima: é um piscar.
15. Revelar só o que ainda está fora da tela quando o observador avisa (margem inferior de 20%). O que já foi pintado não some para voltar.
16. Hover que desloca usa as propriedades individuais `translate`/`scale`/`rotate`, que somam ao `transform` do componente (o botão de fechar do Sonner é posicionado por `transform`). A caixa de compra não se move no hover.
17. Microinterações globais de controle ficam em `@layer base`: sem camada, venceriam toda utility do Tailwind (`duration-*`, `transition-none`).

## Mobile e performance

Touch/coarse pointer recebe uma versão mais barata da mesma linguagem visual:

- sem tilt de cards;
- sem aura de cursor;
- menos blur;
- deslocamentos menores;
- entradas mais curtas;
- sem scan da PDP;
- nenhuma animação depende de hover.

O motor suspende trabalho de ponteiro quando a aba fica oculta e não instala rastreamento de ponteiro fora das superfícies públicas que realmente usam o efeito.

## Movimento reduzido

`prefers-reduced-motion: reduce` é obrigatório em qualquer componente novo. Nesse modo:

- não há movimento espacial obrigatório;
- conteúdo permanece visível;
- feedback de estado continua existindo por texto, cor, ícone e/ou borda;
- animações decorativas e ambientais são removidas.

## QA antes de merge

Validar pelo menos:

- 390px, 768px, 1440px e 1920px;
- Home, Loja, uma PDP com múltiplas fotos, Comparador, Carrinho e Checkout;
- Área da Clínica com equipamentos/histórico;
- teclado e foco em modal da galeria;
- `prefers-reduced-motion`;
- ausência de scroll horizontal;
- ausência de CLS causado por motion;
- ações de carrinho/favorito/comparação durante animação;
- troca de imagem por botão, thumbnail, swipe e teclado no modal;
- cálculo de frete e mudança do total;
- E2E, acessibilidade e responsividade do workflow;
- `tests/e2e/26-motion-sistema.spec.ts`: cena antes da pintura, hidratação sem divergência, layout final fora da tela, reveal sem estilo preso, `<main>` sem transform após navegação, giro que some ao sair e movimento reduzido.

## Critério de corte

Se um efeito compete com o produto, preço, ficha técnica, status ou próxima ação, reduza ou remova. O movimento da JB deve parecer inevitável depois que existe — não algo colocado para demonstrar que o site sabe animar.
