# Central Técnica JB — calendário editorial e o que falta

As dezenove pautas do escopo estão escritas e carregadas no banco **como
rascunho**. Nenhuma tem autor, revisor ou data de revisão, e isso não é um
passo esquecido: é o estado verdadeiro delas. Ninguém da JB assinou.

O sistema não permite publicar sem isso. `impedimentoDePublicacao`
(`src/lib/central-tecnica.ts`, 20 testes) exige título, corpo mínimo, autor,
revisor **diferente do autor**, data real de revisão e pelo menos uma fonte —
e a ação de publicar consulta a mesma função que a tela mostra.

## Como carregar

```bash
pnpm pautas:prever
```

```bash
pnpm pautas:carregar
```

A prévia é o padrão. A carga é idempotente e não toca em artigo que já tenha
autor, revisor ou corpo alterado no painel — rodar de novo depois de a redação
mexer não desfaz o trabalho dela.

---

## O que todo texto evita, por decisão

- Instrução para abrir, despressurizar, desmontar ou energizar equipamento.
- Qualquer procedimento que passe por neutralizar intertravamento, válvula de
  segurança, pressostato ou proteção térmica.
- Número que a JB não mediu: preço de peça, prazo de reparo, vida útil,
  "90% dos casos".
- Generalização por marca. Todos saem com `appliesTo` vazio, e a página avisa
  que a aplicabilidade **não foi declarada** — nunca que vale para todos.

O que eles fazem, em vez disso: descrevem o que dá para observar de fora,
dizem quando parar de usar, e separam rotina da clínica do que exige bancada.

---

## Onda 1 — publicar primeiro

Sintomas que param a clínica no mesmo dia, mais o texto que sustenta o
programa de seminovos e o que sustenta a calculadora.

| Pauta | Tema | Por que primeiro |
|---|---|---|
| Autoclave não aquece | Autoclave | Falha que para a clínica no dia e a que mais chega por telefone. Separa "tomada" de "resistência". |
| Autoclave não pressuriza | Autoclave | Segunda em volume, e a que mais gera reprocessamento indevido: o ciclo parece ter rodado. |
| Autoclave vazando vapor | Autoclave | Maior risco de acidente e o mais subestimado — muita clínica opera meses com "aquele vaporzinho da porta". |
| Compressor com ruído incomum | Compressor | Sintoma precoce: agir no ruído evita a pane. Maior valor preventivo da lista. |
| Compressor não mantém pressão | Compressor | Tem um teste de observação seguro que a própria clínica executa, o que reduz visita improdutiva. |
| Água na linha do compressor | Compressor | Alto impacto, baixa percepção: a clínica descobre quando a peça de mão já sofreu. |
| Como avaliar um seminovo | Comprar | Sustenta a credibilidade do programa Seminovo JB Certificado. |
| Quanto custa um equipamento parado | Rotina | Publicar a calculadora sem as premissas seria apresentar estimativa como medição. |

## Onda 2 — em seguida

| Pauta | Tema | Por quê |
|---|---|---|
| Quando avaliar a troca da guarnição | Autoclave | Alta busca, baixa urgência. Depende de confirmação por fabricante. |
| Autoclave de 12 ou 21 litros | Comprar | Conversão alta e conecta com o catálogo. |
| O que compõe um orçamento de manutenção | Rotina | Constrói confiança e reduz atrito comercial. |
| Reparar ou substituir | Comprar | Aparece em todo orçamento alto. |
| Dimensionamento de compressor | Compressor | Boa pauta de projeto, mas depende de levantamento de consumo por fabricante. |
| Bomba de vácuo perdeu força | Vácuo | Sintoma comum cuja causa quase nunca é a bomba. Evita troca desnecessária. |
| Novo ou seminovo: como comparar | Comprar | Precisa de honestidade para não soar como peça de venda. |
| Checklist antes de comprar autoclave | Comprar | Formato prático, alta utilidade. |
| Calendário de manutenção preventiva | Rotina | Conecta com contratos e com a Área da Clínica. |

## Onda 3 — fecha a série

| Pauta | Tema | Por quê |
|---|---|---|
| Sucção com desempenho reduzido | Vácuo | Complementa o texto da bomba; assunto já parcialmente coberto. |
| Como organizar o histórico dos equipamentos | Rotina | Fecha a série e leva ao prontuário. Menos urgente que os sintomas. |

---

## O que a JB precisa fornecer

Nada aqui é trabalho de redação. São informações e decisões que só a operação
tem, e cada texto carrega a sua no campo "O que falta para publicar", visível
no painel.

### Precisa da bancada

- **Faixas de temperatura de parada** por família de equipamento (autoclave não
  aquece).
- **Correspondência entre tipo de ruído e causa provável** no compressor. A
  redação está deliberadamente conservadora e não afirma causa única.
- **Tipos de bomba de vácuo que a JB atende** — a seco, a úmido, anel líquido.
  O texto está genérico e precisa dessa delimitação.
- **Modelos aplicáveis** de cada texto. É o item que se repete em todos: sem
  ele, a página avisa que a aplicabilidade não foi declarada, o que é honesto
  mas menos útil do que poderia ser.
- **Tabela de consumo de ar por tipo de equipamento**, vinda de manuais de
  fabricante, para o texto de dimensionamento ser realmente utilizável. Esta
  tabela não pode ser estimada.

### Precisa de decisão comercial

- **Troca de guarnição**: a JB recomenda que a clínica faça, ou só técnico? É
  decisão de responsabilidade, não de redação.
- **Política de garantia de serviço e de cobrança de diagnóstico**, para o
  texto de orçamento descrever o que a JB pratica.
- **Avaliação de rede de ar comprimido** é serviço que a JB oferece? O texto
  sugere isso implicitamente e não deve sugerir se não existir.
- **Indicação de modelos específicos** no comparativo de 12 e 21 litros.
- **O que a JB entrega junto do equipamento** (instalação, treinamento,
  primeira preventiva), para o checklist de compra terminar com o que é
  verdade.
- **O que pode ser exibido publicamente da inspeção** de um seminovo sem
  expor a origem do equipamento.

### Precisa de imagem real

Nenhum texto tem capa. O acervo está descrito em
[`briefing-acervo.md`](briefing-acervo.md); as fotos que estes artigos pedem,
especificamente:

- display de autoclave com erro de aquecimento;
- guarnição em bom estado e guarnição desgastada, lado a lado;
- dreno de compressor e o que sai dele;
- bancada com equipamento aberto, em contexto seguro e com captura autorizada.

Nenhuma delas pode ser substituída por imagem genérica ou gerada. Foto de
banco de imagem num texto técnico é reconhecível, e custa exatamente a
credibilidade que o texto existe para construir.

### Precisa de gente

Autor e revisor, para cada texto — **duas pessoas diferentes**. A lista sai do
cadastro de usuários internos ativos com papel `admin`, `gestor`, `editor` ou
`tecnico`; não há campo de texto livre para assinatura, de propósito.

A data da revisão é registrada por uma ação que **só o revisor indicado pode
executar**. Nem o painel nem este projeto conseguem carimbá-la por ele.
