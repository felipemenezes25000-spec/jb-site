/* ============================================================================
   Conteúdo institucional — o texto que substitui o legado do site em PHP

   Este arquivo é a FONTE do que a migração grava em `Page`. Depois de gravado,
   quem manda é o painel: editar aqui e rodar de novo só surte efeito se
   ninguém tiver mexido na página (ver src/lib/conteudo/migracao.ts).

   Regra que governou cada frase: só entra o que é verificável nas
   configurações da JB, no catálogo, no domínio da plataforma ou no próprio
   texto legado escrito pela empresa. O que saiu, e por quê:

     • MISSÃO / VISÃO / VALORES / Política de Qualidade — blocos genéricos que
       o prompt mestre manda remover. "Atingir 100% de qualidade" é promessa
       absoluta sem medição.
     • "somos referência em manutenções para autoclaves" — autoridade
       autoatribuída. O serviço continua descrito; o superlativo saiu.
     • "técnicos renomados", "altamente preparados para atuarem em âmbito
       nacional", "abordagem avançada" — adjetivo sem prova.
     • "atendimento técnico em até 48 horas sem custo adicional" — é condição
       de CONTRATO, e o contrato é cadastro, não texto institucional. Enquanto
       a base comercial dos planos não estiver confirmada (fase 2), repetir o
       prazo aqui seria vender uma condição que a plataforma não sustenta.
       Registrado em docs/evolucao-jb/pendencias-externas.md.

   O que foi PRESERVADO do legado, por ser fato declarado pela própria JB:
   empresa familiar; início em 2011; manutenção de consultórios e periféricos;
   preventiva e corretiva de autoclave; fornecimento de teste biológico;
   orientação a quem opera o equipamento; troca de peça só após aprovação de
   orçamento; ordem de serviço discriminando o que foi executado; os três
   ambientes da sede; base em São Paulo.

   O HTML aqui é o que `.prose-jb` estiliza: h2, p, ul/li, strong. Nada de
   style inline, cor fixa ou div espaçadora — foi disso que a migração veio.
   ============================================================================ */

export type ConteudoDePagina = {
  slug: string;
  title: string;
  eyebrow: string;
  lead: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
  /**
   * `"remover"` desfaz a capa da página; `undefined` deixa como está.
   *
   * A migração nunca ESCOLHE uma capa — imagem é decisão editorial e vive no
   * painel. O que ela sabe fazer é tirar do ar uma foto que afirma algo falso.
   */
  capa?: "remover";
};

const SOBRE: ConteudoDePagina = {
  slug: "sobre",
  title: "Sobre a JB",
  eyebrow: "Quem somos",
  lead:
    "A JB vende, instala e mantém equipamento odontológico — e registra o que foi feito em " +
    "cada um deles. Empresa familiar, em atividade desde 2011, com base em São Paulo.",
  seoTitle: "Sobre a JB Soluções Odontológicas",
  seoDescription:
    "Empresa familiar desde 2011, especializada em manutenção de consultórios odontológicos. " +
    "Venda, instalação, assistência técnica e o histórico de cada equipamento.",
  body: `
<h2>Comprar é só o começo</h2>
<p>A JB Soluções Odontológicas vende equipamento odontológico, instala quando a instalação é contratada, faz manutenção preventiva e corretiva e registra o histórico de cada máquina. A venda não encerra a relação: ela abre o <strong>Prontuário Técnico JB</strong> do equipamento, que a clínica acompanha pela Área da Clínica.</p>
<p>É a mesma empresa que vende e que conserta. Quando um equipamento comprado aqui apresenta defeito, quem atende já sabe qual é o modelo, quando ele foi entregue e o que já foi feito nele.</p>

<h2>Uma empresa familiar, desde 2011</h2>
<p>A JB começou em 2011 e continua sendo uma empresa familiar. A base fica em São Paulo, e o atendimento técnico é feito por equipe própria — não é terceirizado.</p>
<p>A especialidade é a manutenção de consultórios odontológicos e dos seus periféricos, com atenção particular à autoclave: manutenção preventiva, manutenção corretiva e fornecimento de teste biológico, além da orientação a quem opera o equipamento no dia a dia.</p>

<h2>Como a JB trabalha</h2>
<p>Cinco compromissos que valem para todo atendimento:</p>
<ul>
<li><strong>Diagnosticar antes de condenar.</strong> Equipamento parado nem sempre é equipamento perdido. A JB abre, testa e diz o que encontrou antes de recomendar a troca.</li>
<li><strong>Orçar antes de executar.</strong> Peça só é trocada depois que o orçamento é aprovado pela clínica. Não existe serviço feito primeiro e cobrado depois.</li>
<li><strong>Registrar o que foi feito.</strong> Toda manutenção sai com ordem de serviço discriminando o serviço executado, as peças trocadas e o que ficou pendente.</li>
<li><strong>Manter o histórico por equipamento.</strong> Chamado, orçamento, ordem de serviço, documento e preventiva ficam ligados àquela máquina — não a uma pasta de e-mails.</li>
<li><strong>Assumir o pós-venda conforme a cobertura oferecida.</strong> Garantia, prazo e escopo são os que estão registrados no equipamento e no contrato, não os que soariam melhor no anúncio.</li>
</ul>

<h2>Compra, assistência e acompanhamento na mesma empresa</h2>
<p>As três frentes são etapas do mesmo ciclo:</p>
<ul>
<li><strong>Compra.</strong> Equipamento novo, seminovo ou recondicionado, com a condição de cada unidade declarada no anúncio.</li>
<li><strong>Instalação.</strong> Quando é contratada e aplicável ao equipamento, ela é agendada e registrada — inclusive o que foi conferido no local.</li>
<li><strong>Assistência técnica.</strong> Aberta pelo site, com fotos e vídeo, sem precisar de conta. Vale também para equipamento que não foi comprado na JB.</li>
<li><strong>Acompanhamento.</strong> Depois da compra, o equipamento entra na Área da Clínica com garantia, documentos, histórico e a próxima preventiva quando ela está definida.</li>
</ul>

<h2>Equipe e estrutura</h2>
<p>A sede em São Paulo reúne a bancada onde os equipamentos são recebidos e reparados, a gestão administrativa e financeira, e o estoque de peças para reposição. Visitas são combinadas antes, pelo telefone ou pelo WhatsApp.</p>
`.trim(),
};

