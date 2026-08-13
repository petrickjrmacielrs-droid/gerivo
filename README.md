# Gerivo v1.7.14.1

Atualização do fluxo de Pedidos de peças: cadastro em tela ampla, acompanhamento após salvar, TAG C/G/I, campos opcionais configuráveis por empresa e sinalização visual da listagem por status.

## Migration desta versão

```text
supabase/migrations/013_v17141_parts_orders_workflow.sql
```

Consulte `PASSO_A_PASSO_v1.7.14.1.txt` e `TESTES-v1.7.14.1.md`.

# Gerivo v1.7.13.3

Revisão visual das telas de Orçamentos, Pedidos de peças, Gerivo BI e Gerivo MASTER. A versão mantém o módulo opcional de Pedidos de peças e incorpora a migration 011 corrigida.

# Gerivo v1.7.11

Plataforma white-label de gestão operacional e comercial.

## Atualização

Consulte `PASSO_A_PASSO_v1.7.11.txt`.

## Migration desta versão

```text
supabase/migrations/010_v1711_groups_access_importer.sql
```

## Importador Mobato/NBS

É um módulo adicional. A migration libera inicialmente o recurso somente para empresas IESA já cadastradas. Para outra empresa, o MASTER precisa editar a contratação, selecionar Plano personalizado e ativar `Importador Mobato / NBS`.

PDFs originais do Mobato/NBS são processados localmente quando a estrutura ou os grifos podem ser reconhecidos. A chave de reconhecimento visual é opcional e fica reservada para imagens, digitalizações ou documentos que não possam ser interpretados localmente.

## Exclusão definitiva

A exclusão de empresa ou grupo exige confirmação pelo nome exato e está disponível somente para o MASTER. Use primeiro em registros de teste.



## Hotfix v1.7.13.3

- Prioriza linhas grifadas em amarelo na importação Mobato/NBS.
- Importa descrição, quantidade/tempo e valor dos itens selecionados.
- Corrige rolagem de pedidos com várias peças.
- Adiciona exclusão de orçamentos na listagem e no editor.
- Não exige SQL novo.

Consulte `CHANGELOG-v1.7.13.3.md`.

## Hotfix v1.7.13.2

- Corrige a leitura local de PDFs Mobato/NBS usando extração tabular antes do parser textual.
- Melhora o reconhecimento de serviços e peças com códigos como REVN, PCT e BRPRT.
- Mantém quantidades/tempos decimais na importação.
- Oculta integralmente o Assistente Consultivo dentro do orçamento quando o módulo ASSISTANT estiver desativado na empresa.
- Não exige SQL novo.

Consulte `CHANGELOG-v1.7.13.2.md`.

## Hotfix v1.7.13.1

Consulte `CHANGELOG-v1.7.13.1.md` e execute `supabase/migrations/012_v17131_user_management_repair.sql`.
