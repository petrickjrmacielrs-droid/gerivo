# Gerivo v1.7.13.2

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

O reconhecimento de PDF/imagem também exige no servidor:

```env
OPENAI_API_KEY=
OPENAI_IMPORT_MODEL=gpt-5-mini
```

## Exclusão definitiva

A exclusão de empresa ou grupo exige confirmação pelo nome exato e está disponível somente para o MASTER. Use primeiro em registros de teste.



## Hotfix v1.7.13.2

- Corrige a leitura local de PDFs Mobato/NBS usando extração tabular antes do parser textual.
- Melhora o reconhecimento de serviços e peças com códigos como REVN, PCT e BRPRT.
- Mantém quantidades/tempos decimais na importação.
- Oculta integralmente o Assistente Consultivo dentro do orçamento quando o módulo ASSISTANT estiver desativado na empresa.
- Não exige SQL novo.

Consulte `CHANGELOG-v1.7.13.2.md`.

## Hotfix v1.7.13.1

Consulte `CHANGELOG-v1.7.13.1.md` e execute `supabase/migrations/012_v17131_user_management_repair.sql`.