const ESTRUTURA: ConteudoDePagina = {
  slug: "estrutura",
  title: "Onde o equipamento é cuidado",
  eyebrow: "Estrutura",
  lead:
    "A sede em São Paulo reúne bancada técnica, gestão e estoque de peças. É de onde saem os " +
    "atendimentos e para onde vêm os equipamentos que precisam de reparo em oficina.",
  seoTitle: "Estrutura da JB — bancada técnica, peças e documentação",
  seoDescription:
    "A oficina da JB Soluções Odontológicas em São Paulo: recebimento, diagnóstico, orçamento, " +
    "reparo, testes e relatório de cada equipamento atendido.",
  /*
   * A capa herdada (`institucional_63681_estruturaok.jpg`) é uma foto genérica
   * de instrumental e modelo de arcada, importada do site em PHP com o texto
   * alternativo "Estrutura". Ela não mostra a bancada da JB, mas está
   * posicionada como se mostrasse — é o caso exato que o escopo proíbe.
   *
   * O arquivo NÃO é apagado: continua na biblioteca de mídia, disponível para
   * quem quiser usá-lo onde ele for honesto. O que sai é a associação com esta
   * página. Quando houver foto real da oficina, ela entra pelo painel.
   */
  capa: "remover",
  body: `
<h2>Três ambientes, uma operação</h2>
<p>A sede da JB é dividida em três áreas que trabalham juntas:</p>
<ul>
<li><strong>Bancada técnica.</strong> Onde o equipamento é recebido, aberto, diagnosticado, reparado e testado antes de voltar para a clínica.</li>
<li><strong>Gestão administrativa e financeira.</strong> Onde o chamado vira agenda, o diagnóstico vira orçamento e o atendimento vira ordem de serviço e nota.</li>
<li><strong>Estoque de peças para reposição.</strong> O que está disponível encurta o reparo; o que precisa ser pedido entra no prazo do orçamento, declarado à clínica.</li>
</ul>

<h2>Atendimento na clínica e atendimento em oficina</h2>
<p>Nem todo reparo exige levar o equipamento. Boa parte da manutenção preventiva e das correções mais simples é feita na própria clínica, com visita agendada. Quando o defeito exige bancada, instrumento de teste ou peça que não viaja, o equipamento é recolhido — e nesse caso o percurso dele fica registrado etapa por etapa.</p>

<h2>Documentação: o que sobra depois que o técnico vai embora</h2>
<p>Todo atendimento gera registro. A ordem de serviço discrimina o que foi executado, quais peças foram trocadas e qual foi o resultado dos testes finais. Esse registro fica ligado ao equipamento no Prontuário Técnico JB, e a clínica consulta quando quiser — inclusive anos depois, na hora de decidir entre reparar de novo ou substituir.</p>

<h2>Visitar a JB</h2>
<p>A visita à sede é combinada antes, pelo telefone ou pelo WhatsApp, para que haja alguém disponível para receber. O endereço, o horário de funcionamento e o mapa estão nesta página.</p>
`.trim(),
};

/** Tudo o que a migração institucional conhece. A ordem é a de execução. */
export const CONTEUDO_INSTITUCIONAL: ConteudoDePagina[] = [SOBRE, ESTRUTURA];
