# JB — análise do site e direção visual

Análise realizada em 08/09/2026 no site https://jb-plataforma.vercel.app/.

A JB tem uma estrutura funcional rica e uma identidade reconhecível. O maior salto visual virá de apresentar melhor os equipamentos, reduzir repetições e tornar a navegação mais direta. Minha recomendação é uma linguagem de showroom odontológico de alto padrão: fotografia grande, composição precisa, branco e grafite com vermelho JB, acompanhados de movimento bem coreografado.

Esta entrega é uma auditoria e proposta de redesign. O código da aplicação e o site publicado não foram alterados.

## O que foi acessado

Foram inspecionadas 22 rotas diferentes, com capturas de tela e leitura do conteúdo renderizado. A comparação também foi exercitada com duas autoclaves selecionadas.

| Área | Rotas visitadas |
|---|---|
| Vitrine | `/`, `/loja`, `/seminovos`, `/marcas` |
| Produto | `/loja/autoclave-12l-revisada` |
| Decisão e compra | `/comparar`, `/simulador-de-custo`, `/carrinho`, `/orcamento` |
| Assistência | `/assistencia-tecnica`, `/assistencia-tecnica/solicitar`, `/manutencao-preventiva`, `/planos-de-manutencao` |
| Conteúdo e confiança | `/central-tecnica`, `/cases`, `/depoimentos`, `/sobre`, `/estrutura` |
| Atendimento | `/contato`, `/faq` |
| Conta | `/entrar`, `/cadastro` |

Também foram examinados, em viewport de 390 × 844, a home, o catálogo, o produto, o menu, o painel de filtros e a primeira etapa de assistência. O desktop foi observado na janela disponível, com largura de 2560 CSS pixels.

O acesso interno da Área da Clínica não foi obtido: a tentativa com os campos já preenchidos pelo navegador retornou “E-mail ou senha inválidos”. Não foram avaliados o painel administrativo, as telas internas autenticadas, o pagamento ou a conclusão de pedidos. Não foram enviados contatos, orçamentos ou chamados. O carrinho foi observado vazio. As etapas posteriores do formulário de assistência não foram percorridas.

Esta é uma avaliação visual e de usabilidade por inspeção. Não é uma medição de conversão, um teste com usuários ou uma auditoria completa de acessibilidade e desempenho.

## Acertos que devem ser preservados

- Vermelho JB, logotipo e linguagem visual coerente entre as páginas.
- Ficha de produto com preço, parcelamento, disponibilidade, voltagem, garantia, requisitos de instalação e laudo da unidade.
- Preço e botão de compra fixos na parte inferior da página de produto no celular.
- Menu e filtros mobile abrem em painéis próprios, com ações de fechamento e acesso aos resultados.
- Comparação de equipamentos produz uma tabela real de atributos e explicita as limitações dos dados.
- Solicitação de assistência dividida em etapas e acompanhada de orientação.
- FAQ com busca e organização por assunto.
- O site apresenta a relação entre compra, instalação, manutenção e histórico técnico. Esse é um diferencial de marca com muito potencial visual.

## Achados prioritários

