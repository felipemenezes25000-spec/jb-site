# Direção visual — plataforma JB

Este documento é a régua da seção 24 do prompt mestre. Ele **não** cria um
sistema novo: o sistema já existe em `src/app/globals.css` e foi amostrado da
logo oficial. O que falta é dizer como esse sistema conta a história de
"comprar é só o começo" em cada fluxo.

---

## 1. O que já está decidido no código, e fica

Ler antes de propor qualquer coisa: `src/app/globals.css`, linhas 1–120.

| Eixo | Decisão vigente | Origem |
|---|---|---|
| Paleta | branco e grafite como base; vermelho JB (`jb-500` `#e0141b`) só como sinal, ação e marca | logo oficial, amostrada pixel a pixel |
| Vermelho em área grande | proibido como preenchimento de fundo | comentário no topo do arquivo |
| Tipografia | Manrope (`--font-sans`) e JetBrains Mono (`--font-mono`) | `--font-manrope`, `--font-jetbrains` |
| Escala | quatro degraus fluidos: `text-hero`, `text-display`, `text-section`, `text-title` | `@theme` |
| Texto secundário | `graf-500` (4,5:1 sobre branco) — `graf-400` **nunca** é texto | comentário explícito na definição |
| Borda de controle | `graf-450` (3,39:1) em campo, seletor, área de texto | WCAG 1.4.11 |
| Raios | `xs 4` → `2xl 22` | `--radius-*` |
| Sombra | `card`, `raised`, `pop` — três degraus, sem inventar um quarto | `--shadow-*` |
| Curva | `--ease-out-quint` | `@theme` |

**Regra derivada:** toda peça nova desta evolução usa esses tokens. Um valor
solto em `style=` ou uma cor hexadecimal no JSX é regressão, não acabamento.

---

## 2. A monoespaçada é semântica, não decorativa

`--font-mono` identifica **dado que a pessoa vai conferir caractere a
caractere**: número de série, SKU, número de pedido (`JB…`), chamado (`AT…`),
OS (`OS…`), orçamento (`ORC…`), contrato (`CT…`) e identificador de unidade.

Não use monoespaçada em título, rótulo, preço ou texto corrido. O sinal só
funciona enquanto for raro.

---

## 3. Fato, previsão e benefício são três coisas diferentes

Este é o ponto onde a maior parte dos sites de equipamento mente sem querer, e o
prompt mestre proíbe explicitamente (seção 5.1, item 7).

| Categoria | O que é | Como aparece |
|---|---|---|
| **Fato registrado** | evento que existe no banco, com data e autor | linha de timeline, com data explícita |
| **Previsão** | data calculada por regra (próxima preventiva, fim de garantia) | rótulo com verbo no futuro e a regra ao lado |
| **Benefício do processo** | o que a JB oferece, ainda não aplicado a esta unidade | texto de venda, **sem** ícone de "check" |

**Proibido:** ícone de confirmação (✓) em item que descreve benefício. Um check
no hero sugere instalação ou inspeção realizada. Para benefício, use marcador
neutro ou ícone temático (chave, documento, calendário).

**Ausência de dado** não é zero e não é falha: "Próxima preventiva ainda não
definida", "Série será identificada na preparação", "Sob consulta".

---

## 4. Densidade por tarefa

Três superfícies, três composições. Não force a mesma grade nas três.

| Superfície | Tarefa | Composição |
|---|---|---|
| **Home e institucional** | convencer e orientar | faixas largas, respiro, uma decisão por faixa, imagem do equipamento com área generosa |
| **Prontuário / ficha** | consultar e conferir | ficha densa, pares rótulo-valor, timeline vertical, monoespaçada nos identificadores |
| **Painel** | operar em série | tabela, filtro, ação em lote, densidade alta e previsível |

Regra prática: se a home e o painel podem trocar de componente sem estranhar, um
dos dois está errado.

---

## 5. Ritmo da home

O prompt mestre (5.1, item 8) fixa a sequência:

```
promessa → evidência do equipamento → demonstração do prontuário
→ caminhos (compra / assistência / preventiva) → curadoria e seminovos
→ confiança → ação
```

Alternância obrigatória de forma, para não virar sete grades de três cartões:

1. **promessa** — duas colunas, texto e vitrine real
2. **evidência** — faixa de fatos objetivos, sem cartão
3. **prontuário** — peça interativa, largura contida, rotulada como demonstração
4. **caminhos** — três destinos, com pesos visuais distintos
5. **curadoria** — grade de produto, a única grade da página
6. **confiança** — faixa editorial com fotografia real quando existir
7. **ação** — bloco único, uma decisão

---

## 6. Hierarquia de ação

Três pesos, e só três. Estão em `src/components/ui/button.tsx`.

| Peso | Uso | Aparência |
|---|---|---|
| Primário | a ação que a página quer | preenchido em `jb-500` |
| Secundário | alternativa legítima da mesma página | contorno, texto grafite |
| Terceiro | acesso de quem já é cliente | link com sublinhado no foco |

No hero: **Ver equipamentos** (primário), **Meu equipamento parou** (secundário),
**Já sou cliente → Área da Clínica** (terceiro, menos proeminente). O terceiro
nunca ganha preenchimento — quem já é cliente procura, não precisa ser atraído.

---

## 7. Movimento

- Anima **transição de estado**: avanço de etapa, expansão de evento, seleção,
  progresso, confirmação recebida do servidor.
- Não anima entrada de conteúdo estático nem faixa inteira aparecendo no scroll.
- Propriedades permitidas: `transform`, `opacity`, `border-color`,
  `background-color`. Nada que provoque relayout.
