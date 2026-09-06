# Pendências externas

Cada linha descreve um dado, acesso ou decisão que **não está no repositório** e
que bloqueia a *ativação* de uma função — nunca a implementação do restante.

Situação possível: `aberta`, `respondida`, `ativada e verificada`.

---

## P1 — Tabela comercial real dos planos de manutenção

- **O que falta:** preço, período de vigência, base de cobrança (por
  equipamento, pacote com quantidade, preço inicial ou sob consulta), visitas
  incluídas, peças, deslocamento, exclusões e critérios de elegibilidade de cada
  plano que a JB de fato vende.
- **Por que:** os três planos no banco são de demonstração (`demo-plano-*`) e
  vieram do seed. Ver [D3](decisoes.md).
- **Responsável:** proprietário da JB.
- **Efeito enquanto estiver aberta:** os cartões de plano mostram "Sob consulta"
  e a comparação com a calculadora não afirma equivalência de escopo. O código,
  a migração e o controle no painel ficam prontos.
- **Passo exato de ativação:** abrir `/admin/manutencao/planos`, editar cada
  plano preenchendo base de cobrança, quantidade coberta e condições, e publicar.
- **Situação:** aberta.

---

## P2 — Domínio próprio confirmado para `NEXT_PUBLIC_SITE_URL`

- **O que falta:** confirmação de que `jbsolucoesodontologicas.com.br` é o
  domínio autorizado de produção e que o DNS aponta para a Vercel.
- **Por que:** a fase 4 torna a variável obrigatória em produção. O domínio do
  e-mail é pista, não prova de DNS (prompt mestre, seção 8, item 5).
- **Responsável:** proprietário da JB / administrador do DNS.
- **Efeito enquanto estiver aberta:** a validação e o redirecionamento canônico
  ficam implementados e testados; a variável de produção não é declarada
  verificada.
- **Situação:** aberta.

---

## P3 — Acervo fotográfico real (bancada, equipe, estrutura)

- **O que falta:** fotografias reais da oficina, da equipe e dos equipamentos em
  atendimento, com autorização de uso.
- **Por que:** as fases 1.5 (Estrutura) e 15 dependem de imagem documental. O
  prompt proíbe stock photo fingindo ser a JB e imagem gerada no lugar de
  registro real.
- **Responsável:** proprietário da JB.
- **Efeito enquanto estiver aberta:** as páginas usam composição editorial
  honesta e o fluxo do serviço, sem imagem de banco. O briefing e o pipeline de
  mídia ficam entregues.
- **Situação:** aberta.

---

## P4 — Credenciais de envio (Resend) e de pagamento (Mercado Pago)

- **O que falta:** `RESEND_API_KEY` + `EMAIL_FROM` com domínio verificado;
  `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET` e
  `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY`.
- **Por que:** sem elas a fila opera em modo "registro" e o pagamento usa o
  provedor simulado. Ambos já implementados; falta apenas credencial.
- **Responsável:** proprietário da JB.
- **Efeito enquanto estiver aberta:** e-mails não saem; produção não pode ser
  ligada com provedor real.
- **Situação:** aberta.

---

## P5 — Prazo de atendimento do contrato de manutenção

- **O que falta:** confirmação da condição "atendimento técnico em até 48 horas
  sem custo adicional", que constava do texto institucional herdado do site em
  PHP.
- **Por que:** é condição de contrato, não texto institucional. A base
  comercial dos planos está indefinida (ver [P1](#p1--tabela-comercial-real-dos-planos-de-manutenção)),
  e repetir o prazo no Sobre venderia uma condição que a plataforma não
  sustenta nem registra.
- **Responsável:** proprietário da JB.
- **Efeito enquanto estiver aberta:** o novo texto do Sobre descreve os
  contratos de manutenção sem citar prazo. O texto anterior está preservado em
  `PageRevision` e pode ser consultado no painel.
- **Passo exato de ativação:** confirmado o prazo, cadastrá-lo como condição do
  plano em `/admin/manutencao/planos` (fase 2), de onde as telas passam a lê-lo.
- **Situação:** aberta.

---

## P6 — Fotografia da oficina para a página Estrutura

- **O que falta:** foto real da bancada da JB.
- **Por que:** a capa que estava na página (`institucional_63681_estruturaok.jpg`)
  é uma imagem genérica de instrumental odontológico, importada do site
  anterior e apresentada como se mostrasse a estrutura da JB. Ela foi retirada
  do ar; o arquivo continua na biblioteca de mídia.
- **Responsável:** proprietário da JB. Faz parte do acervo de [P3](#p3--acervo-fotográfico-real-bancada-equipe-estrutura).
- **Efeito enquanto estiver aberta:** a página se apoia no texto e nas nove
  etapas do percurso da bancada, sem imagem de capa.
- **Passo exato de ativação:** subir a foto em `/admin/conteudo/midia` e
  escolhê-la como capa em `/admin/conteudo/paginas/estrutura`.
- **Situação:** aberta.

---

## P7 — Proteção de branch no GitHub

- **O que falta:** marcar `Tipos e testes de unidade`, `Build de produção` e
  `E2E, acessibilidade e responsividade` como checks obrigatórios em `main` e
  `plataforma`.
- **Por que:** o workflow existe e roda, mas workflow criado não é check
  obrigatório ativado. Até isso ser feito, o pipeline informa e não impede.
- **Responsável:** quem tem acesso de administrador ao repositório.
- **Passo exato:** Settings › Branches › Add rule › "Require status checks to
  pass before merging" › marcar os três.
- **Situação:** aberta.

---

## P8 — Propriedade do GA4

- **O que falta:** criar a propriedade e salvar o identificador `G-XXXXXXXXXX`
  em `/admin/configuracoes`.
- **Por que:** sem identificador válido nada é carregado — nem o aviso de
  consentimento aparece. A camada de eventos, o filtro de privacidade e o CSP
  estão prontos.
- **Efeito enquanto estiver aberta:** nenhuma métrica é coletada. As Core Web
  Vitals reais dependem disso e de tráfego.
- **Situação:** aberta.

---

## P9 — Objeto privado no Vercel Blob

- **O que falta:** confirmar que a loja de blobs aceita `access: "private"`.
- **Por que:** a mídia que o visitante anexa ao chamado é gravada como objeto
  privado. Se o plano não suportar, `@/lib/upload` cai para objeto público com
  nome de 32 hexadecimais e registra um aviso — e nome difícil de adivinhar
  **não é controle de acesso**: quem receber o link abre o arquivo sem sessão.
- **Efeito enquanto estiver aberta:** em produção, foto de defeito de clínica
  pode ficar acessível por URL. Localmente o arquivo vai para `.arquivos/`,
  fora de `public/`.
- **Passo exato:** painel da Vercel › Storage › Blob › confirmar suporte a
  objeto privado; se não houver, avaliar upgrade antes de publicar o envio de
  visitante.
- **Situação:** aberta — **é a de maior risco desta lista**.
