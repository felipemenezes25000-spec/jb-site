# Marketplace clínico JB — especificação de design

**Data:** 2026-09-09  
**Status:** aprovado para planejamento  
**Direção:** marketplace clínico técnico, com alta conversão  
**Branch:** `plataforma`

## 1. Resumo

Redesenhar a jornada pública de descoberta e compra de equipamentos da JB para que ela funcione como um marketplace moderno, técnico e confiável. A experiência deve aumentar a densidade útil, reduzir rolagem desnecessária, facilitar comparação e concentrar as informações que determinam a compra perto da ação principal.

O desenho não deve copiar a aparência de marketplaces populares. A linguagem própria será baseada em precisão clínica: fotografias limpas, hierarquia forte, dados técnicos escaneáveis e vermelho JB usado como sinal de ação.

## 2. Escopo aprovado

O novo padrão será aplicado somente a:

- `/loja`;
- `/categoria/[slug]`;
- `/busca`;
- `/marcas/[slug]`;
- páginas de condição, incluindo novos, seminovos, usados, recondicionados e peças/acessórios;
- `/loja/[slug]`, a página pública do produto.

### Fora do escopo

- home e suas vitrines;
- cabeçalho e hero da home;
- Área da Clínica, favoritos e histórico do cliente;
- admin;
- carrinho, checkout e orçamento, salvo pelos links e dados que recebem da nova interface;
- mudanças de regra comercial, preço, estoque, frete, garantia ou serviço;
- avaliações, prova social ou escassez que não existam no banco.

A home precisa permanecer visual e funcionalmente idêntica. Os componentes de marketplace serão isolados dos componentes usados pela home.

## 3. Diagnóstico

Na auditoria da versão publicada em 1440 × 1000:

- `/loja` ocupou aproximadamente 3.668 px de altura;
- `/categoria/cirurgia` ocupou aproximadamente 2.043 px mesmo com poucos produtos;
- `/loja/motor-de-implante-35ncm` ocupou aproximadamente 8.463 px;
- não foram encontrados erros de console nas três rotas auditadas.

O problema não é falta de conteúdo. A página distribui conteúdo relevante em molduras, faixas e chamadas grandes demais. Nas coleções, o filtro lateral e os cards altos reduzem a quantidade de produtos visíveis. Em coleções curtas, espaços vazios e uma chamada de orçamento com dimensões de produto fazem a página parecer incompleta. No produto, preço, condições, laudo, instalação, suporte, ficha e confiança se repetem ou ficam separados por várias rolagens.

## 4. Objetivos

1. Mostrar mais produtos e mais informação útil por tela.
2. Permitir que o usuário rejeite ou selecione um item sem abrir várias páginas.
3. Colocar preço, parcelamento, disponibilidade, entrega, garantia e compra na primeira dobra do produto.
4. Preservar todo conteúdo técnico verdadeiro sem manter a página excessivamente longa.
5. Diferenciar claramente produto novo, seminovo, usado, recondicionado, indisponível e sob orçamento.
6. Tornar comparação, filtros e ordenação fáceis em desktop e celular.
7. Aumentar a força comercial sem criar urgência, avaliação ou benefícios falsos.
8. Preservar SEO, URLs, regras de carrinho, checkout, orçamento e estoque.

## 5. Princípios da experiência

### Informação antes de decoração

Cada elemento precisa ajudar a encontrar, comparar, confiar ou comprar. Superfícies, sombras, ícones e selos não serão usados apenas para preencher espaço.

### Conversão baseada em evidência

Preço, parcelamento, desconto real, disponibilidade real, garantia, entrega e assistência própria são os argumentos de conversão. Não serão usados contadores regressivos, avaliações fictícias ou escassez artificial.

### Conteúdo específico da categoria

Os cards devem exibir, quando cadastradas, até duas especificações decisivas do equipamento. Exemplos: torque, capacidade, voltagem, potência, faixa de rotação ou compatibilidade. A seleção precisa ser consistente dentro de cada categoria.