- `prefers-reduced-motion: reduce` desliga o movimento, não o feedback.
- Duração: 150–200 ms para resposta a toque; 300–500 ms para transição de
  seção. Curva `--ease-out-quint`.
- Nenhuma animação pode produzir CLS: a caixa é reservada antes.

Proibido: scroll hijacking, carrossel automático essencial, cursor customizado,
vídeo decorativo pesado, revelar ação importante só no hover.

---

## 8. Mobile é o campo, não uma redução

O técnico usa o celular ao lado do equipamento; o comprador decide no celular
entre pacientes.

- Alvo de toque confortável, com a altura mínima que os componentes já aplicam
  (`min-h-11`).
- CTA fixo nunca cobre erro, consentimento, menu ou o campo em foco.
- Número de série, pedido e chamado podem quebrar ou ser copiados — nunca são
  truncados sem saída.
- Teclado virtual: `inputMode` e `autocomplete` corretos em e-mail, telefone,
  CEP, número e senha.
- Timeline e tabela adaptam de forma consciente: viram lista de fichas, não uma
  tabela reduzida até ficar ilegível.

---

## 9. Contrato de estados de cada componente interativo

Todo componente novo declara, no próprio arquivo, quais destes estados tem e
como são:

```
inicial → carregando → disponível → foco/hover/pressionado
→ validando/enviando → sucesso ou erro recuperável
→ vazio / sem resultado / sem permissão / expirado / indisponível
```

Nenhum botão sem ação. Nenhum `href="#"`. Nenhum cartão que parece clicável e
não é. Botão desabilitado carrega o motivo quando o impedimento não é óbvio.
Sucesso diz o que foi gravado e qual é o próximo passo. Erro é específico e
preserva o que a pessoa digitou.

---

## 10. Microcopy

Português brasileiro natural, específico, sem adjetivo vazio. Vocabulário fixo:

- "Meu equipamento parou."
- "O que aconteceu?"
- "Confira os dados da etiqueta."
- "Orçamento aguardando sua aprovação."
- "Próxima preventiva ainda não definida."
- "Instalação disponível sob consulta." — só quando essa for a condição real.

Não use na jornada do cliente: "token", "webhook", "SSR", "IA avançada",
"excelência e qualidade", "atendimento imediato" sem base.

---

## 11. As três fatias que estabelecem a linguagem

Conforme a seção 24.1, estas três são construídas e inspecionadas no navegador
antes de a linguagem ser propagada:

1. **Hero + produto real + conexão com o prontuário** — fase 1.
2. **Ficha de equipamento + timeline + ação contextual** — fase 8.
3. **Identificação do checkout em mobile** — fase 3.

Situação: fatia 1 em execução; 2 e 3 aguardando as fases correspondentes.

---

## 12. Auditoria de 08/09/2026 — o que ela mudou nesta régua

A auditoria do site publicado está em
[`../auditoria-visual-2026-09-08/`](../auditoria-visual-2026-09-08/), com 29
capturas. Ela não propôs um sistema novo: confirmou este e apontou onde o
código o contrariava. O que virou regra a partir dela:

**`graf-400` não é cor de texto — e agora isso é medido.** A tabela da seção 1
já dizia. O cartão de vitrine usava mesmo assim, em modelo e preço anterior:
2,6:1 sobre branco, 66 ocorrências em toda fileira da home e do catálogo. O
portão de acessibilidade acusa desde então.

**12px é piso, não sugestão.** `scripts/responsivo.mjs` reprova qualquer texto
abaixo disso em rota pública. Vale inclusive para faixa de apoio e etiqueta em
caixa alta — `micro`, no design system, é exatamente 12px.

**Vitrine mostra o que a JB escolheu mostrar.** Foto e disponibilidade são
requisito para encabeçar destaque, faixa e abertura de coleção. O detalhe está
em `decisoes.md`, seção 21; aqui o que importa é a consequência visual: uma
moldura vazia ou uma unidade vendida em posição de destaque desmontam a
promessa de showroom antes de qualquer refinamento de tipografia.

**Movimento expressivo fica na descoberta.** A abertura tem entrada coordenada
em 620ms com escalonamento de 0 / 140 / 260ms — dentro dos 600–900ms que a
auditoria pede — feita em CSS, sem biblioteca e sem observador: se o CSS
falhar, o conteúdo aparece. Revelação por rolagem existe só dentro de
`@supports (animation-timeline: view())`, para degradar em "sem efeito" e nunca
em "conteúdo invisível". Compra e assistência respondem na hora.

**Primeira dobra do celular mostra equipamento.** Em 390×844 a home abria com
título, parágrafo, dois botões e três números — nenhuma fotografia. O painel do
produto passou a vir logo abaixo do título, deitado, com foto, marca, nome e
preço acima da linha d'água.

**Tela de tarefa tem abertura curta.** Abrir chamado, pedir orçamento: a
apresentação encolhe no celular (`compacto`, em
`src/components/assistencia/apoio.tsx`) para o primeiro campo caber na primeira
tela. No desktop nada muda, porque lá abertura e formulário convivem.

### O que a auditoria pediu e não foi feito

Fotografia própria de bancada, equipe, testes e estoque, para Sobre, Estrutura
e a página da assistência. Depende de material que não existe. A mitigação
possível foi feita: a assistência deixou de abrir com a mesma foto que a home
usa no destaque — ela prefere um seminovo, que é unidade que passou pela
revisão da JB.
