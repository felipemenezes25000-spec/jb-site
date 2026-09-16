# Matriz de cobertura

Requisito do prompt mestre → implementação → teste/evidência → situação.

Situações válidas: `não iniciado`, `em execução`, `implementado`,
`validado localmente`, `aguardando dependência externa`,
`ativado e verificado`.

Regra: nenhuma linha vai para `validado localmente` sem uma linha correspondente
em [`validacao.md`](validacao.md). Código pronto **não** é recurso operando.

---

## Fase 0 — diagnóstico e preparação (seção 4)

| # | Requisito | Implementação | Evidência | Situação |
|---|---|---|---|---|
| 0.1 | Ler `AGENTS.md`, `README.md`, `docs/dominio.md`, `decisoes.md`, `operacao.md` | — | leitura registrada; `AGENTS.md` exige consultar `node_modules/next/dist/docs/` antes de escrever código Next | validado localmente |
| 0.2 | Conferir branch, Git, dependências, scripts, banco e variáveis | — | `validacao.md` › Baseline: branch `plataforma`, árvore limpa, HEAD `fade93a` | validado localmente |
| 0.3 | Reconhecer rotas públicas, acesso, Área da Clínica e painel | — | 4 grupos de rota mapeados: `(loja)`, `(acesso)`, `(conta)`, `(admin)` | validado localmente |
| 0.4 | Confrontar a auditoria com o código | — | `decisoes.md` D2, D3, D6 — três divergências encontradas | validado localmente |
| 0.5 | Baseline de `typecheck`, `test:unit`, `build` | — | `validacao.md`: os três em exit 0; 192 testes | validado localmente |
| 0.6 | Registrar telas atuais em desktop e mobile | — | inspeção da fase 1 registrada em `validacao.md`, desktop e mobile | validado localmente |
| 0.7 | Identificar páginas alimentadas por CMS/seed/config | — | `decisoes.md` D5: `Page.body` no banco é a fonte renderizada | validado localmente |
| 0.8 | Inspecionar modelos e transições antes de propor tabelas | — | `docs/dominio.md` lido; inspeção de `Page` e `MaintenancePlan` | validado localmente |
| 0.9 | Mapear publicação/caching e pontos de invalidação | — | — | **não iniciado** |
| 0.10 | Matriz de cobertura e ordem de execução | este arquivo + `plano.md` | — | validado localmente |

**Aceite da fase 0:** parcial. 0.6 e 0.9 ficam para o início das fases que os
consomem (1 e 5, respectivamente) — registrado aqui em vez de dado por feito.

---

## Fase 1 — narrativa, home, Sobre, Estrutura, naming (seção 5)

| # | Requisito | Implementação | Evidência | Situação |
|---|---|---|---|---|
| 1.1 | H1 "Comprar é só o começo." | `src/components/loja/home/hero.tsx` | inspeção em 1440 e 375 px | validado localmente |
| 1.2 | Eyebrow "Equipamentos + assistência + prontuário técnico" | idem | idem | validado localmente |
| 1.3 | Texto de apoio na direção do ciclo de vida | idem — a segunda frase some abaixo de `sm` para não empurrar os CTAs da dobra | inspeção em 375 px | validado localmente |
| 1.4 | CTAs: Ver equipamentos / Meu equipamento parou / Já sou cliente | idem — primário, secundário e link de texto | inspeção; os três pesos são distintos | validado localmente |
| 1.5 | Preservar produto real, `next/image`, ausência de coluna sem foto | idem — `produto: ProdutoHome \| null`, coluna condicional | build + inspeção | validado localmente |
| 1.6 | Visão "Depois da compra" acoplada ao produto | `DepoisDaCompra` no mesmo arquivo | inspeção: quatro itens, garantia real de 12 meses vinda de `warrantyMonths` | validado localmente |
| 1.7 | Distinguir benefício de processo de estado concluído | sem ícone de confirmação na faixa; `Check` removido de `area-clinica.tsx` | inspeção em 375 px | validado localmente |
| 1.8 | Reordenar seções para narrar continuidade | `src/app/(loja)/page.tsx` — Área da Clínica subiu para antes dos caminhos | ordem conferida no texto renderizado | validado localmente |
| 1.9 | Reduzir redundância entre faixas | a tira "Também no catálogo" saiu do hero; o catálogo é assunto das faixas de baixo | inspeção | validado localmente |
| 1.10 | Preservar provas reais (ano configurado, equipe própria) | `provas.tsx` intacto; "Desde 2011" e "Equipe técnica própria" seguem vindo das configurações | inspeção | validado localmente |
| 1.11 | Centralizar o limite de contagem como prova | `src/lib/prova.ts`, usado por `provas.tsx` e `sobre/page.tsx` | 7 testes em `tests/unitarios/prova.test.ts` | validado localmente |
| 1.12 | Sobre: reescrita integral na fonte renderizada | `scripts/conteudo-institucional.ts` + migração no banco | `/sobre` renderiza o texto novo; `validacao.md` | validado localmente |
| 1.13 | Sobre: remover missão/visão/valores e contagens sem valor | idem; a contagem de 3 serviços deixou de aparecer | inspeção | validado localmente |
| 1.14 | Sobre: não fixar "15 anos" no código | já atendido — `anosDeAtividade()` deriva de `empresa_desde` | tela mostra "15 anos" derivado de 2011 | validado localmente |
| 1.15 | Estrutura: "Onde o equipamento é cuidado" + fluxo de bancada | título no CMS + `PERCURSO_DA_BANCADA` em `estrutura/page.tsx` | nove etapas renderizadas | validado localmente |
| 1.16 | Estrutura: endereço, horário, mapa e contato reais | já existia na página; a visita é descrita como agendamento, não como confirmação | inspeção | validado localmente |
| 1.17 | Naming: Área da Clínica / Prontuário Técnico JB | já atendido no código | `decisoes.md` D2 — 0 ocorrências de "Minha JB" | validado localmente |
| 1.18 | Naming: varredura em CMS, e-mail, seeds, metadados | duplicação "a área da sua clínica" corrigida em `area-clinica.tsx`; CMS reescrito | inspeção + varredura | validado localmente |
| 1.19 | Preservar `/minha-jb` e identificadores internos | contrato observado; nenhuma rota renomeada | 48 testes E2E passando | validado localmente |
| 1.20 | Migração idempotente, com prévia, backup e detecção de edição | `src/lib/conteudo/migracao.ts`, `scripts/migrar-conteudo-institucional.ts`, modelo `PageRevision` | 14 testes unitários + as quatro verificações manuais em `validacao.md` | validado localmente |
| 1.21 | *(acrescido)* Corrigir o texto legado das categorias, visível na home | `scripts/conteudo-categorias.ts` | as seis descrições conferidas na home | validado localmente |
| 1.22 | *(acrescido)* Retirar do ar a capa genérica da Estrutura | `capa: "remover"` na migração; a mídia continua na biblioteca | `coverId` nulo; `Media` intacta | validado localmente |
| 1.23 | *(acrescido)* Controle no painel para as revisões criadas | `restaurarRevisaoDaPagina` + painel "Histórico de versões" | inspeção autenticada em `/admin/conteudo/paginas/estrutura` | validado localmente |
| 1.24 | *(acrescido)* `/empresa` servia o mesmo texto legado do Sobre | redirecionamento 308 em `next.config.ts` + exclusão do sitemap | build; `redirects()` presente | implementado |