### Pouca fricção, não pouco conteúdo

Conteúdo técnico continuará disponível, mas será agrupado por decisão: entender o produto, conferir a unidade, verificar requisitos, calcular a compra e resolver dúvidas.

### Continuidade entre rotas

Loja, categoria, busca, marca e condição usarão a mesma anatomia, os mesmos controles e o mesmo card. O contexto da coleção muda; a forma de comprar não.

## 6. Arquitetura das listagens

### 6.1 Cabeçalho da coleção

O topo será compacto e terá:

- breadcrumb;
- título da coleção;
- descrição curta somente quando acrescentar contexto;
- quantidade real de resultados;
- atalhos relevantes para subcategorias ou condições.

Não haverá um hero grande nas páginas de coleção. A grade deve começar cedo.

### 6.2 Filtros promovidos

Logo abaixo do título, uma linha exibirá filtros de maior utilidade para o escopo atual, por exemplo:

- em estoque;
- condição;
- faixa de preço;
- marca;
- voltagem;
- botão “Todos os filtros”.

Esses atalhos não substituem o painel completo. Eles aceleram a primeira escolha e permanecem sincronizados com os parâmetros da URL.

### 6.3 Barra de resultados

A barra de resultados reunirá:

- contagem;
- busca dentro do contexto atual, quando aplicável;
- resumo de filtros aplicados;
- remoção individual ou total dos filtros;
- ordenação;
- abertura do painel completo.

Ela poderá permanecer visível durante parte da rolagem, sem cobrir o cabeçalho global nem ocupar altura excessiva.

### 6.4 Painel completo de filtros

O filtro lateral permanentemente aberto será substituído por um painel sob demanda, porque o catálogo atual não justifica sacrificar uma coluna inteira em todas as páginas.

- desktop: painel lateral sobreposto ou expansão controlada;
- mobile: gaveta de tela quase inteira;
- grupos com contagem coerente com a coleção e os filtros ativos;
- opção de buscar dentro de listas longas de marcas/categorias;
- ação clara de aplicar no celular;
- ação de limpar e contagem do resultado antes do fechamento.

Categorias, marcas, condições, voltagens, preço, estoque e vendidos preservam a lógica atual de URL e facetas.

### 6.5 Grade

- 1440 px ou mais: 4 colunas;
- aproximadamente 1024–1439 px: 3 colunas;
- tablet: 2 colunas;
- celular: 2 colunas quando houver largura suficiente;
- 320 px: 1 coluna.

O contêiner do marketplace poderá ser mais largo que o contêiner editorial existente, mas apenas dentro das rotas em escopo.

### 6.6 Card de marketplace

Ordem de leitura:

1. fotografia;
2. condição e desconto real;
3. marca;
4. nome e modelo;
5. até duas especificações decisivas;
6. preço ou “Sob orçamento”;
7. parcelamento ou explicação do orçamento;
8. disponibilidade;
9. ação principal;
10. comparação.

Comportamento:

- o card inteiro abre o produto;
- a ação visual principal será “Ver equipamento” ou “Pedir orçamento”, conforme a regra real;
- comparação terá área de clique própria e não acionará o link do card;
- imagem manterá proporção uniforme, `object-contain` e zoom discreto;
- indisponível continuará legível e não parecerá erro de carregamento;
- não haverá avaliação até existir uma fonte real de avaliações públicas;
- o card não adicionará diretamente ao carrinho, pois especificações, frete, unidade e serviços opcionais precisam ser verificados no produto.

### 6.7 Coleções curtas e vazias

Uma coleção com poucos itens não deve simular um card adicional. A chamada de orçamento será uma faixa compacta após a grade.

Estado vazio deve oferecer:

- explicação do que foi filtrado;
- remoção rápida dos filtros;
- retorno à coleção principal;
- orçamento como alternativa secundária.

### 6.8 Paginação e carregamento

