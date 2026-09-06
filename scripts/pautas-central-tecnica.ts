/* ============================================================================
   Pautas iniciais da Central Técnica JB

   Os dezenove textos que o escopo pede, escritos como rascunhos substanciais.
   Nenhum tem autor, revisor ou data — e isso não é omissão, é o estado
   verdadeiro deles: ninguém da JB assinou ainda. O escopo é explícito em que
   ausência de revisão não autoriza nome de revisor fictício, e `pendente`
   registra, texto a texto, o que a equipe precisa fornecer.

   O que TODOS os textos evitam, por decisão e não por descuido:

   - instrução para abrir, despressurizar, desmontar ou energizar equipamento;
   - qualquer procedimento que passe por neutralizar intertravamento, válvula
     de segurança, pressostato ou proteção térmica;
   - número que a JB não mediu — preço de peça, prazo de reparo, vida útil,
     "90% dos casos";
   - generalização por marca. Cada texto sai com `appliesTo` vazio, e a página
     avisa que a aplicabilidade não foi declarada. Preencher isso é trabalho da
     bancada, com o manual na mão.

   O que eles fazem: descrever o que dá para observar de fora, dizer quando
   parar de usar, e separar o que é rotina da clínica do que exige bancada.
   ============================================================================ */

export type Pauta = {
  slug: string;
  title: string;
  lead: string;
  topic: "autoclave" | "compressor" | "vacuo" | "compra" | "operacao";
  /** 1 é o que a JB deveria publicar primeiro. */
  prioridade: 1 | 2 | 3;
  /** Por que esta prioridade. Vai para o calendário editorial. */
  razaoDaPrioridade: string;
  body: string;
  /** O que falta antes de este texto poder ir ao ar. */
  pendente: string;
};

/* ------------------------------------------------------------- autoclave */

