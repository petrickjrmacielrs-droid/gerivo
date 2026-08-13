# Gerivo v1.7.14.1

## Pedidos de peças

- Cadastro passou a abrir em uma página ampla dentro da operação, sem modal lateral.
- Um pedido continua aceitando várias peças sem limite visual do formulário.
- Depois de salvo, o pedido abre em modo de acompanhamento: dados gerais ficam protegidos e o usuário altera status e comentário das peças.
- Mudanças de status e comentários passam a gerar entradas no histórico.
- Adicionado campo de placa ao pedido.
- Campos opcionais configuráveis por empresa: contato, placa, orçamento vinculado e produtivo/oficina.
- Cada campo opcional pode ser apenas exibido ou também obrigatório.
- TAG operacional simplificada: C = Cliente final, G = Garantia, I = Interna.
- Nova listagem: TAG, data, cliente, placa (quando habilitada), pedido, tipo do pedido, dias, responsável, status e botão circular para abrir.
- Sinalização da linha inteira: vermelho quando houver B.O.; amarelo em reserva parcial; verde quando todas as peças estiverem reservadas; azul/neutro para pendentes/agendados.
- Pedidos totalmente reservados mostram "Pronto para contato" e há quantos dias ficaram completos.
- B.O. mostra há quantos dias o item permanece nessa situação.
- Pedidos recebidos/finalizados usam verde neutro, diferenciando-os da fila de clientes ainda a contatar.

## Configuração e replicação

- Nova aba "Pedidos de peças" nas configurações da empresa.
- A configuração dos campos é armazenada em `store_settings.parts_order_settings`.
- Ao replicar "Módulos e limites" entre empresas do mesmo grupo, a configuração do módulo Pedidos de peças também é copiada.

## Correções técnicas

- Corrigidas duas inconsistências TypeScript preexistentes no painel MASTER e no editor de O.S.