| Prioridade | Evidência observada | Efeito na experiência | Mudança proposta |
|---|---|---|---|
| Alta | A home e os seminovos destacam “cadeira”, sem foto, por R$ 500 e já vendida. | A primeira seleção de produtos passa sensação de catálogo inacabado. | Retirar itens vendidos ou incompletos das vitrines de destaque; manter suas páginas quando necessárias para histórico. Publicar nome, foto e categoria corretos antes de promover uma unidade. |
| Alta | A home anuncia “menor preço do catálogo R$ 500”, valor do item vendido observado. | O destaque de preço cria uma expectativa que a vitrine não permite atender. | Calcular destaques comerciais sobre itens disponíveis e elegíveis; priorizar diferenciais reais da JB na abertura. |
| Alta | “Biossegurança” aparece duas vezes nos filtros e atalhos de seminovos e na seleção de tipo de equipamento do chamado. | O visitante não entende a diferença entre opções com o mesmo nome. | Revisar a taxonomia e a origem dos registros duplicados, preservando os vínculos corretos dos produtos. |
| Alta | A página de marcas mostra Schuster em duas entradas, uma com itens e outra sob consulta. Diversas marcas aparecem como siglas. | Diminui o acabamento e a clareza do catálogo. | Unificar cadastros duplicados e usar arquivos oficiais de logo, com tamanho óptico consistente. |
| Alta | Em 390 × 844, a primeira tela da home contém texto, botões e números, sem fotografia do equipamento. | A visita começa sem mostrar visualmente o que a empresa vende. | Recompor a abertura mobile para exibir título curto, imagem e ação principal já no início. |
| Alta | A primeira tela mobile da abertura de chamado termina antes de alcançar os campos. | Há muita rolagem antes de começar a resolver o problema. | Compactar a introdução e aproximar o primeiro campo do título; manter progresso e ajuda contextual. |
| Média | Ofertas, seminovos, reposição e vistos recentemente repetem equipamentos na home. | A página fica longa e perde ritmo. | Curadoria com papéis distintos para cada seção e menos repetição entre vitrines. |
| Média | O cabeçalho desktop reúne faixa em movimento, cinco grupos de navegação, busca, conta, carrinho e assistência. | Muitas opções disputam atenção no mesmo nível. | Ajustar hierarquia, espaçamento e destaque das ações; agrupar opções secundárias nos menus existentes. |
| Média | Alguns cartões do catálogo quebram “Ver equipamento” em duas linhas no desktop observado. | O acabamento dos cartões fica irregular. | Rever quantidade de colunas, largura útil e tamanho do botão; garantir título, preço e ação alinhados. |
| Média | Central Técnica, cases e depoimentos estão sem publicações. | As páginas prometem conteúdo e prova de confiança que ainda não entregam. | Preparar conteúdo real antes de dar grande destaque comercial a essas áreas; enquanto vazias, usar mensagens curtas e próximo passo útil. |
| Média | Sobre e Estrutura se apoiam principalmente em blocos extensos de texto. | A empresa descreve sua operação sem mostrá-la. | Fotografar equipe, bancada, testes e estoque; transformar o percurso do equipamento em uma narrativa visual. |
| Média | A assistência reutiliza a mesma imagem de autoclave destacada na home. | Compra e serviço ficam visualmente parecidos. | Usar fotografia própria de diagnóstico e manutenção na assistência. |
| Média | Nos planos, o Avançado informa deslocamento incluso na região metropolitana, mas a linha correspondente da tabela diz “A combinar”. | Fica difícil saber qual condição prevalece. | Fazer cartão, tabela e proposta refletirem a mesma regra cadastrada. |
| Média | O comparador começa com uma lista de caixas de seleção; o simulador começa com vários campos numéricos. | Ferramentas úteis parecem formulários técnicos antes de mostrar seu benefício. | Seleção visual de equipamentos e resultados com hierarquia clara; instruções curtas perto do campo relevante. |

Em Marcas, a própria página distingue 10 entradas de 6 com equipamentos publicados. A diferença entre os números da home e do institucional precisa ser explicada com rótulos consistentes; não é, por si só, prova de erro na contagem.

## Direção recomendada

**Leitura do projeto:** redesign de uma loja e assistência odontológica para responsáveis por clínicas, com linguagem tecnológica, segura e visualmente expressiva.

O vermelho continua sendo a assinatura. Branco e cinzas claros dão espaço aos equipamentos; grafite concentra a tipografia e pode sustentar uma seção de destaque. Os elementos metálicos e a iluminação vêm das fotos reais dos aparelhos. Títulos ganham mais personalidade, com uma família sem serifa consistente e variação clara de escala.

A prioridade é que um equipamento de alto valor pareça bem apresentado e verificável. A foto deve corresponder ao modelo e, nos seminovos, à unidade anunciada. Imagens conceituais podem ambientar a marca quando identificadas, mas a vitrine precisa mostrar o produto que será entregue.

Uma alternativa seria apenas refinar o desenho atual: menos esforço, mas impacto mais limitado. Outra seria uma estética escura e experimental em toda a loja: mais dramática, porém mais exigente para leitura, fotografia e compra no celular. Recomendo a base clara de showroom com alguns momentos de maior impacto.

## Como redesenhar cada experiência

### Home

