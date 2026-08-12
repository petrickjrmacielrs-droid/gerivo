# Testes recomendados — Gerivo v1.7.11

## Grupo e empresas

1. Renomear um grupo e atualizar a página.
2. Criar duas empresas no mesmo grupo.
3. Replicar identidade/checklist da primeira para a segunda.
4. Confirmar que clientes e orçamentos não foram copiados.
5. Criar uma empresa de teste, excluí-la pelo nome exato e recriá-la.
6. Criar um grupo de teste, excluí-lo e recriá-lo.

## Usuários

1. Criar um gestor.
2. Marcar empresas e unidades específicas do grupo.
3. Entrar com o gestor e confirmar que somente o escopo autorizado aparece.
4. Editar o mesmo usuário e adicionar uma segunda unidade.
5. Cadastrar a função `Consultor de Serviços`.
6. Confirmar que o usuário aparece no campo Consultor do orçamento.
7. Solicitar redefinição de senha.
8. Confirmar que nenhum gestor visualiza o usuário MASTER.

## BI

1. Empresa com somente Orçamentos + BI: confirmar BI Comercial.
2. Filtrar este mês, mês anterior e período personalizado.
3. Comparar todas as unidades autorizadas.
4. Filtrar um consultor.
5. Marcar orçamentos como aprovados e não aprovados.
6. Validar conversão, valor aprovado, valor perdido e motivos de perda.

## Importador Mobato/NBS

1. Empresa sem contratação: botão não aparece e API bloqueia.
2. Empresa IESA existente: módulo entra liberado após a migration.
3. Importar PDF/imagem.
4. Confirmar que cliente, veículo e placa não são alterados.
5. Confirmar que linhas riscadas ficam fora.
6. Confirmar quantidades 0,8, 1,1 e 1,6.
