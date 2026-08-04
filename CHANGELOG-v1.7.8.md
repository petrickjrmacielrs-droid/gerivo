# Gerivo v1.7.8 — atualização cumulativa

Base: Gerivo v1.7.7. Compatível com atualização direta a partir da v1.7.6.

## Operação compartilhada por unidade

- Clientes, veículos, agendamentos, checklist, O.S., orçamentos, catálogo, estoque e conhecimento passam a ter um snapshot compartilhado no Supabase.
- Usuários autorizados da mesma unidade visualizam os registros criados por colegas.
- Atualizações de outro usuário são refletidas em tempo real quando o Realtime do Supabase está disponível.
- A primeira abertura da v1.7.8 faz uma migração controlada dos dados locais para a unidade online.
- Indicador no topo mostra: Loja sincronizada, Sincronizando ou Salvamento local.

## Checklist mobile

- Correção estrutural do campo de foto que abria a câmera ao tocar em outras áreas.
- A câmera/galeria abre somente ao tocar em Fotos gerais ou Adicionar foto.
- Inputs de arquivo ficam ocultos e são acionados por botão explícito.
- Remoção do `capture` forçado para permitir câmera ou galeria conforme o aparelho.
- Botões de resposta continuam independentes e com área de toque profissional.
- Layout mobile, rodapé e transições refinados.

## Segurança de sessão

- Aviso aos 28 minutos de inatividade.
- Logout automático aos 30 minutos sem uso.
- Antes do logout, o Gerivo salva localmente e tenta sincronizar a unidade.
- Página, atendimento, O.S., orçamento e etapa atual são recuperados após novo login.

## Planos e site de vendas

- MASTER pode editar valores mensal e anual dos planos.
- Edição de limites de empresas, unidades, usuários, armazenamento e franquia da IA.
- Conteúdo público editável: descrição, benefícios, botão, ordem, visibilidade e plano recomendado.
- O site de vendas consulta os planos diretamente do Supabase e atualiza automaticamente.
- Alterações ficam registradas em `audit_logs`.

## Identidade

- Favicon substituído pelo símbolo oficial do Gerivo.
- Apple icon incluído para atalhos em celular.

## Experiência visual

- Transições de página, modais, cards, menus e botões suavizadas.
- Respeito à preferência de redução de movimento do dispositivo.
- Indicadores e modais adaptados ao celular.

## Banco de dados

Nova migration:

`supabase/migrations/009_v178_shared_operation_mobile_public_plans.sql`

Para quem está na v1.7.6 e não instalou a v1.7.7, use somente:

`SQL_ATUALIZAR_v1.7.6_PARA_v1.7.8.sql`
