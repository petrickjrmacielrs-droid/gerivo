# Gerivo v1.7.13.1

Hotfix cumulativo sobre a v1.7.13.

## Gestão de usuários

- Corrige a falha ao carregar a equipe da empresa.
- Preserva e mostra a mensagem real devolvida pelo Supabase, em vez de ocultá-la com aviso genérico.
- Adiciona botão **Tentar novamente**.
- A listagem continua funcionando em bases antigas mesmo antes da execução do SQL de reparo.
- A criação agora valida todos os retornos de `profiles`, `company_members` e `store_members`.
- Evita login órfão no Supabase Auth: se o cadastro falhar depois da criação da credencial, o usuário recém-criado é removido automaticamente.
- Usa `upsert` explícito para perfil, empresa e unidade.
- Valida o limite de usuários do plano.
- Informa claramente quando o schema de função profissional ainda não foi atualizado.

## Importador Mobato/NBS

- PDF original com texto passa primeiro por leitura local no servidor.
- A chave de reconhecimento visual deixa de ser obrigatória para PDFs textuais reconhecíveis.
- Imagens e PDFs digitalizados continuam usando reconhecimento visual quando configurado.
- Remove mensagens técnicas com nome de variável de ambiente da interface do consultor.
- Mantém a prévia editável e a revisão obrigatória antes de adicionar os itens.
- Preserva quantidades decimais.
- Mantém heurísticas para ignorar linhas canceladas, não autorizadas ou marcadas com traços.

## Banco de dados

Execute uma única vez:

```text
supabase/migrations/012_v17131_user_management_repair.sql
```

A migration apenas repara o schema de usuários e garante perfis para logins existentes. Não altera contratação, módulos ou orçamentos.
