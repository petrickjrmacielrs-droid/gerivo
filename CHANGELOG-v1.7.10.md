# Gerivo v1.7.10

## Importação Mobato e NBS

- Importação de documentos em PDF, PNG, JPG ou WEBP dentro do orçamento.
- Reconhecimento somente de peças/produtos e serviços/mão de obra.
- Cliente, veículo e placa não são lidos nem substituídos.
- Linhas riscadas, canceladas ou não autorizadas devem ser descartadas pelo reconhecedor.
- Prévia editável e seleção item a item antes da inclusão.
- Código, descrição, categoria, quantidade/tempo, valor unitário e total podem ser revisados.
- O documento pode ser identificado automaticamente ou marcado como Mobato/NBS.

## Quantidades decimais

- Campo de quantidade/tempo aceita vírgula ou ponto.
- Valores como 0,5; 0,8; 1,1; 1,6; 2,25 e 4,3 são preservados.
- O valor só é normalizado ao sair do campo ou pressionar Enter, evitando arredondamentos durante a digitação.

## Navegação

- Gerivo BI removido do menu Gestão. O acesso permanece somente na barra lateral quando o módulo estiver contratado e autorizado.

## Banco de dados

- Não existe migration nova para esta versão.

## Configuração do reconhecedor

O reconhecimento de imagem e PDF utiliza a API configurada no servidor:

```env
OPENAI_API_KEY=
OPENAI_IMPORT_MODEL=gpt-5-mini
```

Sem chave, o cadastro manual de itens continua disponível normalmente.