- preservar paginação endereçável e indexável;
- preservar Suspense e esqueleto durante mudanças de filtro;
- o esqueleto deve ter a mesma geometria do novo card;
- mudança de página posiciona o usuário no início dos resultados, não no topo global.

## 7. Arquitetura da página do produto

### 7.1 Primeira dobra em desktop

A área principal será uma grade de três zonas:

1. galeria de imagens;
2. identidade e resumo técnico;
3. painel de compra.

Em aproximadamente 1440 px, a distribuição de referência será 5/3/4 colunas. Em larguras intermediárias, identidade e compra podem formar uma única coluna ao lado da galeria.

### 7.2 Galeria

- imagem principal grande, sem corte;
- miniaturas visíveis;
- zoom acessível por clique e teclado;
- indicação clara de mais imagens;
- fotos da unidade real priorizadas em seminovos/usados;
- imagens de checklist, detalhe e escala quando disponíveis;
- sem biblioteca pesada de carrossel.

### 7.3 Identidade e resumo técnico

Exibir antes da compra:

- condição;
- marca;
- nome;
- modelo e identificador público quando apropriado;
- descrição curta;
- até quatro destaques verificáveis, como torque, capacidade, voltagem, garantia e registro ANVISA;
- sinalização especial para unidade inspecionada.

O SKU interno não será usado como prova comercial quando não fizer sentido para o cliente.

### 7.4 Painel de compra

Ordem:

1. disponibilidade real;
2. preço anterior e desconto, somente quando válidos;
3. preço;
4. parcelamento;
5. cálculo/estimativa de entrega por CEP;
6. quantidade quando aplicável;
7. escolha entre somente equipamento e pacote de serviços;
8. total quando houver quantidade ou adicionais;
9. “Comprar agora”;
10. “Adicionar ao carrinho”;
11. “Pedir orçamento”, quando permitido;
12. resumo curto de garantia, entrega e compra segura.

Produtos sob orçamento terão texto e ação próprios. Produtos sem estoque ou arquivados não exibirão ação de compra ativa.

Serviços pagos nunca serão pré-selecionados. A seleção inicial continuará sendo somente o equipamento mais serviços obrigatórios, conforme a regra atual.

### 7.5 Persistência da ação

- desktop: resumo compacto do produto e ação poderá aparecer após o painel original sair da tela;
- mobile: barra inferior com preço/estado e ação principal;
- a barra não pode cobrir conteúdo, toast, controles do navegador nem rodapé;
- indisponível, orçamento e compra direta usam textos e ações diferentes.

### 7.6 Confiança próxima da decisão

Uma única faixa curta reunirá sinais reais:

- inspecionado pela JB, quando verdadeiro;
- garantia informada;
- assistência própria;
- checkout/compra segura;
- instalação e entrega, quando disponíveis.

Esses sinais não serão repetidos em múltiplos cards ao longo da página.

### 7.7 Conteúdo abaixo da dobra

Ordem recomendada:

1. visão geral;
2. ficha técnica e documentos;
3. laudo/checklist da unidade, quando existir;
4. conteúdo da caixa;
5. infraestrutura e instalação;
6. entrega, garantia, troca e suporte;
7. perguntas frequentes;
8. produtos relacionados.

No desktop, as seções principais ficam expandidas e compactas. No celular, conteúdo extenso poderá usar seções verticais expansíveis com título descritivo. Abas horizontais não esconderão o conteúdo principal.

### 7.8 Seminovos e unidades únicas

Para uma unidade identificável, a página priorizará:

- status da unidade;
- data real de inspeção, quando disponível;
- garantia específica;
- checklist;
- observações técnicas;
- fotos próprias;
- certificação pública sem expor número de série sensível.

Com mais de uma unidade disponível, nenhuma informação de uma peça específica será apresentada como se representasse todas.

### 7.9 Produto arquivado ou vendido

A página preservará o endereço por SEO e links antigos, mas:

