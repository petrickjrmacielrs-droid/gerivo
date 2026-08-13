# Gerivo v1.7.13.3 — Hotfix

## Importador Mobato / NBS
- Prioriza os itens grifados em amarelo no PDF.
- Para linhas grifadas, importa descrição, quantidade/tempo e valor.
- Detecta grifos amarelos salvos como anotação PDF.
- Possui fallback local para grifos amarelos desenhados diretamente na página do PDF.
- Mantém o parser estrutural/textual anterior quando o arquivo não contém grifos detectáveis.
- Reconhecimento visual, quando configurado, também foi orientado a importar somente linhas grifadas quando houver marca-texto amarelo.
- Linhas riscadas/tachadas continuam fora da importação.
- Prévia editável permanece obrigatória.

## Pedidos de peças
- Corrigida a rolagem do cadastro/edição de pedidos.
- A tela passa a rolar pelo conteúdo completo quando existem várias peças.
- Removido o limite visual que impedia acessar peças após os primeiros cards.
- O rodapé com Cancelar / Salvar permanece acessível.

## Orçamentos
- Adicionado botão de exclusão na listagem de orçamentos.
- Adicionado botão Excluir dentro do editor do orçamento.
- A exclusão exige confirmação antes de remover o registro.
- A exclusão é sincronizada junto ao snapshot da unidade.

## Banco de dados
- Nenhum SQL novo nesta versão.