export const PAUTAS: Pauta[] = [
  {
    slug: "autoclave-nao-aquece",
    title: "Autoclave não aquece: o que observar e quando chamar a assistência",
    lead: "O ciclo começa, mas a temperatura não sobe. O que dá para conferir na clínica, o que não dá, e por que o instrumental do dia precisa sair de circulação.",
    topic: "autoclave",
    prioridade: 1,
    razaoDaPrioridade:
      "É a falha que para a clínica no mesmo dia e a que mais chega por telefone. Um texto que ajude a separar 'tomada' de 'resistência' economiza uma visita e evita o oposto: instrumental reprocessado num ciclo que não esterilizou.",
    body: `
<h2>A primeira coisa não é o defeito, é o instrumental</h2>
<p>Se o ciclo terminou sem atingir a temperatura, o que estava dentro <strong>não está esterilizado</strong>, mesmo que a câmara esteja quente e o indicador de porta tenha fechado. Separe esse material, identifique-o e reprocesse em outro equipamento antes de qualquer coisa. É a decisão que não pode esperar o técnico.</p>
<p>A partir daí, o problema é do equipamento, e ele pode esperar.</p>

<h2>O que dá para observar sem abrir nada</h2>
<p>Quatro observações que qualquer pessoa da clínica pode fazer e que mudam o que o técnico vai levar na maleta:</p>
<ul>
  <li><strong>O display liga e o ciclo inicia?</strong> Equipamento que não liga é um problema; equipamento que liga, inicia e não aquece é outro. A diferença separa alimentação elétrica de aquecimento.</li>
  <li><strong>Em que temperatura ele empaca?</strong> Parar em 40 °C e parar em 110 °C apontam para lugares diferentes. Anote o número que aparece no display quando a subida estaciona.</li>
  <li><strong>Quanto tempo leva para estacionar?</strong> Uma subida lenta que trava perto do fim não é a mesma coisa que uma que nunca sai do lugar.</li>
  <li><strong>Há disjuntor próprio, e ele está firme?</strong> Autoclave costuma exigir circuito exclusivo. Um disjuntor que desarma sempre no mesmo ponto do ciclo é informação, não coincidência.</li>
</ul>
<p>Anote também o código de erro exato, se houver, e fotografe o display. Código lido por telefone chega errado com frequência.</p>

<h2>O que é rotina da clínica</h2>
<p>Duas causas comuns não são defeito e a própria clínica resolve:</p>
<ul>
  <li><strong>Nível de água abaixo do mínimo.</strong> Vários modelos interrompem ou nem iniciam o aquecimento. Confira o reservatório e complete com água destilada, conforme o manual do seu equipamento.</li>
  <li><strong>Alimentação compartilhada.</strong> Extensão, filtro de linha e tomada dividida com outro aparelho de alta corrente derrubam a tensão sob carga. Se a autoclave está numa régua, essa é a primeira coisa a mudar.</li>
</ul>

<h2>O que depende de diagnóstico técnico</h2>
<p>Resistência, sensor de temperatura, placa de controle, termostato de segurança e contator são componentes internos de um equipamento que trabalha energizado e sob pressão. Avaliar qualquer um deles exige medição com o aparelho aberto, por quem tem instrumento e treinamento para isso. Não há nada aqui que valha a pena tentar sem técnico — e um teste improvisado num equipamento de esterilização pode inutilizar a proteção que existe justamente para o dia em que algo der errado.</p>

<h2>Quando parar de usar</h2>
<p>Pare de usar e chame a assistência se qualquer uma destas acontecer: cheiro de queimado, disjuntor desarmando, água escurecida no reservatório, ruído novo durante o aquecimento, ou dois ciclos seguidos que não atingem a temperatura. Nenhuma delas melhora sozinha, e continuar operando transforma um reparo em uma troca.</p>
`,
    pendente:
      "Confirmar com a bancada as faixas de temperatura mais comuns de parada por família de equipamento; definir marcas e modelos aplicáveis; anexar foto real de display com erro de aquecimento; indicar autor e revisor.",
  },

  {
    slug: "autoclave-nao-pressuriza",
    title: "Autoclave não pressuriza: o que isso significa e o que fazer",
    lead: "A temperatura sobe, mas a pressão não acompanha — ou o ciclo é abortado. Por que os dois andam juntos, e o que precisa ser observado antes de chamar o técnico.",
    topic: "autoclave",
    prioridade: 1,
    razaoDaPrioridade:
      "Vem logo depois de 'não aquece' em volume de chamados, e é a que mais gera reprocessamento indevido: o ciclo parece ter rodado.",
    body: `
<h2>Por que pressão e temperatura andam juntas</h2>
<p>Numa autoclave a vapor, a temperatura de esterilização depende da pressão dentro da câmara. Se a pressão não sobe como deveria, a temperatura indicada pode até aparecer, mas o vapor saturado que esteriliza não se formou nas condições certas. Na prática: <strong>ciclo sem a pressão correta é ciclo não validado</strong>, e o material precisa ser reprocessado.</p>

<h2>O que observar antes de ligar para a assistência</h2>
<ul>
  <li><strong>Sai vapor por algum lugar durante o ciclo?</strong> Por onde? Pela guarnição da porta, pela lateral, por baixo? A resposta muda o diagnóstico inteiro.</li>
  <li><strong>A porta fecha com o esforço de sempre?</strong> Porta que fechou mais fácil que o normal costuma ser guarnição gasta ou mal assentada.</li>
  <li><strong>O ciclo aborta sozinho ou fica preso?</strong> Interrupção com código é uma proteção agindo; travamento sem código é outra conversa.</li>
  <li><strong>Quanto de água havia no reservatório?</strong> Sem água suficiente não há vapor suficiente.</li>
</ul>

<h2>O que a clínica pode resolver</h2>
<p>Guarnição mal encaixada, resíduo na área de vedação e sobrecarga da câmara são causas frequentes e não exigem técnico:</p>
<ul>
  <li>Limpe a guarnição e a superfície de contato da porta com pano macio e água, conforme o manual. Resíduo de embalagem e restos de detergente atrapalham a vedação.</li>
  <li>Confira a carga. Câmara cheia demais, pacotes encostados na parede ou bandejas empilhadas sem espaço impedem a circulação do vapor e mudam o comportamento do ciclo.</li>
  <li>Use água destilada e respeite o nível indicado.</li>
</ul>

<h2>O que exige bancada</h2>
<p>Válvula de segurança, pressostato, eletroválvula, bomba de vácuo (nos modelos que têm) e a integridade da câmara são itens de segurança de um vaso sob pressão. Eles não se testam nem se ajustam com o equipamento em operação, e nenhum deles deve ser desativado ou contornado para "fazer o ciclo rodar". Um equipamento pressurizado com proteção neutralizada é um acidente esperando data.</p>

<h2>Pare de usar se</h2>
<p>Houver vazamento de vapor pela porta durante o ciclo, ruído de escape que não existia, deformação visível na guarnição, ou se o ciclo abortar por falha de pressão mais de uma vez. Nesses casos o equipamento sai de operação até a avaliação técnica — não é excesso de cuidado, é o uso previsto do bom senso com equipamento sob pressão.</p>
`,
    pendente:
      "Revisor técnico precisa confirmar a redação sobre vapor saturado e validação de ciclo; definir modelos aplicáveis; decidir se cabe citar norma de esterilização com referência exata.",
  },

  {
    slug: "autoclave-vazando-vapor",
    title: "Autoclave vazando vapor: onde o vazamento importa e onde ele é urgente",
    lead: "Nem todo escape de vapor é a mesma coisa. O lugar do vazamento decide se é manutenção programável ou parada imediata.",
    topic: "autoclave",
    prioridade: 1,
    razaoDaPrioridade:
      "É o sintoma com maior risco de acidente e o mais fácil de subestimar — muita clínica opera meses com 'aquele vaporzinho da porta'.",
    body: `
<h2>O lugar do vazamento é o diagnóstico</h2>
<p>Vapor escapando de uma autoclave sempre significa que a câmara não está mantendo a condição do ciclo. O que muda de um caso para outro é a urgência.</p>
<ul>
  <li><strong>Pela guarnição da porta.</strong> É o mais comum e costuma ser desgaste ou sujeira na vedação. Ainda assim, é vapor a mais de 100 °C saindo na altura das mãos de quem opera.</li>
  <li><strong>Pela válvula de segurança.</strong> A válvula está fazendo o trabalho dela — o que significa que a pressão passou do ponto. Isso não é o vazamento: é o sintoma de outro problema.</li>
  <li><strong>Por trás, por baixo ou pela lateral.</strong> Vapor saindo de onde não há saída prevista aponta para a estrutura ou para a tubulação interna. É o caso mais sério.</li>
</ul>

<h2>O que fazer agora</h2>
<p>Interrompa o uso, deixe o equipamento completar o resfriamento e a despressurização pelo próprio ciclo, e não abra a porta antes disso. Não tente vedar, apertar, calçar ou envolver nada enquanto o equipamento estiver quente ou pressurizado.</p>
<p>Registre: onde sai o vapor, em que momento do ciclo, se aumentou nas últimas semanas, e se houve troca recente de guarnição. Foto ajuda mais que descrição.</p>

<h2>Guarnição: o que é rotina e o que não é</h2>
<p>Limpar a guarnição e a superfície de vedação faz parte da rotina e está no manual de praticamente todo equipamento. <strong>Trocar</strong> a guarnição é outra história: peça, dimensional e procedimento variam por modelo, e uma guarnição de medida aproximada resolve por uma semana e volta pior. Se a sua clínica troca guarnição internamente, use a peça do fabricante e siga o manual do seu equipamento.</p>

<h2>O que exige técnico</h2>
<p>Vazamento que continua com guarnição nova, vazamento fora da porta, válvula de segurança abrindo em ciclos normais, e qualquer sinal de deformação, corrosão ou mancha de umidade na estrutura. Nenhum deles é ajuste: são avaliação de um vaso de pressão, com o equipamento frio, aberto e fora de operação.</p>

<h2>Não faça</h2>
<p>Não aperte parafusos de porta ou de estrutura com o equipamento quente. Não bloqueie, calce ou substitua válvula de segurança por peça genérica. Não opere "só até sexta". A válvula é o último recurso de um equipamento que trabalha com água acima do ponto de ebulição.</p>
`,
    pendente:
      "Definir se a JB recomenda troca de guarnição pela clínica ou só por técnico — é decisão comercial e de responsabilidade, não redacional; anexar fotos reais de guarnição em bom estado e desgastada; indicar autor e revisor.",
  },

  {
    slug: "quando-trocar-a-guarnicao-da-autoclave",
    title: "Quando avaliar a troca da guarnição da autoclave",
    lead: "A guarnição é peça de desgaste. O que muda de fabricante para fabricante é o critério — e é por isso que este texto não dá um prazo.",
    topic: "autoclave",
    prioridade: 2,
    razaoDaPrioridade:
      "Alta busca e baixa urgência. Bom texto de entrada, mas depende de confirmação por fabricante para não virar recomendação genérica.",
    body: `
<h2>Por que não existe um prazo único</h2>
<p>Guarnição de autoclave é borracha de alta temperatura submetida a ciclos térmicos diários. Ela envelhece por uso, não por calendário: uma clínica que roda três ciclos por dia gasta a peça mais rápido que uma que roda um. Fabricantes publicam critérios diferentes — alguns em número de ciclos, outros em meses, outros só por condição visível.</p>
<p><strong>O prazo que vale é o do manual do seu equipamento.</strong> Qualquer número dito por fora dele é chute com aparência de informação.</p>

<h2>Sinais de que chegou a hora de avaliar</h2>
<ul>
  <li>A porta fecha com menos esforço do que fechava.</li>
  <li>Aparece vapor pela porta durante o ciclo, mesmo pouco.</li>
  <li>A guarnição está achatada, ressecada, com ondulação permanente ou com pequenos cortes.</li>
  <li>Fica marca de umidade na frente do equipamento depois do ciclo.</li>
  <li>O ciclo passou a demorar mais para pressurizar.</li>
</ul>
<p>Nenhum desses sinais sozinho fecha diagnóstico — a mesma sintomatologia aparece em problema de vedação da própria porta, em falha de pressostato e em sobrecarga de câmara. O que eles dizem é que está na hora de olhar.</p>

<h2>O que a rotina de limpeza resolve</h2>
<p>Boa parte do que parece guarnição gasta é guarnição suja. Resíduo de embalagem, sabão e mineral da água se acumulam na área de vedação e impedem o assentamento. A limpeza da guarnição e do encosto dela, com pano macio, na frequência que o manual indicar, é a manutenção mais barata que existe neste equipamento.</p>

<h2>Sobre a peça</h2>
<p>Guarnição é dimensional. Peça de medida aproximada veda por um tempo e depois falha de forma pior — porque o assentamento irregular danifica a superfície de contato. Use a peça indicada pelo fabricante para o seu modelo. Se não houver certeza sobre o código da peça, o número de série do equipamento resolve.</p>

<h2>O que a JB faz</h2>
<p>A JB atende autoclaves de consultório com peça de reposição e avaliação da vedação. Se o seu equipamento está com qualquer um dos sinais acima, abrir um chamado com foto da guarnição e o modelo do aparelho encurta o atendimento — dá para levar a peça certa na primeira visita.</p>
`,
    pendente:
      "A bancada precisa listar os modelos que a JB efetivamente atende com guarnição em estoque, e a periodicidade que cada fabricante publica. Sem isso o texto fica em rascunho.",
  },

  {
    slug: "autoclave-12-ou-21-litros",
    title: "Autoclave de 12 ou 21 litros: como escolher sem errar por excesso ou por falta",
    lead: "O volume da câmara não é o número que decide. O que decide é quantos ciclos o seu dia comporta.",
    topic: "compra",
    prioridade: 2,
    razaoDaPrioridade:
      "Pauta comercial de conversão alta, e conecta direto com o catálogo. Depende só de revisão — não afirma nada sobre defeito.",
    body: `
<h2>A pergunta certa não é o litro</h2>
<p>Duas clínicas com o mesmo volume de atendimento podem precisar de autoclaves diferentes, porque o que aperta não é o volume da câmara: é <strong>quantas vezes por dia o instrumental precisa estar pronto</strong>. Um ciclo completo, com secagem, leva bem mais que o tempo entre dois pacientes.</p>
<p>Antes de escolher, some três coisas: quantos kits completos você usa num dia cheio, quantos kits você tem em circulação, e quanto tempo o seu ciclo leva do início à retirada.</p>

<h2>Quando 12 litros basta</h2>
<ul>
  <li>Consultório com uma cadeira e agenda previsível.</li>
  <li>Instrumental suficiente para cobrir o intervalo de um ciclo inteiro.</li>
  <li>Procedimentos que não exigem grande volume de material por atendimento.</li>
</ul>
<p>A vantagem não é só preço: câmara menor aquece mais rápido e consome menos água e energia por ciclo.</p>

<h2>Quando 21 litros compensa</h2>
<ul>
  <li>Mais de uma cadeira, ou agenda com picos.</li>
  <li>Procedimentos com muito instrumental por atendimento — cirurgia, endodontia com vários kits.</li>
  <li>Rotina em que hoje se roda mais de um ciclo seguido para dar conta do dia.</li>
</ul>
<p>Rodar dois ciclos onde caberia um custa mais tempo de equipe do que a diferença de preço entre os dois equipamentos costuma representar ao longo de um ano.</p>

<h2>O que olhar além do volume</h2>
<ul>
  <li><strong>Tempo total de ciclo, com secagem.</strong> É o número que governa a sua agenda, não a capacidade.</li>
  <li><strong>Espaço e ponto elétrico.</strong> Autoclave costuma pedir circuito próprio. Confira a exigência do modelo antes de comprar, não depois da entrega.</li>
  <li><strong>Assistência e peça.</strong> Equipamento com peça disponível e técnico que atende a sua região vale mais que uma ficha técnica melhor sem suporte.</li>
  <li><strong>Registro e documentação.</strong> Equipamento para uso odontológico precisa de registro regulatório válido e manual do fabricante.</li>
</ul>

<h2>O erro mais caro dos dois lados</h2>
<p>Comprar pequeno demais gera fila e tentação de encurtar ciclo — que é onde o risco aparece. Comprar grande demais gera ciclos meio vazios, mais consumo e um equipamento que custou o que não precisava. Os dois se evitam com a mesma conta de cinco minutos: kits por dia, kits em circulação, tempo de ciclo.</p>
`,
    pendente:
      "Conferir com a equipe comercial se a JB quer indicar modelos específicos neste texto; sem essa decisão, o artigo fica sem CTA de produto e não deve ser publicado como comparativo.",
  },

  {
    slug: "orcamento-de-manutencao-de-autoclave",
    title: "O que compõe um orçamento de manutenção de autoclave",
    lead: "Por que dois orçamentos do mesmo equipamento chegam com valores diferentes, e o que precisa estar escrito em qualquer um deles.",
    topic: "operacao",
    prioridade: 2,
    razaoDaPrioridade:
      "Constrói confiança e diminui atrito comercial. Não afirma nada sobre valores — descreve estrutura, que é o que a JB pode sustentar.",
    body: `
<h2>Um orçamento tem quatro partes</h2>
<p>Independentemente de quem atende, um orçamento de manutenção de autoclave se decompõe em quatro coisas. Quando alguma delas não está escrita, a diferença entre dois orçamentos é impossível de avaliar.</p>
<ol>
  <li><strong>Diagnóstico.</strong> O tempo de avaliar o equipamento e identificar a causa. Alguns serviços cobram à parte, outros abatem no reparo. As duas formas são legítimas — o que não é legítimo é não dizer qual delas se aplica.</li>
  <li><strong>Peças.</strong> Quais, de qual fabricante, e se são originais ou equivalentes. Peça é o item que mais varia entre orçamentos, e o que mais muda o resultado a longo prazo.</li>
  <li><strong>Mão de obra.</strong> O serviço em si, com o tempo estimado.</li>
  <li><strong>Deslocamento, quando há.</strong> Atendimento no local tem custo de ida; atendimento em bancada tem custo de transporte do equipamento.</li>
</ol>

<h2>O que precisa estar explícito</h2>
<ul>
  <li>O que está incluído <em>e</em> o que não está.</li>
  <li>A garantia do serviço: prazo e o que ela cobre. Garantia de peça e garantia de serviço são coisas diferentes.</li>
  <li>Se o valor é fechado ou estimado, e o que acontece se aparecer outro problema durante o reparo.</li>
  <li>Prazo, e de quando ele começa a contar — da aprovação ou da chegada da peça.</li>
  <li>Validade da proposta.</li>
</ul>

<h2>Por que dois orçamentos divergem tanto</h2>
<p>Quase sempre por uma destas razões, e vale perguntar qual é:</p>
<ul>
  <li>Um inclui peça original e o outro equivalente.</li>
  <li>Um resolve a causa e o outro trata o sintoma — trocar a peça que queimou sem investigar por que ela queimou é mais barato hoje e mais caro em três meses.</li>
  <li>Um prevê teste final documentado e o outro entrega o equipamento "funcionando".</li>
  <li>Um tem garantia e o outro não.</li>
</ul>

<h2>O que pedir sempre</h2>
<p>Peça o registro do que foi feito: o que foi diagnosticado, o que foi substituído e como o equipamento foi testado antes de voltar. Numa autoclave isso não é burocracia — é o documento que sustenta a rotina de esterilização da clínica, e é o que permite comparar o histórico do aparelho quando o próximo problema aparecer.</p>

<h2>Como a JB trabalha</h2>
<p>Todo atendimento gera ordem de serviço com diagnóstico, peças, serviço executado e testes. O histórico fica no prontuário do equipamento, na Área da Clínica, e continua acessível depois — inclusive para comparar com o próximo orçamento, seja ele da JB ou não.</p>
`,
    pendente:
      "Confirmar com a operação a política de garantia de serviço e de cobrança de diagnóstico, para o último bloco descrever o que a JB realmente pratica.",
  },

  {
    slug: "reparar-ou-substituir-um-equipamento",
    title: "Reparar ou substituir: como decidir sem chutar",
    lead: "A conta não é só o valor do reparo contra o do equipamento novo. Faltam três variáveis que quase ninguém coloca na planilha.",
    topic: "compra",
    prioridade: 2,
    razaoDaPrioridade:
      "É a dúvida que aparece em todo orçamento alto. Um texto honesto aqui evita tanto o reparo perdido quanto a troca precipitada.",
    body: `
<h2>A conta que quase todo mundo faz</h2>
<p>Custo do reparo contra preço do equipamento novo. Se o reparo passa de um terço, troca-se. É uma regra de bolso, e como toda regra de bolso ela acerta na média e erra nos casos que importam.</p>

<h2>As três variáveis que faltam</h2>
<ol>
  <li><strong>Quanto tempo o equipamento ainda tem.</strong> Um reparo de valor médio num aparelho no fim da vida útil é dinheiro adiantado para um problema que volta. O mesmo reparo num equipamento com metade da vida pela frente é barato.</li>
  <li><strong>Quantas vezes ele já parou.</strong> Duas panes em doze meses no mesmo equipamento raramente são coincidência. O terceiro reparo costuma vir antes do que se espera, e o custo real é a soma dos três — mais os dias parados.</li>
  <li><strong>Quanto custa o dia parado.</strong> Um equipamento que interrompe a agenda tem um custo por dia que raramente entra na conta, e que muitas vezes é maior que a diferença entre reparar e trocar.</li>
</ol>

<h2>Quando reparar quase sempre compensa</h2>
<ul>
  <li>Falha isolada, causa identificada, peça disponível.</li>
  <li>Equipamento com histórico limpo e uso dentro do previsto.</li>
  <li>Reparo com garantia de serviço escrita.</li>
</ul>

<h2>Quando substituir costuma ser o certo</h2>
<ul>
  <li>Peça descontinuada — reparo que depende de peça que não existe mais tem prazo de validade curto, mesmo que funcione hoje.</li>
  <li>Reparos repetidos em subsistemas diferentes: não é uma falha, é o conjunto envelhecendo.</li>
  <li>Equipamento sem manual, sem registro regulatório válido ou sem assistência disponível na região.</li>
  <li>Reparo estrutural em vaso de pressão. Aqui o critério não é econômico.</li>
</ul>

<h2>A alternativa que costuma ficar de fora</h2>
<p>Entre reparar o que está lá e comprar um novo existe o seminovo revisado — que resolve o custo do dia parado sem o desembolso de um equipamento de linha. Vale para clínicas que precisam de um segundo aparelho de contingência, e vale principalmente para quem descobriu, na pane, que não tem plano B.</p>

<h2>O que pedir antes de decidir</h2>
<p>Peça um diagnóstico escrito com a causa, não só o orçamento com a peça. Causa identificada é o que permite responder à única pergunta que decide: <em>isso vai acontecer de novo?</em> Um orçamento que não responde a isso não sustenta a decisão, por mais detalhado que pareça.</p>
`,
    pendente:
      "Revisor precisa validar os critérios de substituição, sobretudo o de reparo estrutural em vaso de pressão. Definir se o texto pode citar o comparador e a calculadora de parada.",
  },

  {
    slug: "compressor-odontologico-com-ruido-incomum",
    title: "Compressor odontológico com ruído incomum: o que o som indica",
    lead: "Compressor faz barulho por natureza. O que importa é o barulho que mudou — e há três tipos de mudança que significam coisas diferentes.",
    topic: "compressor",
    prioridade: 1,
    razaoDaPrioridade:
      "Sintoma precoce: quem age no ruído evita a pane que para a clínica. É o texto de maior valor preventivo da lista.",
    body: `
<h2>O ruído que importa é o que mudou</h2>
<p>Nenhum compressor é silencioso. O sinal útil não é o volume absoluto, é a diferença: um som que não existia semana passada, ou um som de sempre que ficou mais alto, mais grave ou mais irregular.</p>
<p>Se possível, grave um áudio de dez segundos com o celular perto do equipamento, e anote quando o ruído aparece — na partida, durante o enchimento, ou o tempo todo.</p>

<h2>Três tipos de mudança</h2>
<ul>
  <li><strong>Batida metálica ritmada, acompanhando a rotação.</strong> Costuma indicar folga em parte móvel. É o tipo que piora rápido e que mais compensa atender cedo.</li>
  <li><strong>Chiado ou assobio contínuo.</strong> Em geral é ar escapando por alguma conexão. Não é dramático, mas faz o compressor trabalhar muito mais que o necessário — e o desgaste vem daí.</li>
  <li><strong>Vibração e trepidação do conjunto.</strong> Frequentemente é fixação, coxim ou apoio, e não o motor. Compressor apoiado torto ou com amortecedor ressecado vibra a estrutura inteira e desgasta o que está preso nela.</li>
</ul>

<h2>O que a clínica pode conferir</h2>
<ul>
  <li>O equipamento está nivelado e apoiado nos amortecedores originais?</li>
  <li>Há algo encostado nele — parede, caixa, tubulação forçada?</li>
  <li>O ambiente tem ventilação? Compressor em armário fechado esquenta, e compressor quente muda de som.</li>
  <li>O dreno está sendo feito na rotina? Reservatório com água acumulada muda o comportamento e a vida do equipamento.</li>
</ul>

<h2>O que exige técnico</h2>
<p>Qualquer avaliação interna. Compressor é um conjunto que trabalha energizado, com partes girando e ar sob pressão; abrir o cabeçote, mexer em válvula, ajustar pressostato ou tensionar correia sem despressurizar e desenergizar corretamente é como as mãos se machucam nesse equipamento. Também não se opera um compressor com proteção térmica desativada ou com válvula de segurança bloqueada — as duas existem exatamente para o dia em que algo travar.</p>

<h2>Pare de usar se</h2>
<p>Houver cheiro de queimado, fumaça, disjuntor desarmando, ruído de raspagem metálica, ou se o equipamento estiver visivelmente quente demais para encostar. Nesses casos desligue na chave e chame a assistência: continuar operando geralmente troca um reparo de peça por um reparo de conjunto.</p>
`,
    pendente:
      "A bancada precisa confirmar a correspondência entre tipo de ruído e causa provável antes da publicação — a redação atual foi escrita de forma deliberadamente conservadora, sem afirmar causa única.",
  },

  {
    slug: "compressor-nao-mantem-pressao",
    title: "Compressor não mantém pressão: onde o ar está indo",
    lead: "O compressor enche, desliga, e pouco depois liga de novo sem ninguém usar nada. Isso tem um nome, e tem um teste que a própria clínica pode fazer.",
    topic: "compressor",
    prioridade: 1,
    razaoDaPrioridade:
      "Sintoma frequente, com um teste de observação simples e seguro que a clínica pode executar — o que reduz visita improdutiva.",
    body: `
<h2>O sintoma, com precisão</h2>
<p>Compressor sadio enche o reservatório, desliga e fica desligado até o ar ser consumido. Se ele volta a ligar sozinho com a clínica parada, há ar saindo por algum lugar. O quanto ele "cai" e em quanto tempo é a informação mais útil que existe para quem vai atender.</p>

<h2>O teste que a clínica pode fazer</h2>
<p>Com a clínica fechada e nenhum equipamento em uso:</p>
<ol>
  <li>Espere o compressor completar o enchimento e desligar.</li>
  <li>Anote a pressão indicada no manômetro e a hora.</li>
  <li>Anote de novo depois de trinta minutos, sem usar nada.</li>
</ol>
<p>Queda pequena e lenta é diferente de queda rápida, e as duas apontam para lugares diferentes. Leve os dois números para o atendimento — eles valem mais que qualquer descrição.</p>

<h2>Onde o ar costuma escapar</h2>
<ul>
  <li><strong>Na rede da clínica</strong>, não no compressor: conexões, engates rápidos, tubulação e as próprias canetas. Uma clínica com várias cadeiras tem muitas juntas.</li>
  <li><strong>No reservatório e nas conexões dele.</strong></li>
  <li><strong>Nas válvulas do compressor.</strong> Aqui já é bancada.</li>
</ul>
<p>Uma verificação simples: feche o registro que separa o compressor da rede, se houver, e repita o teste dos trinta minutos. Se a pressão para de cair, o vazamento está na rede. Se continua caindo, está no compressor. Essa única informação encurta o atendimento pela metade.</p>

<h2>O que exige técnico</h2>
<p>Válvula de retenção, válvula de alívio, pressostato, cabeçote e o próprio reservatório. Reservatório de ar comprimido é vaso de pressão: avaliação de corrosão, dreno emperrado e integridade estrutural não é serviço de rotina, e não se resolve apertando nada com o equipamento pressurizado.</p>

<h2>O que a rotina evita</h2>
<p>Drenar a água do reservatório na frequência que o manual indicar é o cuidado mais barato e o mais esquecido. Água parada corrói o reservatório por dentro, onde ninguém vê, e transforma um equipamento que duraria anos num que precisa ser substituído por segurança.</p>
`,
    pendente:
      "Confirmar se a orientação de fechar o registro de separação se aplica às instalações que a JB atende — nem toda clínica tem esse registro. Definir modelos aplicáveis.",
  },

  {
    slug: "agua-na-linha-do-compressor",
    title: "Água na linha do compressor: por que aparece e o que ela estraga",
    lead: "Ar comprimido carrega umidade. Onde essa água vai parar decide se o problema fica no compressor ou chega à caneta.",
    topic: "compressor",
    prioridade: 1,
    razaoDaPrioridade:
      "Alto impacto e baixa percepção: a clínica só descobre quando a peça de mão já sofreu. Texto preventivo de retorno claro.",
    body: `
<h2>De onde vem a água</h2>
<p>O ar atmosférico tem umidade. Ao ser comprimido e depois resfriar dentro do reservatório, parte dessa umidade condensa e vira água líquida. Isso não é defeito: acontece em todo compressor, todo dia, e é mais intenso em clínica com ambiente úmido ou quente.</p>
<p>O que é defeito — ou falha de rotina — é essa água ficar onde não deveria.</p>

<h2>O que ela estraga, na ordem</h2>
<ul>
  <li><strong>O reservatório</strong>, por dentro, por corrosão. É o dano invisível e o mais sério, porque afeta um vaso sob pressão.</li>
  <li><strong>A rede de ar</strong>, com pontos de oxidação que soltam partícula.</li>
  <li><strong>As peças de mão.</strong> Umidade e partícula em turbina custam caro e chegam sem aviso.</li>
  <li><strong>O ar do procedimento.</strong> Ar com condensado chegando ao paciente é o motivo pelo qual filtro e secagem existem.</li>
</ul>

<h2>O que é rotina da clínica</h2>
<ul>
  <li><strong>Drenar o reservatório</strong> na frequência que o manual do seu equipamento indicar — em muitos, diariamente ao fim do expediente. É uma operação prevista, com dreno próprio, feita na condição que o manual descreve.</li>
  <li><strong>Observar o que sai.</strong> Água limpa é esperado. Água escura, oleosa ou com partícula não é, e vale relatar.</li>
  <li><strong>Verificar o filtro ou secador</strong>, quando o equipamento tem, conforme a periodicidade do fabricante.</li>
</ul>

<h2>Quando é sinal de outra coisa</h2>
<p>Água em excesso, água chegando às canetas, ou dreno que não sai nada quando deveria sair — os três apontam para problema além da rotina: dreno obstruído, secador saturado, ou compressor trabalhando muito mais do que deveria por causa de vazamento na rede. O último é comum e tem cara de problema de umidade.</p>

<h2>O que exige técnico</h2>
<p>Dreno emperrado, avaliação de corrosão interna do reservatório, troca de elemento de filtro e qualquer suspeita de comprometimento estrutural. Reservatório corroído não se recupera e não se opera "com cuidado": ele se substitui.</p>
`,
    pendente:
      "Definir com a operação se a JB oferece avaliação de rede de ar comprimido como serviço — o texto sugere isso implicitamente e não deve sugerir se não existir. Indicar autor e revisor.",
  },

  {
    slug: "dimensionamento-de-compressor-para-a-clinica",
    title: "Dimensionamento de compressor: quantas cadeiras cabem no seu",
    lead: "O número de cadeiras não basta para escolher um compressor. O que decide é o consumo simultâneo — e ele depende do que a clínica faz.",
    topic: "compressor",
    prioridade: 2,
    razaoDaPrioridade:
      "Pauta de compra e de projeto, com bom retorno comercial. Precisa de dados de fabricante, então depende de levantamento antes de publicar.",
    body: `
<h2>Por que "compressor para 3 cadeiras" não é uma especificação</h2>
<p>Três cadeiras atendendo clínica geral consomem ar de forma muito diferente de três cadeiras fazendo procedimento com alta rotação simultânea. O que o compressor precisa entregar é <strong>vazão</strong> — quanto ar por minuto — na <strong>pressão de trabalho</strong> que os equipamentos exigem, considerando quantos deles funcionam ao mesmo tempo.</p>

<h2>Os quatro números do dimensionamento</h2>
<ol>
  <li><strong>Consumo de cada equipamento.</strong> Está no manual do fabricante de cada peça — caneta de alta, micromotor, seringa tríplice, e o que mais usar ar.</li>
  <li><strong>Simultaneidade real.</strong> Nem tudo funciona junto. Uma clínica de três cadeiras raramente tem três altas girando no mesmo segundo — mas precisa suportar quando tiver.</li>
  <li><strong>Pressão mínima de trabalho.</strong> O equipamento mais exigente da clínica define o piso.</li>
  <li><strong>Reservatório.</strong> Ele absorve os picos. Reservatório pequeno com bom motor faz o compressor ligar o tempo todo, e isso encurta a vida dele.</li>
</ol>

<h2>Os erros de dimensionamento, dos dois lados</h2>
<ul>
  <li><strong>Pequeno demais:</strong> o compressor não desliga, a pressão cai no meio do procedimento, o desgaste acelera e o ruído incomoda o dia inteiro.</li>
  <li><strong>Grande demais:</strong> consumo elétrico maior, mais espaço, mais ruído na partida e dinheiro parado — sem ganho nenhum de desempenho.</li>
</ul>

<h2>O que não entra na conta e deveria</h2>
<ul>
  <li><strong>A rede de ar.</strong> Tubulação subdimensionada ou com muitas curvas derruba a pressão que chega à cadeira, mesmo com o compressor certo.</li>
  <li><strong>Vazamentos.</strong> Uma rede com fugas faz um compressor bem dimensionado se comportar como um pequeno.</li>
  <li><strong>Crescimento previsto.</strong> Se a quarta cadeira entra no ano que vem, ela entra na conta agora — trocar compressor depois custa mais do que a diferença hoje.</li>
  <li><strong>Onde ele vai ficar.</strong> Ventilação, ruído e acesso para manutenção. Compressor em armário fechado esquenta e vive menos.</li>
</ul>

<h2>Como fazer certo</h2>
<p>Some o consumo dos equipamentos que podem operar juntos, aplique o fator de simultaneidade da sua rotina, confirme a pressão mínima exigida e escolha um equipamento com folga — não com o dobro. Os requisitos de cada peça saem do manual do respectivo fabricante; não há atalho confiável para esse levantamento.</p>
`,
    pendente:
      "Este texto precisa de uma tabela de consumo por tipo de equipamento para ser realmente útil, e a tabela tem de vir de manuais de fabricante — não pode ser estimada. Enquanto ela não existir, o artigo fica em rascunho.",
  },

  {
    slug: "bomba-de-vacuo-perdeu-forca",
    title: "Bomba de vácuo perdeu força: por onde começar",
    lead: "A sucção caiu e o atendimento ficou mais difícil. Antes de suspeitar da bomba, há três lugares mais prováveis.",
    topic: "vacuo",
    prioridade: 2,
    razaoDaPrioridade:
      "Sintoma comum cuja causa quase nunca é a bomba. O texto evita troca desnecessária de equipamento.",
    body: `
<h2>Quase nunca é a bomba</h2>
<p>Perda de sucção é o sintoma; a bomba é apenas um dos lugares possíveis, e costuma ser o último. Antes dela vêm a rede, os filtros e os pontos de uso — e são eles que a clínica consegue verificar.</p>

<h2>Os três lugares mais prováveis</h2>
<ol>
  <li><strong>Filtros e coletores.</strong> Filtro saturado é a causa mais frequente de queda gradual. Cada modelo tem os seus, e o manual diz onde ficam e com que frequência limpar ou trocar.</li>
  <li><strong>Entrada de ar falsa.</strong> Uma ponteira mal encaixada, uma tampa de coletor frouxa ou uma mangueira rachada faz o sistema puxar ar do lugar errado. O sintoma aparece em todas as cadeiras ao mesmo tempo.</li>
  <li><strong>Obstrução.</strong> Resíduo acumulado na linha reduz a passagem. O sintoma costuma ser localizado numa cadeira só.</li>
</ol>

<h2>Uma pergunta que separa tudo</h2>
<p>A perda é em <strong>todas</strong> as cadeiras ou em <strong>uma</strong>? Em todas, o problema é do sistema — bomba, filtro central, entrada de ar falsa. Em uma, é do ramal daquela cadeira. Essa resposta sozinha elimina metade das hipóteses, e é a primeira coisa que o técnico vai perguntar.</p>

<h2>O que é rotina da clínica</h2>
<ul>
  <li>Higienização das linhas com a solução e a frequência que o fabricante indica.</li>
  <li>Limpeza dos coletores e conferência das vedações.</li>
  <li>Verificação das ponteiras e das mangueiras — ressecamento e trinca são visíveis.</li>
  <li>Troca de filtro conforme o manual.</li>
</ul>

<h2>O que exige técnico</h2>
<p>Avaliação da bomba propriamente dita, medição de vácuo no sistema, verificação de motor, de vedações internas e da rede embutida. Bomba de vácuo é equipamento energizado; sistema de sucção lida com material biológico. Nenhum dos dois se abre no intervalo entre pacientes.</p>

<h2>Não deixe passar</h2>
<p>Aquecimento anormal, ruído novo, cheiro de queimado, disjuntor desarmando, ou queda de sucção acompanhada de retorno de líquido. Esses casos saem de operação na hora — retorno em sistema de sucção é problema de biossegurança, não de conforto.</p>
`,
    pendente:
      "Confirmar com a bancada que tipos de bomba de vácuo a JB atende (a seco, a úmido, anel líquido) — o texto está escrito de forma genérica e precisa dessa delimitação antes de publicar.",
  },

  {
    slug: "succao-odontologica-com-desempenho-reduzido",
    title: "Sucção com desempenho reduzido: sistema, ramal ou ponteira",
    lead: "Três níveis, três causas diferentes, três encaminhamentos. Descobrir qual é leva cinco minutos e evita a visita errada.",
    topic: "vacuo",
    prioridade: 3,
    razaoDaPrioridade:
      "Complementa o texto da bomba. Boa pauta de aprofundamento, mas o assunto já é parcialmente coberto — publicar depois.",
    body: `
<h2>Comece pelo nível</h2>
<p>Sucção fraca pode ser de três alcances diferentes, e cada um leva a um lugar:</p>
<ul>
  <li><strong>Ponteira:</strong> só naquele terminal.</li>
  <li><strong>Ramal:</strong> naquela cadeira, em todas as ponteiras dela.</li>
  <li><strong>Sistema:</strong> em todas as cadeiras.</li>
</ul>
<p>Teste trocando a ponteira de lugar. Se o problema segue a ponteira, é ela. Se fica na cadeira, é o ramal. Se está em toda parte, é o sistema.</p>

<h2>Nível da ponteira</h2>
<p>Vedação ressecada, encaixe frouxo, corpo trincado ou obstrução interna. É o nível mais barato e o mais rápido de resolver. Ponteira é item de desgaste e tem prazo de troca no manual.</p>

<h2>Nível do ramal</h2>
<p>Mangueira dobrada, trincada ou com acúmulo; conexão da cadeira frouxa; coletor daquela unidade sujo ou mal fechado. Vale conferir também se a válvula do ramal está totalmente aberta — em clínica com manutenção recente, ramal parcialmente fechado é achado comum.</p>

<h2>Nível do sistema</h2>
<p>Filtro central saturado, entrada de ar falsa em algum ponto, obstrução na rede principal ou queda de desempenho da bomba. Aqui a clínica faz a rotina de limpeza e filtro prevista no manual; o resto é bancada.</p>

<h2>Rotina que previne quase tudo</h2>
<p>A maior parte das perdas de sucção é acúmulo, e acúmulo é consequência de rotina de higienização irregular. A solução, a diluição e a frequência são as que o fabricante do seu sistema indica — usar produto diferente do previsto ataca vedação e piora exatamente o que se quer resolver.</p>

<h2>Quando parar</h2>
<p>Retorno de líquido, cheiro forte persistente mesmo após a higienização, ou ruído anormal na central. Sistema de sucção lida com material biológico, e um sistema com retorno não é um sistema com desempenho reduzido: é um sistema fora de condição de uso.</p>
`,
    pendente:
      "Precisa de revisão sobre a parte de biossegurança e da confirmação de que o teste de troca de ponteira é aplicável aos sistemas que a JB atende.",
  },

  {
    slug: "novo-ou-seminovo-como-comparar",
    title: "Novo ou seminovo: como comparar sem se enganar",
    lead: "A diferença de preço é a parte fácil. O que precisa ser comparado é o que cada um garante — e o que cada um exige de você depois.",
    topic: "compra",
    prioridade: 2,
    razaoDaPrioridade:
      "Sustenta o programa de seminovos e é a pauta que mais precisa de honestidade para não soar como peça de venda.",
    body: `
<h2>O que o preço não diz</h2>
<p>Um seminovo custa menos porque já foi usado. Isso é óbvio e é o menos importante. O que decide a compra é o que vem junto do preço em cada caso: garantia, procedência, disponibilidade de peça e o que se sabe sobre o histórico daquele aparelho.</p>

<h2>Compare estas seis coisas, e não só o valor</h2>
<ol>
  <li><strong>Garantia.</strong> Prazo, o que cobre e quem executa. Garantia de fabricante e garantia de quem revendeu são coisas diferentes, e a segunda depende de a empresa existir daqui a um ano.</li>
  <li><strong>Procedência.</strong> De onde veio o equipamento e o que foi feito nele. "Revisado" sem lista do que foi revisado é uma palavra, não uma informação.</li>
  <li><strong>Peça de reposição.</strong> Equipamento fora de linha pode ter peça escassa. É o que transforma um bom negócio numa dor de cabeça no terceiro ano.</li>
  <li><strong>Registro regulatório.</strong> Equipamento odontológico precisa de registro válido, seja novo ou usado.</li>
  <li><strong>Documentação.</strong> Manual, nota, e — no seminovo — o registro do que foi inspecionado.</li>
  <li><strong>Assistência na sua região.</strong> Um equipamento sem quem atenda perto custa dias parados, e dia parado é a despesa que ninguém orça.</li>
</ol>

<h2>Quando o novo compensa mais</h2>
<ul>
  <li>Equipamento que a clínica vai usar em capacidade máxima todos os dias.</li>
  <li>Quando a garantia longa do fabricante for parte do plano — sobretudo em equipamento de esterilização.</li>
  <li>Quando não há seminovo do mesmo porte com procedência documentada.</li>
</ul>

<h2>Quando o seminovo é a escolha melhor</h2>
<ul>
  <li>Segundo equipamento, de contingência: o que resolve o dia da pane.</li>
  <li>Clínica em implantação, com capital curto e necessidade real de mais de um aparelho.</li>
  <li>Modelo robusto e com peça disponível, revisado e com o que foi feito registrado.</li>
</ul>

<h2>A pergunta que separa um bom seminovo de um risco</h2>
<p><em>O que exatamente foi verificado neste aparelho, e por quem?</em> Se a resposta for uma lista de itens com o resultado de cada um, dá para avaliar. Se for "está tudo certo", não dá — e o que não dá para conferir não deveria contar na decisão.</p>

<h2>Como a JB trata isso</h2>
<p>Os seminovos do programa Seminovo JB Certificado saem com o checklist de inspeção, o número de itens verificados e o técnico responsável, e a certificação é conferível por um código na página do equipamento. Seminovo que não passou pelo programa aparece como seminovo, sem selo — o selo não é retroativo, e um equipamento que ninguém inspecionou não vira inspecionado por decisão comercial.</p>
`,
    pendente:
      "Revisor comercial precisa confirmar a redação sobre garantia de seminovo. Falta também definir se o texto cita a página pública de verificação por nome.",
  },

  {
    slug: "checklist-antes-de-comprar-autoclave",
    title: "Checklist antes de comprar uma autoclave",
    lead: "Dez perguntas que evitam as três surpresas mais caras: o ponto elétrico, o tempo de ciclo e a peça que ninguém tem.",
    topic: "compra",
    prioridade: 2,
    razaoDaPrioridade:
      "Formato prático e de alta utilidade. Depende só de revisão e de confirmar o que a JB entrega junto do equipamento.",
    body: `
<h2>Antes do modelo, a rotina</h2>
<ol>
  <li><strong>Quantos kits completos a clínica usa num dia cheio?</strong> É o número que dimensiona tudo.</li>
  <li><strong>Quantos kits existem em circulação?</strong> Instrumental de sobra compensa câmara menor; instrumental justo exige ciclo mais rápido ou câmara maior.</li>
  <li><strong>Qual o tempo total do ciclo, com secagem?</strong> Peça o número do fabricante, não a estimativa do vendedor. É ele que governa a agenda.</li>
</ol>

<h2>Antes da entrega, o local</h2>
<ol start="4">
  <li><strong>Há ponto elétrico adequado?</strong> Tensão, corrente e circuito exclusivo, conforme o manual do modelo. Autoclave em régua compartilhada é a causa de problema mais frequente e mais evitável.</li>
  <li><strong>O espaço comporta o equipamento com folga de ventilação e de abertura de porta?</strong> Medida da bancada, não estimativa.</li>
  <li><strong>Como a água vai ser abastecida?</strong> Água destilada, e a rotina de quem completa o reservatório.</li>
</ol>

<h2>Antes de fechar, o que vem junto</h2>
<ol start="7">
  <li><strong>Registro regulatório válido e manual do fabricante em português.</strong> Sem os dois, não feche.</li>
  <li><strong>Garantia: prazo, cobertura e quem executa.</strong> Garantia com assistência distante é garantia com dias parados embutidos.</li>
  <li><strong>Peça de reposição disponível?</strong> Pergunte especificamente por guarnição e por sensores. São os itens que mais param equipamento.</li>
  <li><strong>Instalação: está inclusa, é opcional ou não é oferecida?</strong> E o que exatamente ela inclui.</li>
</ol>

<h2>Três surpresas que este checklist evita</h2>
<ul>
  <li><strong>O ponto elétrico.</strong> Descobrir na entrega que falta circuito exclusivo atrasa a operação em dias e custa obra.</li>
  <li><strong>O tempo de ciclo.</strong> Equipamento com ciclo mais longo do que a agenda comporta gera fila permanente — e é irreversível sem trocar o aparelho.</li>
  <li><strong>A peça que ninguém tem.</strong> Modelo importado sem representação, ou fora de linha, transforma manutenção simples em espera de semanas.</li>
</ul>

<h2>O que não decide</h2>
<p>Cor, quantidade de programas pré-configurados e detalhes de painel raramente mudam a rotina. Câmara, ciclo, ponto elétrico e assistência mudam todos os dias.</p>
`,
    pendente:
      "Confirmar com a equipe comercial o que a JB entrega junto do equipamento (instalação, treinamento, primeira preventiva) para o texto poder terminar com o que é verdade sobre a JB.",
  },

  {
    slug: "como-avaliar-equipamento-odontologico-seminovo",
    title: "Como avaliar um equipamento odontológico seminovo",
    lead: "O que olhar, o que pedir e — principalmente — o que uma inspeção séria produz como evidência.",
    topic: "compra",
    prioridade: 1,
    razaoDaPrioridade:
      "É o texto que sustenta a credibilidade do programa de seminovos. Deveria estar entre os primeiros a ir ao ar.",
    body: `
<h2>Avaliação não é aparência</h2>
<p>Equipamento limpo e com pintura boa diz pouco sobre o que importa. O que importa é o que foi verificado, com que critério, e o que a verificação encontrou. Aparência é o que se recupera mais fácil; o resto, não.</p>

<h2>O que pedir a quem vende</h2>
<ol>
  <li><strong>A lista do que foi inspecionado</strong>, item a item, com o resultado de cada um. Não "revisado": <em>o que</em> foi verificado.</li>
  <li><strong>O que foi substituído</strong>, e por qual peça.</li>
  <li><strong>Quem inspecionou.</strong> Nome de quem responde tecnicamente.</li>
  <li><strong>Número de série</strong>, para conferir modelo, ano e histórico.</li>
  <li><strong>Testes finais</strong> e o que eles verificaram.</li>
  <li><strong>Garantia</strong>: prazo, cobertura e executor.</li>
</ol>
<p>Uma inspeção que não produz nenhum documento não é uma inspeção — é uma opinião de quem quer vender.</p>

<h2>O que dá para olhar sem ser técnico</h2>
<ul>
  <li><strong>Etiqueta e número de série legíveis.</strong> Etiqueta ausente ou raspada é motivo para parar a conversa.</li>
  <li><strong>Sinais de infiltração, corrosão e reparo improvisado.</strong> Fita, cola e parafuso trocado contam uma história.</li>
  <li><strong>Cabos, mangueiras e vedações.</strong> Ressecamento e trinca são visíveis.</li>
  <li><strong>Coerência da idade.</strong> Um equipamento anunciado como pouco usado com desgaste alto nos pontos de contato está sendo descrito errado.</li>
</ul>

<h2>O que só a bancada avalia</h2>
<p>Estado de câmara e de vaso de pressão, isolação elétrica, calibração de sensores, desgaste interno e comportamento sob carga. Nada disso é observável numa visita, e é exatamente por isso que a inspeção documentada vale tanto: ela é a única forma de o comprador saber o que não consegue ver.</p>

<h2>Os sinais de alerta</h2>
<ul>
  <li>"Revisado" sem lista.</li>
  <li>Recusa de informar número de série antes da compra.</li>
  <li>Ausência de manual e de registro regulatório.</li>
  <li>Garantia verbal.</li>
  <li>Preço muito abaixo do mercado sem explicação — em equipamento usado, desconto grande costuma ter causa, e a causa costuma aparecer depois.</li>
</ul>

<h2>O que o programa da JB entrega</h2>
<p>No Seminovo JB Certificado, cada unidade tem checklist com o resultado de cada item, quantos itens foram verificados, o técnico responsável e um código público de verificação. O que não foi inspecionado não recebe selo, e o selo não é aplicado a equipamento vendido antes do programa existir.</p>
`,
    pendente:
      "Alinhar com a operação o que pode ser exibido publicamente da inspeção sem expor dado de origem do equipamento. Indicar autor e revisor.",
  },

  {
    slug: "quanto-custa-um-equipamento-parado",
    title: "Quanto custa um equipamento parado: as premissas da conta",
    lead: "A calculadora da JB dá um número. Este texto explica de onde ele vem — e o que ele deliberadamente não inclui.",
    topic: "operacao",
    prioridade: 1,
    razaoDaPrioridade:
      "Sustenta a calculadora do site. Publicar a ferramenta sem o texto das premissas seria apresentar uma estimativa como se fosse medição.",
    body: `
<h2>Por que a conta precisa de premissas declaradas</h2>
<p>Qualquer número sobre "quanto custa um dia parado" é uma estimativa construída sobre suposições. Ela é útil quando as suposições estão à vista e o usuário pode discordar delas. Ela é enganosa quando aparece sozinha, com duas casas decimais, parecendo medição.</p>

<h2>O que entra na conta</h2>
<ol>
  <li><strong>Atendimentos que deixam de acontecer.</strong> Quantos por dia dependem daquele equipamento — e o cálculo usa o que você informar, não uma média de mercado.</li>
  <li><strong>Valor médio do atendimento afetado.</strong> Também informado por você. É a variável que mais muda de clínica para clínica.</li>
  <li><strong>Dias de parada.</strong> Do momento em que o equipamento sai de operação até voltar.</li>
</ol>
<p>A conta é a multiplicação dessas três coisas. Ela é simples de propósito: uma fórmula complexa com entradas estimadas produz um número mais preciso e igualmente incerto.</p>

<h2>O que a conta NÃO inclui</h2>
<ul>
  <li><strong>Remarcação.</strong> Parte dos atendimentos é remarcada e não se perde. Quanto disso acontece depende da clínica, e a JB não tem esse dado.</li>
  <li><strong>Custo do reparo.</strong> Entra separado, quando existir orçamento.</li>
  <li><strong>Efeito sobre a relação com o paciente.</strong> Existe, é real e não é mensurável com honestidade.</li>
  <li><strong>Custo fixo que continua correndo.</strong> Aluguel e equipe não param quando o equipamento para.</li>
</ul>
<p>Por não incluir remarcação, a conta tende a <strong>superestimar</strong> a perda. Por não incluir custo fixo, tende a subestimar. As duas distorções existem e nenhuma delas é corrigida por um chute.</p>

<h2>Como usar o número</h2>
<p>Como ordem de grandeza para uma decisão: vale a pena ter um equipamento de contingência? Vale a pena o contrato de preventiva? Vale a pena antecipar a troca daquele aparelho que já parou duas vezes? Para essas perguntas, uma ordem de grandeza bem construída resolve.</p>
<p>O que ele não serve é para colocar num orçamento como prejuízo. Ele não foi medido.</p>

<h2>A conta que quase sempre vence</h2>
<p>Na maioria das clínicas, o custo de um único dia parado é maior que o custo anual de manter a preventiva em dia. Essa comparação é o principal uso honesto da calculadora — e é uma comparação que cada clínica pode fazer com os próprios números, sem acreditar em nenhum dos nossos.</p>
`,
    pendente:
      "Alinhar o texto com a versão final da calculadora publicada, para as premissas descritas serem exatamente as que a ferramenta usa. Indicar autor e revisor.",
  },

  {
    slug: "calendario-de-manutencao-preventiva",
    title: "Como organizar um calendário de manutenção preventiva",
    lead: "Preventiva que depende de alguém lembrar não é preventiva. Como montar um calendário que sobrevive à semana cheia.",
    topic: "operacao",
    prioridade: 2,
    razaoDaPrioridade:
      "Conecta com contratos de manutenção e com a Área da Clínica. Baixo risco técnico, então depende só de revisão.",
    body: `
<h2>O problema não é saber, é lembrar</h2>
<p>Toda clínica sabe que preventiva evita pane. O que falha não é o conhecimento: é a semana cheia, o equipamento que está funcionando bem, e a ausência de um sistema que avise. Preventiva que depende de memória acontece até o primeiro mês corrido.</p>

<h2>Comece pelo inventário, não pelo calendário</h2>
<p>Liste todos os equipamentos, com marca, modelo e número de série. Sem essa lista o calendário fica incompleto justamente no equipamento que ninguém lembra que existe — que costuma ser o compressor, porque ele vive numa área de serviço.</p>

<h2>A periodicidade sai do manual</h2>
<p>Cada fabricante define a sua, e ela varia com o uso. Não existe "a cada seis meses" universal: existe o que o manual do <em>seu</em> modelo diz, ajustado pela intensidade de uso da <em>sua</em> clínica. Quando houver contrato de manutenção, a periodicidade contratada é a que vale.</p>
<p>Anote a periodicidade junto do equipamento, não numa planilha à parte. Informação que mora longe do objeto se perde.</p>

<h2>Separe três níveis</h2>
<ul>
  <li><strong>Diário:</strong> o que a equipe faz no fim do expediente — drenar o compressor, higienizar as linhas de sucção, conferir o nível de água da autoclave.</li>
  <li><strong>Mensal:</strong> conferências visuais — vedações, mangueiras, filtros, ruído.</li>
  <li><strong>Periódico com técnico:</strong> o que exige instrumento e bancada.</li>
</ul>
<p>Misturar os três num calendário só é o erro que faz o diário virar mensal e o mensal virar nunca.</p>

<h2>O calendário precisa de três coisas</h2>
<ol>
  <li><strong>Um responsável nomeado</strong> por cada item. "A equipe" não é responsável.</li>
  <li><strong>Um aviso antes do vencimento</strong>, com antecedência suficiente para agendar.</li>
  <li><strong>Um registro do que foi feito.</strong> Sem registro não há como saber se a preventiva aconteceu, e a próxima decisão sobre aquele equipamento fica sem base.</li>
</ol>

<h2>Como a Área da Clínica ajuda</h2>
<p>Cada equipamento cadastrado na Área da Clínica guarda a periodicidade, a data da última manutenção e a próxima prevista, e a visão geral mostra o que está próximo do vencimento ou vencido. O registro de cada atendimento fica no prontuário do equipamento — que é o mesmo lugar onde a garantia, os documentos e os chamados anteriores estão.</p>
`,
    pendente:
      "Confirmar se a JB quer indicar neste texto os planos de manutenção. Se sim, precisa do CTA correspondente; se não, o texto fica como está. Indicar autor e revisor.",
  },

  {
    slug: "historico-dos-equipamentos-da-clinica",
    title: "Como organizar o histórico dos equipamentos da clínica",
    lead: "O histórico só vale no dia em que alguém precisa dele — e nesse dia, quase sempre, ele está numa pasta que ninguém acha.",
    topic: "operacao",
    prioridade: 3,
    razaoDaPrioridade:
      "Fecha a série de operação e leva para o prontuário. Menos urgente que as pautas de sintoma, mas necessário para a série ficar completa.",
    body: `
<h2>Quando o histórico importa</h2>
<p>Ele nunca importa no dia em que é registrado. Importa depois: quando se decide entre reparar e trocar, quando se aciona garantia, quando se vende o equipamento, quando o terceiro técnico pergunta o que já foi feito, e quando a clínica precisa mostrar que a manutenção está em dia.</p>
<p>Nesses cinco momentos, um histórico incompleto custa dinheiro ou tempo — normalmente os dois.</p>

<h2>O que precisa estar guardado</h2>
<ol>
  <li><strong>Identificação:</strong> marca, modelo, número de série, ano.</li>
  <li><strong>Aquisição:</strong> nota fiscal, data, de quem foi comprado.</li>
  <li><strong>Garantia:</strong> prazo, início e o que cobre.</li>
  <li><strong>Manual do fabricante</strong>, na versão correspondente ao modelo.</li>
  <li><strong>Instalação:</strong> quando, por quem, e o que foi configurado.</li>
  <li><strong>Cada manutenção:</strong> data, o que foi diagnosticado, o que foi feito, peças trocadas, quem executou.</li>
  <li><strong>Cada chamado</strong>, inclusive os que não viraram reparo. "Chamamos e não era nada" é informação quando acontece três vezes.</li>
  <li><strong>Periodicidade da preventiva</strong> e a data da última.</li>
</ol>

<h2>Os três erros comuns</h2>
<ul>
  <li><strong>Guardar por fornecedor</strong>, e não por equipamento. Quando o fornecedor muda, o histórico se parte em dois.</li>
  <li><strong>Guardar só o que gerou nota.</strong> Chamado sem reparo, ajuste feito na hora e orientação por telefone somem — e são justamente eles que revelam o padrão.</li>
  <li><strong>Guardar num lugar que depende de uma pessoa.</strong> Pasta no computador de alguém, e-mail de quem cuidava disso, caderno na gaveta. Funciona até essa pessoa sair.</li>
</ul>

<h2>Uma pasta por equipamento, não por ano</h2>
<p>A unidade de organização é o equipamento, porque é sobre ele que as perguntas são feitas. Ano, fornecedor e tipo de serviço são formas de ordenar dentro dele, nunca de dividir.</p>

<h2>Como a Área da Clínica resolve isso</h2>
<p>Cada equipamento tem prontuário próprio, com identificação, garantia, documentos, manutenções, visitas e chamados no mesmo lugar. Equipamento comprado na JB entra automaticamente quando o pagamento é confirmado; o que já estava na clínica pode ser cadastrado — e o histórico anterior, ainda que incompleto, pode ser anexado.</p>
<p>O ponto não é a ferramenta. É que o histórico precisa existir em algum lugar que não dependa de ninguém lembrar onde ficou.</p>
`,
    pendente:
      "Revisar depois de a Área da Clínica estar publicada, para o último bloco descrever a tela que existe e não a que se pretende. Indicar autor e revisor.",
  },
];