1. **Abertura:** equipamento ou consultório real em grande escala, título curto e uma ação principal evidente. Exemplo de direção de texto: “Sua clínica pronta para o próximo nível.” A frase precisa vir acompanhada da explicação objetiva de equipamentos e assistência.
2. **Escolha rápida:** acessos visuais a equipamentos novos, seminovos e suporte, aproveitando as rotas existentes.
3. **Seleção da JB:** poucos equipamentos disponíveis, fotografias consistentes e motivos claros para o destaque.
4. **Seminovos:** apresentar a unidade, o laudo, a revisão e a garantia como parte de uma mesma história visual.
5. **Equipe em ação:** fotos de bancada e uma sequência visual de compra, instalação e assistência.
6. **Confiança:** marcas organizadas e cases/depoimentos quando houver material publicado e autorizado.
7. **Fechamento:** atendimento direto e rodapé mais compacto.

A home precisa alternar escala e composição. Repetir a mesma grade com os mesmos produtos enfraquece o impacto, mesmo com muitas animações.

### Catálogo e seminovos

Fotografias com enquadramento, escala e fundo consistentes. Nome, condição, preço, disponibilidade e ação formam uma hierarquia estável. Filtros ativos precisam ser fáceis de entender e remover. A comparação deve ser acessível no cartão e mostrar claramente o que já foi selecionado.

No celular, reduzir a altura dos cartões e experimentar uma grade de duas colunas somente onde nomes, preços e botões continuarem legíveis. O painel de filtros existente é uma boa base. O topo deve ocupar menos espaço antes dos resultados.

### Produto

Manter a riqueza técnica, com galeria maior e fotografias de detalhes. Na coluna de decisão, aproximar preço, condição, garantia e ação principal. Preservar a barra de compra mobile. Distinguir a informação essencial da ficha técnica completa por títulos, âncoras e blocos expansíveis quando apropriado.

O zoom e a ampliação já existem. O avanço deve vir de melhorar a qualidade e a quantidade de imagens correspondentes ao equipamento, o comportamento da galeria e a apresentação do laudo.

### Assistência, orçamento e conta

Introduções menores nas telas de tarefa. O usuário deve alcançar o primeiro campo rapidamente. Ajuda contextual curta, etapa atual clara e transições suaves entre passos. A tela de entrada pode usar um painel visual compacto sobre os benefícios do histórico técnico, sem alongar desnecessariamente o formulário.

### Comparador e simulador

Selecionar produtos por imagem, nome e preço; agrupar equipamentos comparáveis. Levar a tabela de resultado para perto da ação que a gerou. Destacar diferenças com explicação e permitir consultar todos os atributos. No simulador, apresentar cenários com gráficos simples e memória de cálculo acessível, preservando a distinção entre premissas informadas e dados ausentes.

## Efeitos que valorizam o resultado

| Momento | Efeito proposto | Condição de uso |
|---|---|---|
| Abertura | Entrada coordenada de título, produto e chamada, aproximadamente 600–900 ms. | Conteúdo continua acessível sem esperar pela animação. |
| Equipamento em destaque | Profundidade e deslocamento discreto ao mover o ponteiro. | Apenas onde houver ponteiro preciso; imagem continua estável no toque. |
| Cartão | Elevação leve e zoom de cerca de 3% na fotografia. | Resposta curta, cerca de 180–250 ms. |
| Seções de marca | Revelação ao entrar na tela e paralaxe leve em uma seção fotográfica. | Sem travar a rolagem; versão estática em movimento reduzido. |
| Menus e filtros | Abertura e fechamento com transição contínua. | Foco, teclado e botão de fechar permanecem claros. |
| Comparação | Entrada dos itens selecionados e realce das diferenças. | O movimento explica a mudança de estado. |
| Formulários | Transição entre etapas e feedback junto ao campo. | Erros e botões não desaparecem durante a interação. |

Concentrar o movimento expressivo na descoberta e nas vitrines. Compra e assistência devem responder imediatamente. Respeitar a preferência de movimento reduzido, manter contraste e testar em celulares reais antes da publicação.

## Ordem de execução

