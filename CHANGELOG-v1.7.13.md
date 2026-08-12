# Gerivo v1.7.13

Revisão visual e correções de consistência sobre a v1.7.12.

## Orçamentos

- Removido o bloco superior redundante “Orçamentação / Gestão de orçamentos”.
- A tela passa a iniciar diretamente pelos filtros e pela listagem.

## Pedidos de peças

- Cabeçalho reduzido e alinhado ao restante do Gerivo.
- Cor do cabeçalho e dos destaques vinculada à cor de seleção configurada na identidade da empresa.
- Removidos os textos “Módulo opcional” e a descrição redundante do módulo.
- Botão “Registrar novo pedido” redimensionado.
- Novo pedido exibe apenas o título “Novo pedido”, sem “Pedido #novo”.
- Formulário convertido para modal central amplo no desktop.
- Dados gerais e peças ficam lado a lado em telas grandes.
- Removido o texto explicativo repetido acima das peças.
- Corrigidos cortes de campos, cartões e textos.
- Mantida rolagem interna somente quando a quantidade de peças exigir.

## Gerivo BI

- Removidos os textos redundantes de escopo e apresentação comercial.
- O seletor de unidades ficou compacto.
- Comparativos ocupam largura total.
- Corrigido o estado vazio que quebrava palavras em uma coluna estreita.
- Corrigida a adaptação dos comparativos para diferentes larguras.

## Gerivo MASTER

- Corrigida a grade dos indicadores, que estava formando cartões gigantes em coluna.
- Status de empresa e grupo traduzidos para português.
- Diferenciação clara entre empresa ativa e contrato/plano ativo.
- Empresa ativa sem assinatura agora exibe: “Empresa cadastrada e operacional, porém ainda sem plano contratado”.

## Banco e migration

- A migration `011_v1712_optional_parts_orders.sql` foi substituída pela versão corrigida, que trata o trigger `guard_store_contracted_modules` durante a atualização estrutural.
- Não há migration nova para a v1.7.13.
