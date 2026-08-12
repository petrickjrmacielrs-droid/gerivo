# Gerivo v1.7.11

Atualização consolidada sobre a v1.7.10.

## Gestão empresarial pelo MASTER

- edição do nome do grupo empresarial;
- exclusão definitiva de empresa;
- exclusão definitiva de grupo, incluindo suas empresas quando confirmada;
- confirmação digitando exatamente o nome do registro antes da exclusão;
- replicação seletiva de configurações entre unidades do mesmo grupo;
- dados operacionais, usuários, clientes, orçamentos e históricos não são replicados.

## Usuários, empresas e unidades

- o mesmo login pode ser vinculado a várias empresas e unidades do grupo;
- o MASTER define exatamente quais empresas e unidades cada gestor visualiza;
- gestores continuam limitados ao próprio escopo;
- usuário MASTER permanece oculto para gestores e administradores;
- edição de usuários existentes e redefinição de senha dentro do escopo permitido;
- cadastro da função profissional;
- opção `Consultor de Serviços`, usada automaticamente na seleção dos orçamentos.

## Gerivo BI

- visão da unidade atual, de todas as unidades autorizadas ou de uma unidade específica;
- BI comercial próprio para empresas que utilizam somente Orçamentos;
- filtros por este mês, mês anterior, 3 meses, 6 meses, ano e período personalizado;
- filtro por Consultor de Serviços;
- conversão por quantidade e por valor;
- valor orçado, aprovado, perdido e em aberto;
- comparação entre unidades autorizadas;
- ranking de consultores;
- motivos de não aprovação.

## Importador Mobato / NBS

- passa a ser um módulo adicional, desligado por padrão;
- liberação inicial automática somente para empresas já cadastradas cujo nome contenha `IESA`;
- novas liberações são feitas individualmente pelo MASTER em Plano personalizado;
- PDF e imagens;
- importa somente peças e mão de obra;
- ignora linhas riscadas;
- mantém cliente, veículo e placa do orçamento atual;
- prévia editável;
- preserva quantidades decimais.

## Banco de dados

Execute a migration:

```text
supabase/migrations/010_v1711_groups_access_importer.sql
```

Ela deve ser executada depois da migration 009.
