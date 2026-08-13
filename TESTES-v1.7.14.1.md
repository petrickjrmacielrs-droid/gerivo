# Testes v1.7.14.1

## Configuração por empresa
- Ative Pedidos de peças.
- Abra Gestão > Identidade/Configurações > Pedidos de peças.
- Ligue Placa e Orçamento vinculado e marque-os como obrigatórios.
- Tente salvar um pedido sem esses campos: o sistema deve impedir.
- Preencha e salve: o pedido deve ser criado.

## Cadastro
- Crie um pedido com 4 ou mais peças.
- Confirme que a página amplia normalmente e permite acessar todos os itens.
- Confirme TAG C/G/I e placa em maiúsculas.

## Listagem
- Todas pendentes: linha neutra/azulada.
- Uma reservada e outra pendente: linha amarela.
- Pelo menos uma peça em B.O.: linha vermelha.
- Todas reservadas: linha verde com "Pronto para contato".

## Acompanhamento
- Abra um pedido salvo.
- Confirme que cliente, placa, pedido e demais dados gerais não ficam em edição.
- Altere apenas o status de uma peça e informe comentário.
- Salve e reabra.
- Confirme a movimentação no histórico.

## Replicação
- Crie nova empresa dentro de um grupo existente.
- Selecione uma unidade base e marque Módulos e limites.
- Confirme que a configuração de campos de Pedidos de peças foi replicada.