- compra ficará desativada;
- estado será explícito;
- substitutos relevantes serão priorizados;
- orçamento ou contato poderá ser oferecido quando fizer sentido;
- não haverá falsa promessa de reposição.

## 8. Linguagem visual

### Conceito

**Precisão clínica + força comercial.**

### Cores

- branco como superfície principal;
- cinzas frios para áreas técnicas e separação;
- grafite para títulos, preço e texto de alta prioridade;
- vermelho JB `#E0141B` para CTA, desconto real e seleção ativa;
- verde somente para disponibilidade/estado positivo;
- âmbar para atenção legítima, como estoque baixo;
- nenhuma grande área decorativa em vermelho.

### Tipografia

- Manrope permanece como família principal;
- JetBrains Mono pode ser usada pontualmente em códigos e dados técnicos;
- preços e números comparáveis usam algarismos tabulares;
- não será adicionada fonte global nem alterada a tipografia da home.

### Forma

- raio predominante de 6–10 px;
- filetes de 1 px para estrutura;
- sombra apenas quando comunicar elevação/interação;
- sem excesso de cápsulas, gradientes, cartões aninhados ou ícones decorativos;
- espaçamento em ritmo de 4/8 px, mais compacto que o atual.

### Movimento

- transições entre 160 e 240 ms;
- zoom de imagem discreto;
- filtros, gavetas e feedback de compra com movimento funcional;
- suporte a `prefers-reduced-motion`;
- sem animações contínuas ou entrada teatral de conteúdo.

## 9. Responsividade

### Desktop largo

- grade de quatro colunas;
- três zonas na primeira dobra do produto;
- painel de compra com posição controlada;
- largura maior do marketplace sem afetar outras rotas.

### Notebook

- grade de três colunas;
- galeria e coluna de decisão;
- informações técnicas principais incorporadas à coluna de decisão.

### Tablet

- grade de duas colunas;
- filtros em painel;
- produto em duas colunas quando couber, empilhado em retrato estreito.

### Mobile

- cards de duas colunas a partir da largura segura; uma coluna em 320 px;
- toolbar compacta;
- painel de filtros próprio;
- PDP empilhada na ordem galeria, identidade, compra e conteúdo;
- barra inferior de conversão;
- especificações em pares atributo/valor, sem tabela horizontal.

## 10. Acessibilidade

- contraste mínimo WCAG AA;
- foco visível em todos os elementos interativos;
- navegação completa por teclado;
- áreas de toque de pelo menos 44 × 44 px;
- rótulos textuais para condição e disponibilidade, nunca somente cor;
- anúncio de atualização da contagem de resultados;
- painel de filtros com foco contido e retorno correto ao botão de origem;
- galeria e zoom com nomes acessíveis;
- hierarquia semântica de títulos;
- CTA fixo não pode impedir leitura ou foco do conteúdo;
- carregamento, erro, vazio e indisponibilidade comunicados a tecnologias assistivas.

## 11. Arquitetura técnica

### Isolamento da home

O novo card e o novo shell serão componentes próprios do marketplace. Não se deve alterar o componente consumido pelas vitrines da home apenas para compartilhar aparência.

### Dados de card

A seleção de listagem poderá incluir:

- campos já presentes em `SELECAO_CARD`;
- categoria;
- voltagem;
- garantia;
- até duas especificações ordenadas necessárias ao card.

A consulta deve continuar pequena. Descrição HTML, documentos, todas as mídias e toda a ficha não pertencem à listagem.

### Server e Client Components

- consultas, montagem de coleções e estrutura estática permanecem no servidor;
- interação de filtros, comparação, galeria, CEP e compra fica em componentes cliente mínimos;
- não transformar a página inteira em Client Component;
- manter filtros serializados na URL.

### Imagens e desempenho

- `next/image` com `sizes` correspondente à nova grade;
- preload somente das imagens realmente acima da dobra;
- lazy loading nas demais;
- dimensões estáveis para evitar mudança de layout;
- ausência de dependência pesada para galeria ou animação.

