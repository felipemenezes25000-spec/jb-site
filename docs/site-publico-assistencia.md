# Site público JB — assistência técnica

> Fonte curta de verdade para o produto público atual.  
> Atualizado em 23/09/2026.

## Decisão de produto

O site público da **JB Soluções Odontológicas é assistência técnica, e só isso**.

A antiga superfície de comércio não faz parte do produto público atual. Catálogo, carrinho, checkout, comparação, frete e páginas comerciais removidas não devem reaparecer por conveniência de implementação. As URLs antigas respondem `410 Gone` em `src/proxy.ts`.

O banco e o backoffice podem manter histórico/modelos que ainda sejam necessários à operação. Isso não autoriza reintroduzir e-commerce no frontend público.

## Objetivo da experiência

A principal jornada é:

**anúncio ou busca → intenção confirmada → equipamento/sintoma → Jeferson ou Jackson → WhatsApp**

A interface deve transmitir assistência técnica especializada, engenharia, organização e confiança. O site não deve parecer marketplace, template de clínica nem landing page genérica de WhatsApp.

## Princípios não negociáveis

- Mobile-first, com atenção especial a `320`, `360`, `390` e `430px`.
- Desktop desenhado de verdade, com composição própria em `1440` e `1920px`.
- Jeferson e Jackson permanecem disponíveis como opções explícitas de atendimento.
- A mensagem do WhatsApp pode ser preparada pelo site, mas a pessoa sempre revisa e envia dentro do WhatsApp.
- Triagem não é diagnóstico. Ela organiza marca, modelo, sintoma e situação quando essas informações são fornecidas.
- Não inventar prazo, preço, garantia, urgência, número de clientes, nota, avaliação ou resultado.
- Não prometer que um atendimento será na clínica ou na bancada antes de a equipe definir a necessidade.
- Não ensinar desmontagem, abertura, teste de componente, liberação de pressão ou bypass de proteção de equipamento.
- Credenciais públicas precisam ser verificáveis. A autorização EVOXX deve apontar para a lista oficial do fabricante.
- Movimento é acabamento, nunca requisito para usar a interface. `prefers-reduced-motion` deve continuar respeitado.
- Performance faz parte do design: evitar prefetch, preload, animação e JavaScript que não contribuam para a jornada atual.
- Admin/backoffice não herda a direção de arte cinematográfica do site público.

## Marca e direção visual

- Fundo predominante branco/off-white.
- Grafite quase preto para estrutura e contraste.
- Vermelho JB `#E0141B` como sinal de marca e ação, não como preenchimento indiscriminado.
- Tipografia grande e editorial, com comprimento de leitura controlado.
- Imagens de equipamento e bancada devem reforçar contexto técnico, não criar afirmações documentais sobre quem aparece na foto.
- Microinterações curtas e funcionais. Evitar loops decorativos permanentes, especialmente em touch.

## Home

A home deve continuar priorizando:

1. status real de atendimento;
2. promessa principal — equipamento parou / JB assume a triagem;
3. provas objetivas;
4. Jeferson e Jackson;
5. diagnóstico em 3 toques;
6. fotografia técnica;
7. equipamentos atendidos;
8. impacto potencial de parada, apresentado como cenário e não previsão;
9. processo;
10. clínica ou bancada;
11. autoridade baseada em fatos;
12. FAQ;
13. fechamento com WhatsApp.

No mobile, ação e triagem vêm antes da fotografia quando isso reduz fricção.

## Landings de equipamento

Rotas atuais:

- `/autoclave`
- `/compressor`
- `/cadeira-odontologica`
- `/bomba-de-vacuo`
- `/seladora`
- `/destilador`
- `/lavadora-ultrassonica`

Cada landing precisa:

- repetir imediatamente a intenção do anúncio/busca;
- colocar nome do equipamento no H1;
- permitir selecionar o sintoma sem tornar isso obrigatório — e, depois dele, a situação da clínica e a cidade, também opcionais;
- carregar equipamento, sintoma, situação e cidade na mensagem do WhatsApp (e na barra do celular);
- ter os dois atendentes na primeira dobra do celular: o parágrafo de impacto só aparece a partir do tablet;
- manter Jeferson e Jackson;
- apresentar cuidados apenas de segurança e observação externa;
- usar metadata/canonical/OG específicos;
- evitar saídas desnecessárias no cabeçalho;
- manter links para outros equipamentos como navegação secundária, sem competir com a conversão principal.

## Conteúdo e confiança

Superfícies públicas complementares:

- `/central-tecnica`
- `/central-tecnica/[slug]`
- `/cases`
- `/cases/[slug]`
- `/privacidade`
- `/termos`
- `/avaliar/[token]` — sempre privada do índice e sem barra fixa de conversão.

Central Técnica e cases não podem publicar conteúdo fictício para preencher espaço. Autor, revisor, diagnóstico, fontes, autorização e datas só aparecem quando existem de verdade.

## Medição

O site funciona integralmente sem analytics.

Medição só ocorre depois de consentimento. O clique no WhatsApp pode registrar posição, equipamento, rota e origem de campanha permitida, mas nunca texto livre digitado pela pessoa.

UTMs e identificadores de campanha podem ser preservados em sessão para atribuição após navegação interna, sem transformar armazenamento em envio de dados antes do consentimento.

Depois do consentimento, GA4 e Meta recebem `PageView` explícito na rota inicial e nas navegações internas do App Router. Query string arbitrária não entra nesse evento: o primeiro `PageView` de cada aba leva só a campanha, por lista de permissão (`utm_*` limpas e o `gclid`/`gbraid`/`wbraid` do Google), porque sem ela o GA4 atribui toda visita paga a "direto". As rotas com token pessoal (`/avaliar/*`) não geram `PageView`. O clique no WhatsApp continua sendo tratado como **intenção de contato**, não como conversa ou atendimento concluído: GA4 recebe `whatsapp_click`, o Google Ads recebe `conversion` com `send_to` explícito e a Meta recebe `Contact` com `content_category` = equipamento e `content_name` = `whatsapp:<posição do CTA>`.

O pixel da Meta sobe com `disablePushState` (sem o `PageView` automático a cada `pushState`, que duplicaria a contagem) e `autoConfig` desligado (sem coleta automática de texto de botão e metadado).

**Configuração fora do código (pendência externa):** no GA4, em *Fluxos de dados → Medição otimizada → Visualizações de página*, desmarque "Mudanças de página com base em eventos do histórico do navegador". O site já envia o `page_view` de cada navegação; com a opção ligada, o GA4 somaria um segundo automático. No Events Manager da Meta, a "correspondência avançada automática" deve ficar desligada para o pixel não ler campos de formulário.

## Performance

- Nada em laço infinito: sem marquise, blob flutuante, borda girando ou foto "respirando". Movimento automático de mais de cinco segundos sem pausa é o que a WCAG 2.2.2 pede para evitar, e custa compositor sem informar nada.
- O site público não carrega biblioteca de animação: transições da triagem são CSS, e as folhas do Motion System do painel entram só pelo layout do admin.
- Não pré-carregar imagem que não disputa a primeira dobra no mobile.
- Não fazer prefetch automático de listas de landings quando isso concorre com a jornada principal.
- Imagens abaixo da dobra permanecem lazy por padrão.
- Uma única marca prioritária no header; evitar imagens duplicadas por breakpoint.
- O site de assistência usa sua própria coreografia e não deve receber aura/tilt/reveal da antiga vitrine comercial.
- Folhas específicas do e-commerce removido não devem voltar ao bundle global.

## CSS do site público

Duas folhas, importadas pelo layout do grupo `(site)`:

- `site.css` — movimento: revelação por rolagem, troca de passo da triagem, controle deslizante, pulso da barra e movimento reduzido;
- `acabamento.css` — desenho, organizado por peça na ordem da página (comum, botões de WhatsApp, faixa do topo, cabeçalho, abertura da home, abertura das landings, seções, rodapé, conteúdo, barra do celular, aviso de medição, preferências do sistema).

Até 23/09/2026 eram onze camadas (`premium`, `ultra-premium`, `mobile-excellence`, `final-polish`…) redefinindo as mesmas peças — o título da home em doze regras de cinco arquivos. A consolidação foi feita medindo estilo computado e geometria de cada elemento em 9 rotas × 9 larguras, antes e depois. Mudanças de propósito, e só elas:

- `backdrop-filter` removido de tudo que tem fundo quase opaco (provas, CTAs, triagem, cartões, barra, aviso); fica só no cabeçalho fixo;
- `overflow-x: clip` saiu do invólucro do site: peça que não cabe aparece no portão de responsividade em vez de ser recortada;
- 360px passa a usar as regras de 360–430 (antes, metade das regras de 320 valia também em 360);
- abaixo de 360px, os botões grandes de WhatsApp da triagem, das seções e do fechamento têm menos respiro, e "Jeferson" deixou de aparecer com reticências;
- o aviso de medição usa a classe `.jb-aviso-medicao` em vez de seletor por `aria-label` com `!important`;
- a landing usa `.jb-landing-hero` em vez de `section[aria-labelledby="abertura-titulo"]:not(.jb-hero-premium)`.