---

## Fase 2 — planos e calculadora (seção 6)

| # | Requisito | Implementação | Evidência | Situação |
|---|---|---|---|---|
| 2.1 | Investigar o significado real de `priceCents` | — | `decisoes.md` D3, D4 | validado localmente |
| 2.2 | Não presumir anuidade por equipamento | `PlanBillingBasis` com padrão `sob_consulta` | com base indefinida, os três planos exibem "Sob consulta" mesmo tendo preço | validado localmente |
| 2.3 | Modelar base de cobrança explícita + admin | migração `plano_base_de_cobranca`; `src/lib/plano.ts`; campos em `/admin/manutencao/planos` | 17 testes em `plano.test.ts`; validação recusando pacote sem quantidade verificada no painel | validado localmente |
| 2.4 | Cartão mostra preço, período, unidade, cobertura, elegibilidade | `cartao-plano.tsx` | "R$ 890,00 · por equipamento, por 12 meses de cobertura" | validado localmente |
| 2.5 | "A partir de" só com oferta mínima real; senão "Sob consulta" | `precoDoPlano` — `a_partir_de` é base declarada, não curinga | testes; comparativo mostra "A partir de R$ 2.890,00" só no plano com essa base | validado localmente |
| 2.6 | Declarar visitas, intervalo, peças, deslocamento, exclusões | `partsPolicy`, `travelPolicy`, `exclusions`, `priceFactors`, `eligibility` | cartão e comparativo renderizando os cinco | validado localmente |
| 2.7 | Não criar contratação automática | fluxo preservado: o formulário gera `Lead`, não contrato | `interesseEmPlano` inalterado nesse ponto | validado localmente |
| 2.8 | Preservar contratos já firmados | `MaintenanceContract.priceCents` já é snapshot na criação | leitura de `contratarPlano`; mudar o plano não reescreve contrato | validado localmente |
| 2.9 | Calculadora: unidades explícitas de cada entrada | receita passou a ser **da clínica**, com percentual afetado à parte | inspeção: "Receita por hora da clínica" + "% que para" | validado localmente |
| 2.10 | Calculadora: fórmula sem dupla contagem | `src/lib/parada.ts` | 19 testes; o percentual é aplicado uma vez e aparece como passo próprio | validado localmente |
| 2.11 | Calculadora: validação de finitos, não negativos, intervalos | `conferirPremissas` | testes de NaN, negativo, zero, >24 h/dia, >100% | validado localmente |
| 2.12 | Calculadora: resultado antes da captura | já era assim; preservado | memória de cálculo visível sem qualquer campo de contato | validado localmente |
| 2.13 | Calculadora: comparar só escopos equivalentes | nenhuma comparação de preço é feita ao lado do resultado; o comparativo de planos avisa quando as bases diferem | `escoposComparaveis` + aviso renderizado | validado localmente |
| 2.14 | Calculadora: exposição, não ROI garantido | resultado rotulado "Exposição anual estimada" + frase exigida | inspeção | validado localmente |
| 2.15 | CTAs levam premissas ao formulário sem redigitação | `sessionStorage` via `src/lib/premissas-parada.ts` | verificado ponta a ponta: premissas aparecem no formulário, com opção "Não enviar" | validado localmente |
| 2.16 | Eventos `downtime_calculated` e `maintenance_lead` | — | — | **aguardando fase 6** — a camada de eventos é criada lá (seção 10 do prompt); o ponto de emissão e o payload sem dado financeiro já existem no componente |
| 2.17 | *(acrescido)* Alvo de toque abaixo de 44px em `/manutencao-preventiva` | `min-h-11 min-w-11` no link do plano | `responsivo.mjs` reprovava em 390 e 768; passa depois | validado localmente |

---

## Fases 3 a 19

Detalhadas quando entram em execução, conforme `plano.md`. As linhas abaixo
existem para que nenhuma fase desapareça da matriz.

| Fase | Seção do prompt | Situação |
|---|---|---|
| 3 — conta obrigatória e checkout | 7 | **validado localmente** — detalhe abaixo |
| 4 — domínio canônico e configuração | 8 | **validado localmente** (8.5 aguarda P2) |
| 5 — shell pública, cache, performance | 9 | **validado localmente**, com 31 páginas em migração declarada |
| 6 — analytics, funis, erros, CWV | 10 | **implementado**; emissão em 3 de 30 eventos; observabilidade de erro não iniciada |
| 7 — CI e validação contínua | 11 | **validado localmente**; branch protection aguarda acesso |
| 8 — identidade de produto e Prontuário | 12 | **validado localmente**; a ficha real ainda não usa os componentes novos |
| 9 — assistência sem conta, mídia, SOS | 13 | **validado localmente** na mídia; SOS não iniciado |
| 10 — Seminovo JB Certificado | 14 | **validado localmente** no domínio e na verificação; painel não iniciado |
| 11 — produto, pós-compra, instalação | 15 | não iniciado |
| 12 — Área da Clínica como centro de operação | 16 | não iniciado |
| 13 — SEO comercial e Merchant Center | 17 | não iniciado |
| 14 — Central Técnica JB | 18 | não iniciado |
| 15 — acervo, reviews, cases | 19 | não iniciado |
| 16 — QR por equipamento | 20 | não iniciado |
| 17 — scanner e OCR | 21 | não iniciado |
| 18 — navegação, busca, comparador, TCO | 22 | não iniciado |
| 19 — técnico, continuidade, indicadores | 23 | não iniciado |

---

---

## Fase 3 — conta obrigatória e checkout (seção 7)

