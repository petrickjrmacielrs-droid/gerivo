# Gerivo v1.7.12 — Pedidos de peças

## Novo módulo opcional

- Novo módulo **Pedidos de peças**, bloqueado por padrão.
- O MASTER pode liberá-lo individualmente na contratação da empresa.
- Quando bloqueado, não aparece na barra lateral, dashboard ou navegação.
- Os dados permanecem preservados caso o módulo seja desativado posteriormente.

## Pedido com várias peças

Um único número de pedido agora possui dados gerais e uma lista de itens.

Dados gerais:
- cliente e contato;
- número do pedido;
- orçamento vinculado opcional;
- tipo do pedido: Normal, PVI ou Transferência;
- tipo: Oficina, Venda, Garantia, Interna ou Balcão;
- data do pedido;
- responsável e produtivo;
- comentários gerais.

Cada peça possui:
- código/referência;
- descrição;
- quantidade;
- previsão de chegada;
- status próprio;
- comentário;
- datas de reserva, B.O., recebimento e entrega.

## Acompanhamento

- Tempo desde a abertura do pedido.
- Tempo individual em reserva e B.O.
- Início automático do contador geral quando todas as peças estiverem reservadas.
- Situação geral calculada automaticamente: Pendente, Agendado, Parcialmente reservado, Todas reservadas, Com item em B.O., Recebimento completo ou Entregue.
- Histórico básico das alterações de status.

## Interface

- Cards de Pendentes, Agendados, Reservadas, Em B.O., Recebidas e Tempo médio.
- Busca e filtros por tipo, finalidade, responsável e situação.
- Listagem por pedido, sem duplicar o cliente para cada peça.
- Painel lateral para cadastro e edição.
- Adição e remoção de múltiplas peças.
- Layout responsivo para desktop, tablet e celular.
- Card no dashboard que abre a listagem quando o módulo está contratado.