Regra para a próxima mudança: procure a seção da peça em `acabamento.css` antes de criar regra nova; não crie folha nova para ajuste pontual.

## Validação final

Comando:

```bash
pnpm validacao:final
```

Pré-requisito: **Docker com o daemon rodando**. O comando não usa o banco configurado na máquina: sobrescreve as variáveis críticas (inclusive zera `JBPREV_DATABASE_URL`) e cria um PostgreSQL 17 descartável em container próprio, publicado só em `127.0.0.1`, por padrão na porta `55432`. A aplicação sobe por padrão na `3456`. As duas portas precisam estar livres: a validação **não** reaproveita servidor alheio (já aconteceu de a suíte rodar contra o site de outro projeto) e confere que quem responde é a JB.

O orquestrador `scripts/validacao-final.mjs` executa, em sequência:

1. verificação arquitetural;
2. lint;
3. TypeScript;
4. testes unitários (2 workers);
5. PostgreSQL 17 efêmero, pronto por TCP e confirmado duas vezes;
6. migrações e cargas base, demo e operação nesse banco;
7. destinos de medição **fictícios** (GA4, Google Ads e Meta) no banco efêmero, para o aviso de consentimento e a medição serem testados de verdade;
8. Chromium do Playwright;
9. build de produção apontado para o banco efêmero (`connection_limit=3`, `connect_timeout=30`);
10. um único `next start`, com a conferência de que nenhuma página foi gerada com as configurações padrão por falha de banco no build;
11. Playwright do produto público atual (`E2E_EXIGE_MEDICAO=1`: teste de medição não pode se declarar pulado);
12. axe/acessibilidade em mobile e desktop;
13. responsividade de `320` a `1920px`.

Servidor e banco são encerrados no `finally`, também em `SIGINT`/`SIGTERM`, e o container é removido mesmo se não chegar a ficar pronto. O resumo final lista cada etapa com tempo. `VALIDACAO_CONTINUAR=1` roda as três baterias de navegador mesmo que uma falhe (para ver tudo numa rodada); a validação continua reprovada.

```bash
VALIDACAO_PORTA=3457 VALIDACAO_DB_PORTA=55433 pnpm validacao:final
```

Cobertura:

- Playwright em `320×760`, `390×844`, `1440×900` e `1920×1080`: jornada da home e das 7 landings; telefone fixo e os dois WhatsApps; primeira dobra do celular com título e os dois atendentes; composição de desktop sem "celular esticado"; triagem completa (equipamento, sintoma, situação e cidade) no WhatsApp e na barra do celular; barra que só aparece longe dos CTAs e respeita a área segura; páginas legais sem barra; metadata, canonical, Open Graph (imagem 200 `image/png`) e JSON-LD das 7 landings; sitemap e robots; `410` com `noindex` para a loja antiga; admin anônimo redirecionado, `noindex` e `no-store`;
- consentimento e medição: nenhum script de terceiro antes do "sim"; `PageView` na chegada e em cada navegação do App Router, sem duplicar e sem query arbitrária; `conversion` com `send_to` e `Contact` com campos controlados no clique; revogação; aviso com prioridade sobre a barra no celular. Google e Meta são interceptados pelo teste: nada sai da máquina;
- acessibilidade (axe WCAG 2.2 A/AA) em 390 e 1440: home, 7 landings, Central Técnica, cases, privacidade, termos, 404, 410 e login do painel, mais `h1` e `main` únicos, ordem de títulos, "pular para o conteúdo" como primeira parada do Tab e foco visível nas 30 primeiras paradas. Artigo e case individuais entram automaticamente quando houver publicação;
- responsividade em `320`, `360`, `390`, `430`, `768`, `1024`, `1280`, `1440` e `1920px`: rolagem lateral real, conteúdo fora da tela mesmo sem barra de rolagem, texto recortado por ancestral com `overflow` escondido, texto com reticências, alvo de 24px em todo controle e 44px nos CTAs de conversão, peças essenciais visíveis, os dois atendentes na primeira dobra do celular e revelação por rolagem que não pode congelar abaixo de 100% (390 e 1440, com movimento ligado).

Configuração externa que o código não resolve está listada em **Medição** (GA4 e Meta).