| # | Requisito | Implementação | Evidência | Situação |
|---|---|---|---|---|
| 7.1.1 | Reaproveitar o checkout existente, menos campos possível | as cinco etapas seguem as mesmas; só a etapa 0 mudou | inspeção | validado localmente |
| 7.1.2 | E-mail e criação de senha na identificação | modo "Criar meu acesso" | E2E "cria a conta dentro do checkout" | validado localmente |
| 7.1.3 | Remover a caixa "Quero criar minha conta" e a saída de convidado | trocada por escolha explícita entre duas portas | E2E "sem senha, o checkout não fecha" assere `toHaveCount(0)` na caixa antiga | validado localmente |
| 7.1.4 | Login e recuperação sem perder carrinho nem dados | modo "Já tenho conta" + link "Esqueci minha senha"; `redefinirSenha` respeita destino | E2E "cliente existente entra no próprio checkout" | validado localmente |
| 7.1.5 | Autenticado usa a identidade da sessão; nenhum campo oculto escolhe titular | `garantirCompradorAutenticado` ignora `modoAcesso`/`senha` com sessão | leitura + E2E de 05-conta | validado localmente |
| 7.1.6 | Separar dados fiscais do titular autenticado | com sessão, o campo vira "E-mail para este pedido", com aviso de que não muda o acesso | inspeção | validado localmente |
| 7.1.7 | Pessoa física e jurídica com os campos existentes | inalterado | E2E | validado localmente |
| 7.1.8 | Labels, autocomplete, mostrar/ocultar, erro junto do campo, foco | `autocomplete` muda com o modo; erro por campo; foco na etapa | E2E de acessibilidade do checkout | validado localmente |
| 7.1.9 | Permitir colar senha e usar gerenciador | campo comum, sem bloqueio de colagem; `current-password`/`new-password` | inspeção | validado localmente |
| 7.1.10 | Explicar o benefício com a frase do escopo | bloco na etapa 0 | inspeção — frase literal | validado localmente |
| 7.1.11 | Opt-in de marketing separado e opcional | `novidades`, só no modo criar | inspeção | validado localmente |
| 7.2.1 | Exigir sessão válida antes de pedido e cobrança | `garantirCompradorAutenticado` antes de `criarPedido` | E2E "sem senha" e "senha errada" | validado localmente |
| 7.2.2 | Reaproveitar autenticação, hash, freio e fusão existentes | usa `autenticarCliente`, `bloqueadoPorTentativas`, `hashSenhaCliente`, `fundirCarrinhoNoLogin` | leitura | validado localmente |
| 7.2.3 | Retirar o bypass `criarConta=false` | campo removido do esquema e da UI | `grep -rn criarConta src/` → 0 | validado localmente |
| 7.2.4 | E-mail existente exige autenticação ou recuperação | modo criar com e-mail existente é recusado | E2E "e-mail já cadastrado não vira conta nova" | validado localmente |
| 7.2.5 | Cadastro legado sem senha não vira acesso por e-mail digitado | `autenticarCliente` recusa `passwordHash` nulo; criar esbarra na unicidade; ativação é por `/recuperar-senha` | leitura de `auth-cliente.ts` e `pedirRecuperacao` | validado localmente |
| 7.2.6 | Normalizar e-mail, preservar unicidade, tratar corrida | `toLowerCase().trim()`; `P2002` devolve a mesma frase do e-mail existente | leitura | validado localmente |
| 7.2.7 | Reduzir enumeração de contas | "E-mail ou senha inválidos." no entrar; frase única no criar | E2E "senha errada no checkout não revela se o e-mail existe" | validado localmente |
| 7.2.8 | Revalidar dono e conteúdo do carrinho depois da fusão | carrinho é relido quando houve login/criação, e o dono é conferido | leitura; E2E de fusão em 05-conta | validado localmente |
| 7.2.9 | Não herdar carrinho nem pedido de outro usuário | `sairCliente` apaga carrinho **e** o cookie `jb_pedidos` | leitura; E2E de logout em 05-conta | validado localmente |
| 7.2.10 | Conta criada continua utilizável se o pagamento falhar | a conta é criada e a sessão aberta antes da cobrança; falha de cobrança não desfaz | leitura; E2E "recusar o pagamento simulado" | validado localmente |
| 7.2.11 | Nada de senha/token/documento em localStorage, URL ou analytics | senha só trafega no POST do formulário | leitura | validado localmente |
| 7.2.12 | Não aplicar a regra a importações e pedidos administrativos | `criarPedido` tem um único consumidor público; a conversão de orçamento usa outro caminho | `grep -rn criarPedido src/` | validado localmente |
| 7.3.1–7.3.12 | Pedido, cobrança e prontuário | inalterados — já cumpriam | `pnpm prova:atomicidade` **TUDO OK** | validado localmente |

**Testes obrigatórios da fase** (seção 7, lista): dos 16 cenários, 12 têm teste
executado. Os quatro restantes e o motivo estão em `validacao.md`.


---

---

## Fases 4 a 10 — resumo por requisito

### Fase 4 — domínio canônico e configuração (seção 8)

| # | Requisito | Implementação | Situação |
|---|---|---|---|
| 8.1 | Centralizar a resolução da URL pública | `src/lib/site-url.ts`; os 4 pontos que liam `process.env` passaram a ler daqui | validado localmente |
| 8.2 | `NEXT_PUBLIC_SITE_URL` obrigatória em produção | `resolverOrigem` **lança** quando falta em `VERCEL_ENV=production` | validado localmente — 18 testes |
| 8.3 | Validar URL absoluta, protocolo, HTTPS, recusar localhost | `conferirOrigem` | validado localmente |
| 8.4 | Diferenciar produção, preview, CI e desenvolvimento | por `VERCEL_ENV`; `NODE_ENV=production` **não** é produção | validado localmente — teste explícito |
| 8.5 | A URL de produção representa o domínio confirmado | — | **aguardando dependência externa** — P2 |
| 8.6 | Redirecionamento canônico sem laços | `proxy.ts`, 308, só em produção, com três travas contra laço | implementado — sem execução em produção |
| 8.7 | Preview `noindex`, áreas privadas fora do sitemap | já existia; `/verificar` acrescentado às exclusões | validado localmente |
| 8.8 | Preservar metadados por produto/categoria/CMS | inalterados | validado localmente — build |
| 8.9 | Atualizar `.env.example` e documentação | `.env.example` explica os quatro ambientes e o formato | validado localmente |
| 8.10 | Procedimento exato de ativação | `pendencias-externas.md`, P2 | validado localmente |

### Fase 5 — shell pública, cache e performance (seção 9)

