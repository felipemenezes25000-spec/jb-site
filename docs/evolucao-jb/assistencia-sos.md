# SOS Equipamento e continuidade da assistência

## Objetivo

Reduzir o tempo entre perceber que um equipamento odontológico parou e iniciar uma triagem técnica rastreável na JB, sem prometer SLA artificial e sem substituir os fluxos normais de assistência.

## Entrada SOS

- A vitrine pública expõe **SOS Equipamento** no mobile.
- O atalho some dentro das próprias páginas de assistência para não competir com o formulário e com o dock de conversão.
- A página `/sos-equipamento` diferencia claramente emergência de equipamento de emergência clínica.
- O CTA urgente pré-marca no rascunho apenas os estados reais do domínio: `aindaOpera = nao` e `urgencia = parado`.
- O fluxo continua no mesmo assistente seguro de abertura de chamado; não existe rota paralela de negócio.

## Segurança e verdade operacional

- Nenhum prazo de atendimento é inventado.
- A interface orienta interrupção de uso diante de fumaça, cheiro de queimado, aquecimento anormal, choque, vazamento ou comportamento imprevisível.
- A página não orienta abrir carenagens nem reparar equipamento energizado ou pressurizado.
- Credenciais, certificações, avaliações e números só devem aparecer quando houver fonte real verificável.

## Continuidade

A escolha de uma família de equipamento na landing pública é preservada até o formulário. O navegador guarda apenas o nome público da categoria; a tela de solicitação resolve esse nome contra as opções autorizadas e renderizadas pelo servidor. O cliente não fornece nem controla um `categoryId` confiável.

## Analytics

A taxonomia existente é reutilizada:

- `assistance_start`
- `assistance_step_1` a `assistance_step_5`
- `assistance_media_added`
- `assistance_submit`

Quando o fluxo nasce no SOS, os eventos recebem apenas `metodo = sos`. Nenhum nome, telefone, serial, relato, arquivo ou identificador do chamado é enviado para analytics.

`assistance_submit` continua sendo registrado somente depois que o servidor cria o chamado e redireciona para um protocolo válido.

## Motion e acessibilidade

A página SOS usa grid técnico, scan, órbitas e entrada escalonada para comunicar estado e tecnologia. Toda animação essencialmente decorativa é removida com `prefers-reduced-motion: reduce`.

O motion não altera prioridade, diagnóstico nem status do atendimento.

## Testes

O E2E cobre:

1. entrada pelo atalho SOS no mobile;
2. navegação para a página SOS;
3. abertura da triagem urgente;
4. persistência de `parado` / `nao` no rascunho;
5. apresentação da urgência na etapa de problema;
6. ausência do botão flutuante nas telas onde ele competiria com a assistência;
7. continuidade da categoria escolhida na landing para o formulário.
