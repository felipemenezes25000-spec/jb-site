# Feed de produtos, Merchant Center e presença local

Nada aqui foi executado numa conta externa. Este documento é o que a JB
precisa fazer, com o passo exato, e o que o código já garante do lado de cá.

---

## O feed

**Endereço:** `/feed/produtos.xml`
**Formato:** RSS 2.0 com o namespace `http://base.google.com/ns/1.0`
**Origem do formato:** support.google.com/merchants/answer/7052112

### Quem entra

Só produto **ativo** (`status = active`). Dentro disso, quatro recusas, cada
uma com motivo nomeado em `src/lib/feed.ts`:

| Motivo | Quando | Por quê |
|---|---|---|
| `nao_publicado` | rascunho ou arquivado | não está à venda |
| `sem_preco` | `priceCents <= 0` | oferta sem preço é rejeitada na origem |
| `sem_compra_direta` | só sob orçamento | anunciar prometeria uma compra que a loja não deixa fechar |
| `sem_imagem` | nenhuma mídia | imagem principal é obrigatória no destino |

Nenhum dado de cliente, de pedido ou de unidade sai no feed. O número de série
não viaja: ele identifica um bem físico e não é informação de vitrine.

### Como cada campo é preenchido

- **`g:id`** — o **SKU**, não o id do banco. O identificador precisa sobreviver
  a uma reimportação de catálogo; trocá-lo faz o destino tratar o produto como
  novo e perder o histórico do anúncio.
- **`g:price`** — `priceCents / 100`, duas casas, sufixo `BRL`. É o mesmo
  número que a página mostra e que o JSON-LD declara: os três leem
  `Product.priceCents`.
- **`g:availability`** — `in_stock` quando o estoque não é controlado ou é
  maior que zero; `out_of_stock` no resto.
- **`g:condition`** — `new`, `refurbished` ou `used`, e nada mais. **"Seminovo
  JB Certificado" não é valor de condição**: é o nome de um programa da JB.
  Ele viaja em `g:custom_label_0` como `seminovo_jb_certificado`, e só quando a
  unidade tem certificação **publicada** — inspeção em preparação ou revogada
  não vira rótulo de campanha.
- **`g:gtin` / `g:mpn`** — só quando cadastrados e conferidos. O GTIN passa por
  dígito verificador (`src/lib/identificadores.ts`) e é recusado quando é igual
  ao SKU interno.
- **`g:identifier_exists`** — sai como `no` quando não há GTIN nem marca com
  MPN. É uma declaração sobre **o cadastro da JB**, não sobre o produto existir
  no mundo: preencher o GTIN no painel remove o atributo.

### Unidades com preço ou condição diferentes

Não existem neste modelo. `InventoryUnit` guarda série, ano, horas, ciclos,
garantia e laudo — **nunca preço nem condição própria**. Preço e condição são do
`Product`, e o feed anuncia exatamente a oferta que a loja pratica. Um seminovo
único é um `Product` com `unique = true` e uma unidade; dois seminovos com
preços diferentes são dois produtos.

Se um dia a unidade ganhar preço próprio, o feed precisa mudar junto — ou
passará a anunciar uma oferta que não existe.

### Atualização, cache e diagnóstico

- O escopo `use cache` do feed carrega as etiquetas `catalogo` e
  `configuracoes`. `revalidarCatalogo` (painel › produtos, estoque, preço)
  derruba a primeira; salvar configurações derruba a segunda. **Publicar,
  despublicar ou mudar preço reflete no feed na mesma ação que reflete no
  site.**
- Sem nenhuma alteração, a validade é de uma hora (`cacheLife("hours")`).
- O cabeçalho `Cache-Control` permite ao CDN guardar por uma hora com
  `stale-while-revalidate` de dez minutos.
- **Remoção:** despublicar ou arquivar tira o item do feed na atualização
  seguinte. Não há exclusão explícita a fazer no destino.
- **Diagnóstico:** abrir `/feed/produtos.xml` e conferir. Um item que deveria
  estar lá e não está cai numa das quatro recusas acima — a mais comum é
  `sem_imagem`.

### Ambiente

O feed usa `resolverOrigem()`, então **em preview os links apontam para o
preview**. Registre no Merchant Center apenas o endereço de produção. Um feed
de preview cadastrado anunciaria uma cópia de teste do catálogo.

---

## O que a JB precisa fazer no Merchant Center

Nada disto foi feito: exige acesso e autorização à conta da JB.

1. **Verificar e reivindicar o domínio.** Merchant Center › Configurações ›
   Informações da empresa › Site. A verificação por Search Console é a mais
   direta se o domínio já estiver lá.
2. **Cadastrar o feed.** Produtos › Feeds › Adicionar › "Busca programada",
   apontando para `https://<domínio de produção>/feed/produtos.xml`. Frequência
   diária é suficiente para o volume da JB.
3. **Conferir o primeiro processamento.** Produtos › Diagnóstico. Erros de
   imagem e de identificador são os que costumam aparecer primeiro.
4. **Acompanhar rejeições.** Item rejeitado por identificador significa GTIN
   errado no painel, não problema de formato — corrija na ficha do produto.
5. **Política de devolução.** O Merchant Center pede uma política configurada
   na conta. Ela precisa **bater com o que o site publica** (Configurações ›
   Devolução). Duas políticas diferentes é motivo de suspensão.

---

## Presença local

### O que está centralizado

Nome, telefone, WhatsApp, e-mail, horário, endereço e **área de atendimento**
vivem em Configurações e alimentam o site inteiro, o `LocalBusiness` e o
`Organization` do JSON-LD. Mudar no painel muda em todo lugar.

O horário vira `openingHours` só quando o texto pode ser lido com segurança
(`horarioSchema`). Quando não pode, ele **sai** do JSON-LD em vez de virar um
horário inventado.

### Páginas de bairro: decisão de não fazer

O escopo permite página local **apenas quando existir cobertura real e conteúdo
específico útil**. A JB atende de um endereço só, e não há conteúdo distinto
por bairro — a diferença entre "assistência técnica na Lapa" e "assistência
técnica em Pinheiros" seria o nome do bairro trocado num texto igual.

Centenas dessas páginas são o padrão que os buscadores tratam como conteúdo
raso, e elas produzem exatamente o efeito contrário do pretendido. **Nenhuma
foi criada.** Se a JB abrir uma segunda unidade com endereço e equipe próprios,
aí existe conteúdo específico e a página passa a fazer sentido.

### Checklist do Google Business Profile

Nada aqui foi executado — o perfil é conta externa.

- [ ] Nome, endereço e telefone **idênticos** aos do site (Configurações). A
      divergência é o erro clássico: ela divide o sinal do negócio em dois.
- [ ] Horário igual ao do campo "Horário de atendimento".
- [ ] Categoria principal: assistência técnica de equipamento odontológico.
- [ ] Área de atendimento igual ao campo "Área de atendimento" — **sem listar
      cidade onde não há cobertura**. Cidade listada gera visita que a JB não
      atende.
- [ ] Fotos **reais** da oficina, da equipe e de equipamentos atendidos. Foto
      de banco de imagem em perfil local é reconhecível e custa credibilidade.
- [ ] Avaliações: responder às existentes. **Nunca** criar, pedir em troca de
      desconto ou publicar avaliação que a JB escreveu.
- [ ] Link do site apontando para o domínio de produção.