| # | Requisito | Implementação | Situação |
|---|---|---|---|
| 9.1 | Ler a documentação instalada antes de ativar `cacheComponents` | lida; as 7 configurações de segmento incompatíveis foram removidas com a citação no comentário | validado localmente |
| 9.2 | Medir o caminho atual do layout | 4 leituras num `Promise.all`, 2 delas dependentes de cookie | validado localmente |
| 9.3 | Separar casca pública de conteúdo pessoal | `loja-publica.ts` + `cabecalho-pessoal.tsx` | validado localmente |
| 9.4 | Sessão e carrinho em fronteiras dinâmicas pequenas | dois `<Suspense>` com esqueleto do mesmo tamanho | validado localmente |
| 9.5 | Logo, busca, acesso e carrinho imediatos | a casca prerenderiza; o contador transmite depois | validado localmente — home saiu de `ƒ` para `◐` |
| 9.6 | Cachear dados públicos | configurações, categorias, rodapé e vitrine da home | validado localmente |
| 9.7 | Tags e invalidação nas mutações do painel | `updateTag` em catálogo e configurações | validado localmente |
| 9.8 | Nada pessoal em cache compartilhado | por construção: quem lê cookie está fora de todo escopo `use cache` | validado localmente |
| 9.9 | Auditar páginas, metadata e layouts | feito — foi o que revelou o rodapé e o `generateMetadata` raiz | validado localmente |
| 9.10 | Preservar a separação da Área da Clínica e do painel | shells intactos | validado localmente — E2E |
| 9.11 | Evitar provider global para dois contadores | nenhum provider; são dois componentes de servidor | validado localmente |
| 9.14 | Documentar a incompatibilidade quando houver | **31 páginas da loja e as áreas autenticadas com `instant = false`** | **implementado — pendência declarada** |

**O que a fase 5 NÃO entregou, e está escrito:** as 31 páginas restantes da
loja não foram migradas para Cache Components. Elas usam `instant = false`, que
é a saída documentada para migrar rota a rota. A casca e a home foram migradas
de verdade.

### Fase 6 — analytics, funis e Core Web Vitals (seção 10)

| # | Requisito | Implementação | Situação |
|---|---|---|---|
| 10.1 | Verificar se `codigo_analytics` é usado | **não era** — campo validado, zero instrumentação | validado localmente |
| 10.2 | Camada pequena e tipada, com modo de desenvolvimento | `src/lib/analytics/` | validado localmente — 20 testes |
| 10.3 | GA4 por identificador validado, sem HTML arbitrário | o componente monta o script | validado localmente |
| 10.4 | Evento, versão, origem, payload, momento e deduplicação | `taxonomia.ts` + `taxonomia-eventos.md` | validado localmente |
| 10.5 | Minimizar dados | lista de permissão + filtro de dado pessoal + rota normalizada | validado localmente |
| 10.6 | Consentimento com recusa e revogação | padrão não medir; revogar para na hora | validado localmente |
| 10.7 | Resultado só depois da confirmação | `maintenance_lead` só no sucesso do servidor | validado localmente |
| 10.8 | Tratar dupla emissão | `Set` por aba + `id_ocorrencia` derivado da referência | validado localmente |
| 10.9 | Coletar Core Web Vitals | `useReportWebVitals`, LCP/INP/CLS | implementado |
| 10.11 | Metas no p75 | declaradas como **metas**, sem número afirmado | validado localmente |
| 10.15 | CSP com origens mínimas | duas origens do GA, com a justificativa de por que entram no build | validado localmente |
| 10.x | Emissão nos demais eventos | 3 de 30 emitem hoje | **implementado parcialmente** — lista evento a evento em `taxonomia-eventos.md` |
| 10.13 | Observabilidade de erros (Sentry ou equivalente) | — | **não iniciado** |

### Fase 7 — CI (seção 11)

| # | Requisito | Situação |
|---|---|---|
| 11.1–11.5 | Workflow único, Node fixo, Postgres isolado, gates de PR | validado localmente — `.github/workflows/validacao.yml` |
| 11.8 | WCAG 2.2 AA | validado localmente — tags `wcag22a`/`wcag22aa`, 36 medições, 0 problemas |
| 11.9 | Larguras 320…1440 | validado localmente — **7 larguras**, 126 medições, 0 problemas |
| 11.13 | Chromium e WebKit | **parcial** — só Chromium, com o motivo escrito em `ci.md` |
| 11.15 | Branch protection | **aguardando dependência externa** — precisa de acesso de administrador |
| 11.6 | Regressão visual nas rotas estratégicas | **não iniciado** |

### Fase 8 — identidade de produto e prontuário (seção 12)

| # | Requisito | Situação |
|---|---|---|
| 12.1 | Componentes de domínio | validado localmente — `src/components/dominio/prontuario.tsx` |
| 12.2 | Direção visual preservada | validado localmente |
| 12.3 | Demonstração pública interativa e rotulada | validado localmente — 3 abas, sem consulta ao banco |
| 12.4 | Prontuário real usando os componentes | **não iniciado** — a ficha de `/minha-jb/equipamentos/[id]` ainda usa os componentes antigos |

### Fase 9 — assistência sem conta e mídia (seção 13)

| # | Requisito | Situação |
|---|---|---|
| 13.1.1–13.1.4 | Upload próprio, escopado, privado | validado localmente |
| 13.1.6 | Limites 6 fotos/10 MB, 1 vídeo/30 s/40 MB | validado localmente |
| 13.1.7 | TTL de 24 h | validado localmente |
| 13.1.8–13.1.10 | Tipo real, duração por metadados, HEIC/MOV | validado localmente — 17 testes |
| 13.1.11 | Remover metadados de localização | validado localmente |
| 13.1.12 | Limite compatível com múltiplas instâncias | validado localmente — contagem no banco |
| 13.1.14–13.1.16 | Vínculo idempotente e limpeza com proteção de corrida | validado localmente |
| 13.1.17 | Falha de mídia não apaga o relato | validado localmente — vínculo fora da transação |
| 13.1.5 | Upload direto assinado | **não iniciado** — o limite de payload do host ainda não foi confirmado |
| 13.2 | Experiência de captura (câmera, galeria, vídeo) | **parcial** — limites e retry existem; os três botões separados não |
| 13.3 | SOS Equipamento | **não iniciado** |

### Fase 10 — Seminovo JB Certificado (seção 14)

| # | Requisito | Situação |
|---|---|---|
| 14.1–14.6 | Certificação por unidade, versão, itens, estados | validado localmente — 17 testes |
| 14.5 | Não inflar verificação com itens não aplicáveis | validado localmente — teste dedicado |
| 14.8 | Correção preserva versão e auditoria | implementado — `CertificationRevision` |
| 14.11 | Página pública de verificação por código opaco | validado localmente |
| 14.12 | Revogada e vendida ditas com clareza | validado localmente |
| 14.13 | Sem selo retroativo | validado localmente — padrão `sem_certificacao` |
| 14.7 | Painel para preencher, revisar e publicar | **não iniciado** |
| 14.9–14.10 | Selo na página do produto, múltiplas unidades | **não iniciado** |

### Fase 11 — produto, pós-compra e instalação registrada (seção 15)

