# Roteiro de testes — Gerivo v1.7.13

## Orçamentos

1. Abrir Orçamentos.
2. Confirmar que a tela começa pelos filtros, sem o banner “Gestão de orçamentos”.
3. Buscar e abrir um orçamento.

## Pedidos de peças

1. Alterar a cor de seleção na Identidade visual.
2. Abrir Pedidos de peças e confirmar que o cabeçalho acompanha a identidade.
3. Confirmar que “Módulo opcional” e a descrição antiga não aparecem.
4. Clicar em Registrar novo pedido.
5. Confirmar que o título é apenas “Novo pedido”.
6. Adicionar duas ou mais peças.
7. Conferir os campos em resolução desktop e celular.
8. Salvar, reabrir e consultar Histórico.

## Gerivo BI

1. Abrir Gerivo BI.
2. Alternar entre unidade atual e unidades autorizadas.
3. Confirmar que não existem textos quebrados no estado vazio.
4. Testar Este mês, Mês anterior e Personalizado.

## Gerivo MASTER

1. Abrir Gerivo MASTER.
2. Conferir os quatro indicadores na mesma grade em desktop.
3. Selecionar empresa ativa sem assinatura.
4. Confirmar que a tela diferencia status da empresa e contratação.
5. Conferir status em português na estrutura empresarial.

## Build

```bat
rmdir /s /q .next
npm install
npm run build
npm run dev
```
