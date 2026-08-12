# Gerivo v1.7.13.2

Hotfix cumulativo sobre a v1.7.13.1.

## Importador Mobato/NBS

- Passa a tentar a extração estrutural das tabelas do PDF antes do parser textual.
- Reconhece os formatos usuais do Mobato para serviços e peças.
- Reconhece o formato tabular do NBS com código, descrição, quantidade/tempo, valor unitário e total.
- Melhora a classificação entre mão de obra e peças por código e contexto.
- Preserva quantidades/tempos decimais e calcula valor unitário quando o documento informa apenas tempo e valor final.
- Mantém a prévia obrigatória antes de adicionar os itens ao orçamento.
- Mantém o fallback para reconhecimento visual quando configurado.

> Observação: riscos desenhados graficamente sobre o PDF podem não aparecer na camada de texto. Quando o parser local não conseguir identificar visualmente um risco, a prévia continua obrigatória para conferência. Com reconhecimento visual configurado, o Gerivo continua instruído a ignorar linhas riscadas.

## Assistente Gerivo nos orçamentos

- O bloco "Assistente consultivo / Revisão da proposta" não é mais renderizado quando o módulo ASSISTANT está desativado para a empresa atual.
- Os botões "Analisar" e "Melhorar mensagem" também desaparecem junto com o bloco.
- A rota de IA continua validando contratação e acesso no servidor.

## Banco de dados

Nenhuma migration nova nesta versão.