| # | Requisito | Situação |
|---|---|---|
| 15.antes | Infraestrutura, voltagem, espaço, dreno | implementado — `infrastructureNotes`, cadastrado no painel |
| 15.caixa | O que vem e o que é vendido à parte | implementado — `boxContents`; a página declara o resto como à parte |
| 15.instalacao | Inclusa / opcional / não oferecida | implementado — `installationPolicy`, cinco estados, padrão "não informada" (a seção some) |
| 15.pos.3 | Prontuário criado, com link autorizado | implementado — `ProntuarioDoPedido`, só quando o equipamento existe |
| 15.pos.4 | Serial pendente não é inventado | implementado — `Serial` diz "a atribuir", não "—" |
| 15.pos.2 | Sem "aprovado" enquanto pendente | preexistente, conferido — o bloco só aparece com equipamento criado |
| 15.instal.1–9 | Fluxo móvel do técnico, checklist, aceite | **adiado para a fase 19** (seção 23 trata do mesmo fluxo) |
| 15.garantia.6–7 | Marco da garantia | **decisão preservada** — continua da confirmação do pagamento; mudar exigiria snapshot e migração de contratos vigentes (P10) |

### Fase 12 — Área da Clínica como centro de operação (seção 16)

| # | Requisito | Situação |
|---|---|---|
| 16.1–16.2 | Shell próprio, priorizar exceções | preexistente, conferido — `PrecisaDeAtencao` ordena por urgência |
| 16.3 | Contagem por estado e por unidade | validado localmente — filtro de unidade aparece só com mais de uma |
| 16.4 | Filtros, ordenação, atalhos | preexistente, conferido — `Filtros` com status, unidade e busca |
| 16.5–16.6 | Orçamentos e próximas manutenções | preexistente, conferido — solicitação, proposta e confirmado são estados distintos |
| 16.7 | Vazio ensina a primeira ação; sem indicador fabricado | validado localmente — a disponibilidade só aparece com equipamento cadastrado |
| Disponibilidade | Só com histórico; período, cobertura e fórmula na tela | validado localmente — 33 testes; dias-equipamento, não foto do estado atual |
| Disponibilidade | Registro incompleto ≠ ausência de parada | validado localmente — `historicoDoParque` devolve `paradas: null` e o percentual não sai |
| Índice | Nome, pesos declarados, sem laudo de segurança | validado localmente — teste proíbe "risco", "seguro", "bom estado" na leitura |
| Índice | Dado insuficiente não vira 100 nem zero | validado localmente — união discriminada; teste dedicado |
| Índice | "Como calculamos" e os fatos por equipamento | validado localmente — os três fatores vão para a tela com peso e observação |
| 16.8 | Política de timezone e virada de mês/ano | **não iniciado** |
| 16.9 | Múltiplas unidades e titularidade | preservado — nenhum compartilhamento entre clínicas foi introduzido |

### Fase 13 — SEO comercial, Merchant Center e presença local (seção 17)

| # | Requisito | Situação |
|---|---|---|
| 17.1 | Organization, LocalBusiness, Product, Offer, Service, FAQ, Breadcrumb | preexistente, revisado |
| 17.2 | GTIN/MPN só quando conhecidos e válidos | validado localmente — 15 testes; dígito verificador e recusa do SKU |
| 17.3 | `shippingDetails` a partir da regra comercial real | validado localmente — uma faixa por zona de CEP cadastrada |
| 17.4 | Sem prazo/custo fixo inventado; sem prazo de devolução sem política | validado localmente — zona sem `etaDays` omite `deliveryTime`; devolução só sai com os três campos |
| 17.5 | Coerência página / JSON-LD / feed | implementado — os três leem `Product.priceCents`, `condition` e `slug` |
| 17.6 | Sem rating agregado inventado | preservado — `aggregateRating` continua ausente |
| Feed 1 | Requisitos oficiais consultados | feito — support.google.com/merchants/answer/7052112, citado no código |
| Feed 2 | Feed validável em `/feed/produtos.xml` | validado localmente — 21 testes de formato e escape |
| Feed 3 | Condição mapeada para os valores admitidos | validado localmente — só `new`/`used`/`refurbished`; o programa vai em `custom_label_0` |
| Feed 4 | Exclui rascunho, não elegível, privado e demonstração | validado localmente — quatro recusas nomeadas |
| Feed 5 | Unidades com preço/condição diferentes | documentado — o modelo não admite; a regra está em `merchant-center.md` |
| Feed 6 | Atualização, cache e diagnóstico documentados | implementado — etiquetas `catalogo`/`configuracoes`; seção própria no documento |
| Feed 7 | Instruções de verificação e acompanhamento | documentado — **nenhuma conta externa foi tocada** |
| Local | NAP, horário e área de atendimento centralizados | implementado — `area_atendimento` alimenta `areaServed` |
| Local | Página local só com cobertura real | **decisão de não fazer**, com motivo escrito |
| Local | Checklist do perfil, fotos e avaliações reais | documentado |

### Fase 14 — Central Técnica JB e arquitetura editorial (seção 18)

| # | Requisito | Situação |
|---|---|---|
| 18.1 | Central Técnica, não blog genérico | implementado — cinco temas, todos ligados a equipamento que a JB atende |
| 18.2 | Rotas estáveis, sem colisão | validado localmente — `/central-tecnica` e `/central-tecnica/[slug]`; `SLUGS_RESERVADOS` recusa slug que é rota da seção |
| 18.3 | Reusar CMS ou justificar modelo novo | justificado — `Page` tem slug fixo e nenhuma noção de autoria ou revisão; `Article` foi criado com a justificativa no schema |
| 18.4 | Tema, modelos, autor, revisor, fontes, datas, capa, CTA, relacionados | implementado — todos os campos existem e chegam à tela |
| 18.5 | Rascunho → revisão → publicado → arquivado, com prévia protegida | validado localmente — prévia é rota de `/admin`, atrás de `exigirArea`; sem token em URL |
| 18.6 | Não publicar autoria ou revisão que não aconteceram | validado localmente — 20 testes; autor e revisor são lista fechada; a data de revisão só o próprio revisor registra |
| 18.7 | Separar observável, quando parar e o que exige diagnóstico | implementado — todos os 19 rascunhos têm as três seções |
| 18.8 | Sem instrução de abrir, despressurizar ou anular proteção | implementado — decisão registrada no cabeçalho de `pautas-central-tecnica.ts`; a página repete o limite ao fim de todo artigo |
| 18.9 | Aplicabilidade por fabricante e modelo | implementado — `appliesTo` vazio faz a página dizer que não foi declarada, **nunca** que vale para todos |
| 18.10 | Filtro e links internos | implementado — filtro por tema, CTA de chamado, produtos citados |
| 18.11 | Sitemap e schema só com publicado; sem indexar vazio | validado localmente — só `publicado` no sitemap; a listagem responde `noindex` enquanto não houver artigo |
| 18.12 | Sem data de revisão inventada a cada build | validado localmente — `dataEditorial` devolve `null` sem data real; `lastModified` sai de `reviewedAt`/`publishedAt` |
| Pautas | 19 rascunhos substanciais, com fontes quando necessário | entregue — carregados por `pnpm pautas:carregar`, idempôncia verificada em execução real |
| Pautas | Calendário priorizado e registro do que aguarda | entregue — `docs/evolucao-jb/calendario-editorial.md`, três ondas e o que falta por texto |
| Pautas | Nada publicado sem revisão profissional real | **cumprido** — os 19 estão em rascunho, sem autor e sem revisor. Publicar exige gente. |

