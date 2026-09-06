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
| 3 — conta obrigatória e checkout | 7 | não iniciado |
| 4 — domínio canônico e configuração | 8 | não iniciado |
| 5 — shell pública, cache, performance | 9 | não iniciado |
| 6 — analytics, funis, erros, CWV | 10 | não iniciado |
| 7 — CI e validação contínua | 11 | não iniciado |
| 8 — identidade de produto e Prontuário | 12 | não iniciado |
| 9 — assistência sem conta, mídia, SOS | 13 | não iniciado |
| 10 — Seminovo JB Certificado | 14 | não iniciado |
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

## Matriz de cenários obrigatórios (seção 26)

Nenhum cenário é marcado como coberto sem evidência em `validacao.md`.

| Cenário | Situação |
|---|---|
| Home com produto real | validado localmente — narrativa do ciclo de vida com preço e condição do catálogo |
| Home sem foto/produto | implementado — a coluna some e o texto ocupa a faixa; ainda sem execução com catálogo vazio |
| Demonstração pública | não iniciado |
| CMS com texto legado | validado localmente — migrado, com cópia guardada e edição humana respeitada |
| Plano sem base comercial confirmada | validado localmente — sem base declarada, a tela mostra “Sob consulta” e nenhuma unidade é presumida |
| Calculadora com zero/dado inválido | validado localmente — 19 testes cobrem NaN, negativo, zero e implausível; a tela lista o que falta, sem NaN |
| Carrinho anônimo | não iniciado |
| Comprador novo cria conta no checkout | não iniciado |
| Cliente existente | não iniciado |
| E-mail existente sem prova | não iniciado |
| Checkout direto sem sessão | não iniciado |
| Duplo envio/webhook | não iniciado |
| Seminovo único disputado | não iniciado |
| Pedido guest antigo | não iniciado |
| Assistência guest com mídia | não iniciado |
| Upload falso/longo/expirado/alheio | não iniciado |
| Limpeza e confirmação concorrentes | não iniciado |
| Prontuário de outra conta | não iniciado |
| Certificação incompleta/revogada | não iniciado |
| Instalação reenviada | não iniciado |
| QR privado sem sessão | não iniciado |
| QR público | não iniciado |
| OCR ambíguo/falha | não iniciado |
| Busca com rascunho/dado privado | não iniciado |
| Comparador/TCO com dado faltante | não iniciado |
| Indicador sem base temporal | não iniciado |
| Produção sem URL válida | não iniciado |
| Preview não indexável | não iniciado |
| Cache com duas contas | não iniciado |
| Alteração de preço/estoque/CMS | não iniciado |
| Analytics recusado | não iniciado |
| Evento de compra | não iniciado |
| Artigo sem revisão/autor real | não iniciado |
| Review/case sem autorização | não iniciado |
| Navegação mobile/teclado | não iniciado |
| Falha do provedor/rede | não iniciado |
