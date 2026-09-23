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
- permitir selecionar o sintoma sem tornar isso obrigatório;
- carregar equipamento/sintoma na mensagem do WhatsApp;
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

## Performance

- Não pré-carregar imagem que não disputa a primeira dobra no mobile.
- Não fazer prefetch automático de listas de landings quando isso concorre com a jornada principal.
- Imagens abaixo da dobra permanecem lazy por padrão.
- Uma única marca prioritária no header; evitar imagens duplicadas por breakpoint.
- O site de assistência usa sua própria coreografia e não deve receber aura/tilt/reveal da antiga vitrine comercial.
- Folhas específicas do e-commerce removido não devem voltar ao bundle global.

## Validação final

A bateria foi preparada para ser executada uma vez ao final da leva, não a cada commit.

Cobertura preparada:

- Playwright em `320×760`, `390×844`, `1440×900` e `1920×1080`;
- responsividade em `320`, `360`, `390`, `430`, `768`, `1024`, `1280`, `1440` e `1920px`;
- acessibilidade em mobile e desktop;
- 7 landings atuais;
- WhatsApp de Jeferson e Jackson;
- contexto do equipamento na barra móvel;
- ausência de overflow horizontal;
- URLs antigas da loja respondendo `410`;
- admin anônimo protegido.

**Importante:** alterações desta leva foram feitas com `[skip ci]` por decisão operacional. Não considerar a leva tecnicamente validada até a execução final de lint, typecheck, testes, build, E2E, acessibilidade e responsividade.
