# Coleta de avaliações — como ligar, e o que o sistema não faz

**Nada foi enviado a ninguém.** O envio nasce desligado, e ligar é uma decisão
da JB no painel — não de quem faz deploy.

---

## Como está agora

| | |
|---|---|
| Fila de convites | Funciona. Roda sem autorização, porque não sai da JB. |
| Envio | **Desligado.** `Configurações › Avaliações › Enviar convites de avaliação` = não. |
| Página de resposta | `/avaliar/<token>`, `noindex`, fora do sitemap e do robots. |
| Depoimentos públicos | `/depoimentos`, `noindex` enquanto não houver nenhum. |

Com o envio desligado, o botão "Enviar" de cada convite fica desabilitado e a
ação recusa mesmo se alguém forçar o formulário. A fila inteira pode ser
conferida sem risco.

## O passo exato para ligar

1. Confira a fila em `/admin/avaliacoes`. Clique em **Gerar fila** — isso cria
   convites em rascunho e **não envia nada**.
2. Leia alguns convites: cliente, transação, data. Convite errado se cancela
   antes, não depois.
3. Confirme que o e-mail está configurado (`/admin/mensagens` mostra o
   provedor e o diagnóstico). Com o registro local, o e-mail é gravado e não
   sai — é o modo de teste da mensageria.
4. Em `Configurações › Avaliações`, ligue **Enviar convites de avaliação**.
5. Envie **um** convite, para um endereço da própria JB, e confira o texto.
6. Só então envie o resto.

Para parar tudo, desligue a mesma chave. Convites já enviados não voltam, mas
nenhum novo sai.

---

## As regras, e por que elas existem

### Elegibilidade

Um convite exige: transação concluída, **7 dias** de carência depois da
conclusão, e nenhum outro convite ao mesmo cliente nos últimos **90 dias**.

Os dois prazos são convenção de produto, declarados como tal em
`src/lib/avaliacoes.ts`. A carência existe porque avaliação pedida no dia da
entrega mede expectativa, não experiência. O intervalo existe porque uma
clínica com contrato de manutenção fecha várias OS por trimestre, e um convite
por OS transformaria a JB em remetente de spam educado.

### O convite não é filtrado por nota

`motivoDeInelegibilidade` **não recebe** nota anterior, valor da compra nem
histórico de reclamação. Não há por onde. Um teste dedicado verifica a
assinatura da função exatamente por isso: a prática que o escopo proíbe —
convidar só quem se espera satisfeito — é fácil de introduzir sem querer, e
difícil de perceber depois.

### Resposta é privada até alguém autorizar

A caixa de autorização vem **desmarcada** e é opcional. Sem ela, a resposta
existe só no painel. Com ela, ainda passa por curadoria antes de ir ao ar.

A curadoria serve para conferir dado pessoal exposto e conteúdo ofensivo.
**Não serve para escolher elogio** — uma resposta de nota 2, autorizada e com
comentário, é publicável, e `publicarDepoimento` não lê a nota.

### Nada é oferecido em troca

A página de resposta diz isso ao cliente, com todas as letras: a JB não
oferece desconto, brinde ou vantagem por avaliação, e não pede que ninguém
mude o que escreveu. Não é texto de cortesia — é o compromisso que torna a
coleta legítima, e ele fica visível para quem responde.

### Retirada

Quem autorizou pode pedir a retirada. No painel, "Retirar do site" limpa a
data de publicação: o depoimento some da página e a **resposta continua** — ela
é feedback da JB, e apagá-la seria perder a informação junto com a exibição.

---

## O evento `review_requested`

O escopo exige que ele represente uma solicitação **efetivamente enviada pelo
canal autorizado**, e não um rascunho criado.

Neste sistema não há emissor de evento no servidor: o analytics de página é
client-side e mede navegação. O fato correspondente é a coluna
`ReviewRequest.sentAt`, carimbada **exclusivamente** dentro de `enviarConvite`,
depois de a mensagem entrar na fila de saída. Qualquer relatório de convites
enviados deve contar essa coluna.

Contar `ReviewRequest` criados — ou o estado `rascunho` — informaria fila
interna como se fosse contato com cliente. É a distinção que os dois estados
existem para preservar.

---

## O que a JB precisa decidir

- **Quando ligar o envio.** Depende de haver transações concluídas com e-mail
  válido, e de a JB querer começar.
- **Se quer coletar NPS.** O campo existe, é opcional na resposta e é de uso
  interno. Ele não é publicado em lugar nenhum.
- **Canal.** Hoje o convite sai por e-mail. WhatsApp exige integração que não
  existe neste projeto e autorização própria — não foi implementado.