### Fase 15 — acervo real, reviews e cases técnicos (seção 19)

| # | Requisito | Situação |
|---|---|---|
| 19.foto | Briefing executável com finalidade, enquadramento, proporção, resolução, alt e autorização | entregue — `docs/evolucao-jb/briefing-acervo.md`, 12 fotos |
| 19.foto | Onde cada imagem entra, e composição sem o acervo | documentado — tabela por tela; nenhuma tela usa placeholder |
| 19.foto | CMS preparado para receber | implementado — `Media` ganhou crédito, "tem pessoa", autorização com data e quem obteve, e restrição de uso |
| 19.foto | Não substituir foto documental por imagem gerada | **decisão registrada** — regra escrita no briefing e no código (`impedimentoDeUsoPublico`) |
| 19.2.1–2 | Pedidos de avaliação após compra e OS, com elegíveis, intervalo e dedup | validado localmente — 27 testes; dedup no banco por transação |
| 19.2.3 | CSAT/NPS interno, com finalidade explícita | implementado — nota e NPS não são publicados; a média não sai com poucas respostas |
| 19.2.4 | Sem filtrar convite por nota; sem recompensa; sem pedir mudança | validado localmente — a função de elegíveis não recebe nota, e um teste verifica a assinatura |
| 19.2.5 | Sem depoimento sem autorização | validado localmente — caixa desmarcada por padrão, com data de consentimento |
| 19.2.6 | Separar avaliação pública de feedback privado | implementado — privado é o padrão; público exige autorização **e** curadoria |
| 19.2.7 | Integração pronta em modo de teste, com passo de ativação | entregue — envio nasce desligado; `docs/evolucao-jb/avaliacoes.md` traz os 6 passos |
| 19.2.8 | `review_requested` = enviado, não rascunho | implementado — `sentAt` só é carimbado dentro de `enviarConvite`; documentado |
| 19.case | Estrutura com sintoma, diagnóstico, intervenção, peças, testes, tempo, autorização | implementado — modelo, painel e página pública |
| 19.case | OS vinculada no backoffice, projeção editorial no público | implementado — o `select` público não contém `workOrderId`, `consentNote` nem `pendingNote` |
| 19.case | Sem diagnóstico inferido de resumo automático | implementado — nada é copiado da OS; o campo se chama "confirmado na bancada" |
| 19.case | Sem caso autorizado, explicação do processo como prova | implementado — `/cases` mostra as sete etapas; **nenhum nome ou número foi inventado** |
| Acervo | Nenhuma foto foi produzida | **pendência declarada** — as fotos dependem de câmera e de autorização real |

### Fase 16 — QR por equipamento e verificação de unidade (seção 20)

| # | Requisito | Situação |
|---|---|---|
| 20.A.1 | Etiqueta imprimível com QR e código legível | implementado — `/minha-jb/equipamentos/etiquetas`, folha A4, três colunas |
| 20.A.2 | URL estável com identificador opaco; localizador, não credencial | validado localmente — 12 testes; 15 bytes aleatórios, sem relação com id ou série |
| 20.A.3 | Sem sessão: login com retorno validado; sem dado privado antes da autorização | validado localmente — o destino é **construído** do localizador, nunca lido de parâmetro; a consulta da ficha só acontece depois da decisão |
| 20.A.4 | Titularidade conferida a cada acesso | validado localmente — `quemPodeVer` compara `customerId`; transferência remove o dono anterior na hora |
| 20.A.5 | Papel do técnico, não só existência de sessão staff | validado localmente — teste dedicado: sessão de equipe sem acesso à área de equipamentos é recusada |
| 20.A.6–20.A.7 | Resumo, garantia, histórico e chamado pré-preenchido | implementado — ação de chamado já leva o equipamento |
| 20.A.9 | Impressão individual e em lote, contraste e quiet zone | implementado — quiet zone de 4 módulos, correção M, preto sobre branco, decisões documentadas |
| 20.A.10 | Reimpressão não duplica; transferência sem acesso anterior | implementado — localizador é coluna, gerado uma vez |
| 20.A.9 | Leitura por câmera real | **não executado** — depende de imprimir e escanear; parâmetros do símbolo escolhidos para isso |
| 20.B | QR público leva à evidência da unidade, sem token privado | implementado — `/admin/estoque/certificados`; só certificação publicada, e o código público já é opaco |
| 20.A.8 | Cenários de ID trocado, conta errada, sem permissão | validado localmente — os três têm teste; desativado continua visível ao titular |

### Fase 17 — scanner de etiqueta e OCR com confirmação humana (seção 21)

| # | Requisito | Situação |
|---|---|---|
| 21.1 | Ação "Fotografe a etiqueta" no cadastro e na assistência | implementado — nos dois formulários, com `capture` da câmera traseira |
| 21.2 | Reaproveitar captura segura da fase 9 | implementado — tipo real pelos bytes, mesmo `detectarTipo` |
| 21.3 | Extrair marca, modelo, série e voltagem; preservar o original | validado localmente — 23 testes; o bruto viaja junto e a tela mostra quando diverge |
| 21.4 | Escolher mecanismo e documentar a decisão | documentado — `docs/evolucao-jb/ocr-etiqueta.md`, três opções avaliadas |
| 21.5 | Sem credencial: contrato, adaptador, testes e fallback manual | **cumprido** — nenhuma extração fingida; `sem_mecanismo` é dito com todas as letras |
| 21.6 | Validar e limitar a resposta no servidor; texto é dado | validado localmente — 60 linhas, 200 caracteres, sem controle; resposta fora do formato é recusada |
| 21.7 | Frase de conferência, campos editáveis, incerteza por campo | implementado — a frase do escopo ao pé da letra; confiança nula é "não sei", não zero |
| 21.8 | Confirmação antes de persistir; não sobrescrever serial conferido | validado localmente — `podeGravar`, com teste para cada recusa |
| 21.9 | Marca/modelo ausentes, imagem ruim, O/0 e I/1, várias etiquetas | validado localmente — fixtures sintéticas para os seis casos |
| 21.10 | OCR não determina defeito, segurança, originalidade ou garantia | implementado — frase em código, exibida em toda leitura, com teste |
| 21.11 | Limitar requisições e custo; sem processar a cada render | implementado — 6 por minuto; a leitura só roda no clique, e a foto não é guardada |
| 21.12 | Fixtures de etiqueta boa, ruim, ambígua e falha do provedor | validado localmente — 23 testes |

