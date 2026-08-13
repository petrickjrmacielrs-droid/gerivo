# Gerivo v1.7.14

## Central Gerivo MASTER

- O MASTER agora entra primeiro em uma Central Gerivo própria, separada da identidade visual de qualquer empresa cliente.
- Novo visual dark/neon exclusivo da plataforma.
- Central de grupos, empresas, contratos, módulos e limites.
- Acesso direto à operação de qualquer unidade a partir da central.
- Criação de grupo empresarial sem exigir uma empresa imediatamente.
- Criação de empresa permite escolher Novo grupo ou Grupo existente.
- Ao vincular a empresa a um grupo existente, surge a etapa **Replicar base**.
- A nova empresa pode copiar seletivamente:
  - identidade visual;
  - checklist;
  - preços e condições;
  - modelos de mensagens;
  - conhecimento da IA;
  - catálogo;
  - módulos e limites;
  - usuários, funções e acessos.
- Usuários replicados reutilizam os mesmos logins; não são criadas contas duplicadas no Supabase Auth.
- Clientes, orçamentos, O.S., pedidos de peças, estoque movimentado e históricos não são replicados.
- A função Replicar configurações de grupos existentes também passa a aceitar módulos/limites e usuários.

## Contratações por empresa

- Corrigido o salvamento de contratação que anteriormente podia propagar status e módulos para todas as empresas do mesmo grupo.
- Agora cada empresa/CNPJ mantém sua própria contratação.
- Alterações em outras empresas do grupo só ocorrem por replicação explícita do MASTER.

## Importador Mobato / NBS

- Removida a regra incorreta que dependia de grifo amarelo.
- Grifos podem existir ou não e não definem quais itens serão importados.
- O importador procura linhas ativas de peças e mão de obra e prioriza descrição, quantidade/tempo e valor.
- Mantida a regra de ignorar itens riscados/tachados.
- Adicionada uma leitura local por coordenadas das linhas do PDF para melhorar documentos tabulares do Mobato/NBS.
- A leitura por coordenadas tenta detectar riscos horizontais sobre as linhas renderizadas para descartá-las antes da prévia.

## Banco de dados

- Não há migration SQL nova nesta versão.