### SEO e dados estruturados

- preservar metadata, canonical e comportamento de produto arquivado;
- preservar dados estruturados de produto, preço, disponibilidade e frete;
- conteúdo técnico importante continuará no HTML, mesmo quando visualmente recolhido no mobile;
- filtros não devem gerar indexação descontrolada de combinações sem valor.

## 12. Conversão e medição

Eventos recomendados, respeitando a camada de analytics já existente:

- visualização de lista;
- seleção de produto;
- aplicação/remoção de filtro;
- ordenação;
- comparação;
- cálculo de entrega;
- seleção de pacote de serviço;
- adicionar ao carrinho;
- comprar agora;
- pedir orçamento;
- navegação por substituto em produto indisponível.

Não registrar dados sensíveis digitados em CEP, orçamento ou checkout.

Indicadores úteis após publicação:

- clique de coleção para produto;
- uso de filtros;
- produtos comparados;
- produto para carrinho;
- produto para checkout;
- produto para orçamento;
- abandono antes e depois da primeira dobra;
- desempenho e Core Web Vitals por tipo de rota.

## 13. Estados obrigatórios

O design deve ser validado com:

- coleção cheia;
- coleção com 1–3 itens;
- nenhum resultado;
- busca sem termo;
- busca sem resultado;
- filtros ativos;
- preço e desconto;
- sob orçamento;
- em estoque;
- estoque baixo;
- sem estoque;
- unidade única;
- unidade vendida;
- produto novo;
- seminovo com laudo;
- produto sem foto;
- produto arquivado;
- frete calculável;
- frete sob orçamento;
- com e sem serviços adicionais;
- com e sem ficha técnica/documentos.

## 14. Critérios de aceitação

1. A home não apresenta diferença visual ou funcional causada pelo projeto.
2. Todas as rotas em escopo compartilham o novo shell de coleção.
3. Em 1440 px, a listagem exibe quatro cards completos por linha.
4. Preço, parcelamento, condição e disponibilidade são identificáveis ao escanear a grade.
5. Filtros ativos são visíveis e removíveis fora do painel completo.
6. Estado dos filtros continua representado na URL e sobrevive a recarregamento/navegação.
7. A primeira dobra do produto contém imagem, identidade, especificações principais, preço/estado, entrega e ação.
8. Serviços opcionais não vêm selecionados.
9. A página do produto elimina repetições de confiança e suporte.
10. O conteúdo técnico existente não é perdido.
11. Nenhum texto comercial novo afirma fatos ausentes do banco.
12. Layouts funcionam em 320, 390, 768, 1024 e 1440 px.
13. Navegação por teclado, foco, contraste e leitor de tela são verificados.
14. Não há erros de console, hidratação ou requests quebrados.
15. Build, lint e testes relevantes passam.
16. As páginas são verificadas visualmente no navegador antes do deploy.

## 15. Referências de decisão

- Baymard: informação essencial e atributos específicos em cards de produto;
- Baymard: filtros aplicados visíveis e removíveis;
- Baymard: entrega, custo e política próximos da área de compra;
- Baymard: seções verticais em páginas longas, evitando esconder conteúdo importante em abas;
- Henry Schein: linguagem B2B clínica baseada em equipamento, instalação, manutenção e suporte;
- Dental Cremer: preço, parcelamento, ficha, registro e aplicação clínica como argumentos de decisão.

As referências orientam comportamento, hierarquia e densidade. A aparência continuará própria da JB.

## 16. Decisões aprovadas

- abordagem A: marketplace clínico técnico;
- conversão forte, baseada em dados reais;
- listagens compactas com quatro colunas em desktop;
- filtros sob demanda com atalhos promovidos;
- cards com especificações decisivas;
- PDP com primeira dobra em três zonas;
- ação de compra persistente e não invasiva;
- conteúdo técnico consolidado em seções verticais;
- linguagem visual clínica, branca, grafite e vermelho JB;
- nenhuma mudança na home.