### Fase 18 — navegação, busca por intenção, comparador e TCO (seção 22)

| # | Requisito | Situação |
|---|---|---|
| 22.nav | Equipamentos · Seminovos · Assistência · Manutenção · Central Técnica | implementado — Peças foi para dentro de Equipamentos e Sobre para o rodapé, com o motivo escrito |
| 22.nav | Peças e institucional continuam encontráveis | implementado — mega menu, gaveta do celular e rodapé |
| 22.busca.1 | Resultados agrupados de produto, serviço e conteúdo | implementado — quatro grupos numa página |
| 22.busca.2 | Equipamentos do próprio cliente; nunca de terceiros | implementado — `customerId` da sessão; sem sessão a consulta nem roda |
| 22.busca.3 | Regras, sinônimos e normalização; IA não é pré-requisito | validado localmente — 21 testes; nenhum modelo envolvido |
| 22.busca.4 | Os cinco exemplos do escopo | validado localmente — um teste para cada |
| 22.busca.5 | Dizer por que o resultado é útil; não bloquear busca de produto | validado localmente — intenção **ordena**, não filtra; teste dedicado |
| 22.busca.6 | Vazio, consulta curta e ordem das respostas | implementado — vazio e curta têm texto próprio |
| 22.busca.8 | Sem rascunho e sem consulta pessoal em analytics | validado localmente — só publicado; `consultaPodeSerMedida` descarta a consulta inteira |
| 22.comp.1 | Atributos reais lado a lado | implementado — preço, condição, marca, voltagem, dimensões, peso, garantia, instalação, infra e caixa |
| 22.comp.2 | Normalizar unidade; ausência não é zero nem vantagem | validado localmente — 25 testes; célula ausente tem tipo próprio |
| 22.comp.3 | Mobile legível | implementado — um cartão por equipamento abaixo de `lg`, tabela com rolagem acima |
| 22.comp.4 | "Qual faz sentido para minha clínica?" com três perguntas | implementado — volume, infraestrutura e prioridade |
| 22.comp.5 | Recomendar só por regra justificada; explicar lacunas | validado localmente — empate não elege; dado ausente vira lacuna escrita, não vantagem |
| 22.tco.1–2 | Mesmo horizonte; distinguir conhecido, premissa e ausente | validado localmente — três origens, e "sem orçamento" não é reparo grátis |
| 22.tco.4 | Sem vida útil, falha, revenda ou economia futura | validado localmente — teste sobre a ressalva |
| 22.tco.5 | Não somar duas vezes o custo de parada | validado localmente — `custoDeParada` com a guarda e o teste |
| 22.tco.6 | Memória de cálculo e aviso de simulação | implementado — linha a linha, com a origem de cada valor |
| 22.tco.3 | Diferenças não monetárias ao lado do custo | implementado — observações por cenário |
| 22.busca.7 | Combobox acessível com autocomplete | **não iniciado** — a busca atual é formulário, sem autocomplete |
| 22.tco.7 | Integrar orçamentos do usuário com autorização | **não iniciado** — hoje o valor do reparo é digitado |

### Fase 19 — operação do técnico, continuidade e indicadores (seção 23)

| # | Requisito | Situação |
|---|---|---|
| 23.1 | Visão de clínica, unidade, sala, equipamento, série, urgência, relato, mídia, garantia e intervenções | implementado — `/admin/assistencia/[id]/preparo` |
| 23.2 | Reusar timeline e relações; destacar sem esconder o resto | implementado — o preparo recorta e mantém o caminho de volta ao chamado completo |
| 23.3 | Checklist preparatório com peças registradas | validado localmente — 26 testes; cada item diz por que entrou |
| 23.4 | Sugestão como interna a confirmar, com origem | validado localmente — `apresentarSugestao` recusa sugestão sem base conferível |
| 23.5 | Resumo determinístico primeiro; IA opcional | **cumprido** — nenhum resumo automático existe; tudo vem de registro |
| 23.6 | Texto de cliente e OCR não instruem o sistema | implementado — relato é exibido como texto e não altera nada |
| 23.7 | Conferir os registros que fundamentam; não esconder conflito | validado localmente — conflito com o histórico vira alerta com a OS anterior citada |
| 23.crm | Lembretes de preventiva com regra real e fila idempônte | preexistente, conferido — índice único `[visitId, daysBefore]` e `skipDuplicates` |
| 23.ind.1 | Definições e consultas dos sete indicadores | implementado — `insights.ts` e `insights-consultas.ts` |
| 23.ind.2 | Janela, população, denominador, exclusões, fuso, volume mínimo | validado localmente — teste percorre as sete definições |
| 23.ind.3 | Chamados por marca ≠ taxa de falha | validado localmente — a ressalva é testada, e aparece na tela em destaque |
| 23.ind.4 | Intervalo entre intervenções ≠ MTBF nem vida útil | validado localmente — teste sobre a ressalva |
| 23.ind.5 | Acesso por papel; isolamento por clínica no cliente | implementado — área `insights` só para admin e gestor |
| 23.ind.6 | Publicação agregada com proteção contra reidentificação | validado localmente — `podePublicarAgregado`: mínimo de clínicas e nenhuma dominando |
| 23.ind.7 | "Ainda não há dados suficientes"; sem métrica ilustrativa | validado localmente — abaixo do volume mínimo não há número |
| 23.crm | Jornada artigo → chamado → equipamento → OS → prontuário | preexistente, reforçado — CTA da Central leva ao chamado; QR leva ao prontuário |
| 23.1 | Fluxo móvel de visita completo (fotos, checklist, encerramento) | preexistente — a OS já tem checklist, mídia e encerramento |

---

## Matriz de cenários obrigatórios (seção 26)

Nenhum cenário é marcado como coberto sem evidência em `validacao.md`.

