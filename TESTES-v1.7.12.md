# Roteiro de testes — Gerivo v1.7.12

## Ativação opcional
1. Execute a migration 011.
2. Confirme que Pedidos de peças não aparece para a empresa antes da liberação.
3. Entre como MASTER e ative Pedidos de peças no plano personalizado ou nos módulos da empresa.
4. Reabra a empresa e confirme o menu na barra lateral e o card no dashboard.
5. Desative o módulo e confirme que o menu desaparece sem apagar os pedidos já cadastrados.

## Pedido com várias peças
1. Abra Pedidos de peças e clique em Registrar novo pedido.
2. Preencha cliente, contato, número, tipo, data e responsável.
3. Cadastre pelo menos três peças no mesmo pedido.
4. Salve e confirme que a listagem mostra um pedido com três peças.
5. Reabra o pedido e confirme todos os itens.

## Status e contadores
1. Marque uma peça como Reservado e outra como B.O.
2. Confirme a situação geral Com item em B.O.
3. Marque todas as peças ativas como Reservado.
4. Confirme a situação Todas reservadas e o contador geral.
5. Marque todas como Recebido e depois Entregue.
6. Confirme Recebimento completo e Entregue.

## Responsividade
1. Teste a listagem no computador.
2. Teste o painel lateral no tablet.
3. No celular, confirme os cards empilhados, filtros em coluna e edição em tela inteira.