1. Corrigir a qualidade do catálogo: duplicações, itens sem foto, seleção de vendidos, logos e divergências de condições.
2. Definir tipografia, espaçamentos, cores, tamanhos de imagem e hierarquia de botões para o site inteiro.
3. Redesenhar home, catálogo e produto como um conjunto, começando pelas composições mobile.
4. Aplicar o mesmo acabamento a assistência, orçamento, conta e planos; reduzir o esforço para começar cada tarefa.
5. Produzir fotografia e conteúdo reais para Sobre, Estrutura, cases e Central Técnica.
6. Adicionar a camada de movimento e verificar navegação, teclado, toque, movimento reduzido e desempenho.

As rotas atuais, a identidade da JB e as funções úteis devem servir de base. Mudanças de nome ou agrupamento de menus precisam ser tratadas como decisões de navegação, com revisão específica.

## Evidências

As 29 capturas estão nesta pasta. Exemplos:

- `01-home-desktop.png`: abertura atual.
- `02-loja-desktop.png`: catálogo e cartões.
- `03-seminovos-desktop.png`: categoria repetida e unidade vendida sem foto.
- `04-produto-desktop.png`: galeria e decisão de compra.
- `06-solicitar-desktop.png`: primeira etapa da assistência.
- `09-central-desktop.png`: Central Técnica sem publicações.
- `23-marcas-desktop.png`: marcas duplicadas e logos ausentes.
- `24-home-mobile.png`: primeira dobra sem equipamento visível.
- `25-loja-mobile.png`: topo do catálogo e início da lista.
- `26-produto-mobile.png`: preço e compra fixos.
- `27-menu-mobile.png` e `28-filtros-mobile.png`: painéis abertos.
- `29-solicitar-mobile.png`: espaço anterior aos campos.

`paginas-observadas.json` registra o texto das páginas públicas observado durante esta visita. Conteúdo, preços e disponibilidade podem mudar depois da análise.

## Referência de UX e organização enviada pelo usuário

Referência: https://id-preview--83882acc-73b0-4cae-9395-00a4c5b49ecd.lovable.app/

Orientação expressa do usuário: usar somente como referência de UX e organização. A paleta escura, a tipografia condensada e o desenho do logotipo não foram solicitados para a JB. A direção visual própria proposta acima continua sendo a base.

Foram observadas a home, a listagem de catálogo e a página da autoclave revisada no desktop. Essa inspeção identifica padrões de apresentação; não equivale à validação funcional completa do protótipo.

Padrões a incorporar ao planejamento:

1. **Cabeçalho organizado em níveis:** contatos e benefícios discretos; linha principal com busca ampla e atalhos; categorias em uma linha própria. Adaptar às funções reais da JB, incluindo Área da Clínica.
2. **Categorias cedo na home:** “Escolha pela área do consultório” aparece antes das ofertas, com exemplos do que existe em cada categoria. Isso ajuda o visitante a escolher por necessidade.
3. **Catálogo mais compacto:** título e ordenação ocupam pouco espaço, enquanto filtros e produtos começam próximos ao topo. Preservar os filtros úteis da aplicação atual.
4. **Cartões com ordem previsível:** foto, condição, marca, nome, preço, parcelamento, estoque e ações aparecem em posições consistentes. Comparar e salvar ficam próximos da ação de compra.
5. **Decisão de compra agrupada:** preço, quantidade, ação principal, garantia e prazo compõem um bloco coeso, com contato técnico logo ao lado da decisão.
6. **Detalhes progressivos:** ficha técnica, assistência/garantia e entrega/instalação são organizadas por assunto em abas. Adaptar sem perder laudo individual, requisitos de instalação ou navegação por teclado.
7. **Sequência de tarefas clara:** descobrir a categoria, encontrar o equipamento, comparar, conferir condições e comprar ou pedir ajuda.

A referência identifica preços e prazos como demonstração. Avaliações, estoque, descontos e condições apresentados ali não são evidência comercial para a aplicação real; qualquer elemento equivalente usará os registros verificados da JB. O nome “Marketplace” do rodapé também não descreve o modelo de vendedor único da JB.

Essa referência orienta a hierarquia e a distribuição das informações. O refinamento visual e a camada de efeitos serão desenhados para a identidade da JB, com validação mobile própria.
