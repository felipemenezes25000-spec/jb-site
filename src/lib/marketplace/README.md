# Compatibilidade: `marketplace`

A JB é **single seller**. Este diretório recebeu o nome `marketplace` quando as
funções de decisão de compra foram criadas, mas o nome não representa o domínio
do negócio.

- Não criar novas dependências apontando para `@/lib/marketplace/*`.
- Código novo deve importar de `@/lib/comercio/*`.
- Os arquivos atuais permanecem aqui temporariamente para não fazer uma
  migração em massa arriscada.
- Ao tocar num consumidor existente, prefira migrar o import para `comercio`.

A remoção deste diretório só deve acontecer quando a busca pelo caminho antigo
não retornar mais consumidores.
