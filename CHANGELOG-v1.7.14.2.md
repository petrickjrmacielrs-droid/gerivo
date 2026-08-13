# Gerivo v1.7.14.2

## Pedidos de peças

- Adicionado botão **Editar pedido** na tela de acompanhamento.
- Pedidos já salvos podem receber novas peças sem recriar o pedido.
- A edição usa a mesma tela ampla do cadastro.
- Peças já cadastradas não podem ser removidas pela tela de edição; novas peças ainda não salvas podem ser removidas.
- Dados gerais do pedido podem ser corrigidos e a alteração é registrada no histórico.
- Inclusão de nova peça gera evento no histórico com código/descrição e quantidade.
- Alterações em código, descrição, quantidade ou previsão de uma peça existente também são auditadas.
- Ao adicionar uma peça pendente a um pedido antes totalmente reservado, o status geral é recalculado automaticamente e a linha deixa de aparecer como pronta para contato até a nova peça ser resolvida.

## Banco de dados

Nenhuma migration nova é necessária.