| Cenário | Situação |
|---|---|
| Home com produto real | validado localmente — narrativa do ciclo de vida com preço e condição do catálogo |
| Home sem foto/produto | implementado — a coluna some e o texto ocupa a faixa; ainda sem execução com catálogo vazio |
| Demonstração pública | validado localmente — interativa, rotulada, sem consulta ao banco |
| CMS com texto legado | validado localmente — migrado, com cópia guardada e edição humana respeitada |
| Plano sem base comercial confirmada | validado localmente — sem base declarada, a tela mostra “Sob consulta” e nenhuma unidade é presumida |
| Calculadora com zero/dado inválido | validado localmente — 19 testes cobrem NaN, negativo, zero e implausível; a tela lista o que falta, sem NaN |
| Carrinho anônimo | validado localmente — adicionar ao carrinho segue sem login |
| Comprador novo | validado localmente — cria conta dentro do checkout e o pedido aparece na Área da Clínica |
| Cliente existente | validado localmente — entra na própria etapa 0 e o pedido fica na conta dele |
| E-mail existente sem prova | validado localmente — recusado, sem conta nova e sem vínculo |
| Checkout direto sem sessão | validado localmente — o servidor recusa antes de pedido e cobrança |
| Duplo envio/webhook | validado localmente — `prova:atomicidade`, 5 confirmações em paralelo produzem um equipamento só |
| Seminovo único disputado | validado localmente — 5 pedidos simultâneos, uma venda |
| Pedido guest antigo | implementado — a conferência de e-mail em `/pedido/[numero]` continua valendo e regrava o cookie; **sem execução automatizada** |
| Assistência guest com mídia | não iniciado |
| Upload falso/longo/expirado/alheio | validado localmente — 17 testes de tipo real e duração; escopo por sessão |
| Limpeza e confirmação concorrentes | implementado — condição de estado no WHERE dos dois lados; sem execução simultânea dirigida |
| Prontuário de outra conta | validado localmente — `quemPodeVer` recusa, com teste |
| Certificação incompleta/revogada | validado localmente — publicação recusada; revogada dita na verificação |
| Instalação reenviada | não iniciado |
| QR privado sem sessão | validado localmente — redireciona para login com retorno construído; nada privado no HTML antes |
| QR público | implementado — aponta para `/verificar/<código>`; sem série, sem token, sem documento |
| OCR ambíguo/falha | validado localmente — alternativas em vez de palpite; falha e resposta inválida têm motivo próprio e caem no manual |
| Busca com rascunho/dado privado | validado localmente — só publicado; equipamento só do dono; consulta com dado pessoal não vira evento |
| Comparador/TCO com dado faltante | validado localmente — 25 testes; ausência não é zero, não é vantagem e bloqueia a comparação |
| Indicador sem base temporal | validado localmente — parque novo não produz percentual; equipamento sem periodicidade não produz nota |
| Produção sem URL válida | validado localmente — `resolverOrigem` lança, com teste dedicado |
| Preview não indexável | não iniciado |
| Cache com duas contas | validado localmente — nada pessoal entra em escopo cacheado, por construção |
| Alteração de preço/estoque/CMS | validado localmente — `updateTag` no painel; E2E de catálogo confirma |
| Analytics recusado | validado localmente — o script não entra na página de quem recusou |
| Evento de compra | não iniciado |
| Artigo sem revisão/autor real | validado localmente — publicação recusada com a lista do que falta; 20 testes |
| Review/case sem autorização | validado localmente — depoimento e case recusam publicação sem consentimento registrado; 27 testes |
| Navegação mobile/teclado | não iniciado |
| Falha do provedor/rede | não iniciado |

---

## Auditoria visual — 8 e 9 de setembro de 2026

Origem: [`../auditoria-visual-2026-09-08/`](../auditoria-visual-2026-09-08/) —
29 capturas do site publicado, o texto observado e a análise. As linhas abaixo
são os achados dela, não requisitos do prompt mestre.

### Alta prioridade

| # | Achado | Implementação | Evidência | Situação |
|---|---|---|---|---|
| A.1 | Cadeira sem foto, R$ 500, vendida, em destaque na home e nos seminovos | `VITRINE` e `UNIDADE_VENDIDA` em `src/lib/catalogo.ts` | preview: "2 unidades disponíveis · 1 já foi vendida e saiu da lista" | validado localmente |
| A.2 | "Menor preço do catálogo R$ 500" saía do item vendido | agregação passou a usar `VITRINE` + `allowDirectPurchase` | preview: R$ 1.480,00 | validado localmente |
| A.3 | "Biossegurança" duas vezes em filtros, atalhos e abertura de chamado | `src/lib/homonimos.ts`, `expandirCategorias`, `expandirMarcas` | 10 testes em `tests/unitarios/homonimos.test.ts`; filtro devolve a soma | validado localmente |
| A.4 | Schuster duplicado e marcas exibidas como siglas | unificação na parede de marcas; nome por extenso no lugar do monograma | preview: 9 marcas, Schuster uma vez, KAVO/GNATUS/CRISTÓFOLI por extenso | validado localmente |
| A.5 | Primeira tela do celular sem fotografia de equipamento | painel do produto sobe para logo abaixo do título, deitado | captura em 390×844 com foto, preço e ação na dobra | validado localmente |
| A.6 | Primeira tela da abertura de chamado termina antes dos campos | `compacto` em `CabecalhoAssistencia`; régua sem repetir o título | — | implementado |

### Média prioridade

| # | Achado | Situação |
|---|---|---|
| M.1 | Repetição de equipamento entre as vitrines da home | validado localmente — curadoria em cascata em `dadosDaHome`; cada faixa fica com o que as anteriores não usaram |
| M.2 | Cabeçalho com faixa em movimento e cinco grupos no mesmo nível | implementado — níveis separados; a home ganhou cabeçalho próprio no redesenho de 09/09 |
| M.3 | "Ver equipamento" quebrando em duas linhas | validado localmente — a grade ia a 4 colunas dentro de um contêiner travado em 1440px, o que **encolhia** o cartão; com 3 colunas o cartão vai a 336px |
| M.4 | Central Técnica, cases e depoimentos sem publicação | implementado — estado vazio com próximo passo nas três; a Central sai da direção principal enquanto vazia |
| M.5 | Sobre e Estrutura só com texto | **não iniciado** — depende de fotografia própria |
| M.6 | Assistência reusando a foto da home | implementado — prefere um seminovo; mitigação, não solução |
| M.7 | Planos: cartão diz "deslocamento incluso", tabela diz "A combinar" | implementado — `regraDoPlano` lê a regra cadastrada nos benefícios quando o campo próprio está vazio |
| M.8 | Comparador e simulador abrindo como formulário técnico | validado localmente — comparador escolhe por foto/marca/preço agrupado por categoria; simulador abre com três campos e guarda o refinamento |

### Referência de UX enviada pelo usuário

Sete padrões de organização, anexados à análise. Situação: cabeçalho em níveis,
categorias cedo na home, catálogo mais compacto, cartão com ordem previsível e
decisão de compra agrupada — todos implementados. "Detalhes progressivos em
abas" foi **deliberadamente não seguido**: a ficha usa âncoras, e o motivo está
escrito no topo de `src/components/loja/produto/navegacao-do-produto.tsx` — aba
esconde conteúdo de busca e de Ctrl+F, e o escopo proíbe esconder conteúdo
crítico de SEO.

### O que ficou fora

| Item | Motivo |
|---|---|
| Fotografia de bancada, equipe, testes e estoque | material não existe; registrado em `pendencias-externas.md` |
| Portões verdes em `(admin)` e `/minha-jb` | densidade do redesenho daqueles painéis; decisão da JB |
