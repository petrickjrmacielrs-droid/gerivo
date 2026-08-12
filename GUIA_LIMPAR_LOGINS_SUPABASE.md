# Limpeza de logins de teste no Supabase

## Antes de excluir

Não apague o login MASTER/Owner. Faça backup ou exporte a relação de usuários.

Consulta de conferência no SQL Editor:

```sql
select
  u.id,
  u.email,
  u.created_at,
  u.last_sign_in_at,
  p.full_name,
  p.platform_role,
  p.active
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at desc;
```

## Método recomendado para poucos usuários

1. Abra Authentication → Users no painel do Supabase.
2. Localize o usuário de teste.
3. Confirme que não é o MASTER/Owner.
4. Exclua o usuário.

O projeto possui vínculos com empresas, unidades e registros operacionais. Uma exclusão pode falhar quando o usuário ainda está referenciado como criador de algum registro ou possui objetos no Storage.

## Apenas bloquear os logins sem apagar histórico

Este método é mais seguro durante os testes:

```sql
begin;

update public.profiles
set active = false,
    updated_at = now()
where platform_role <> 'MASTER';

update public.company_members
set active = false
where user_id in (
  select id from public.profiles where platform_role <> 'MASTER'
);

update public.store_members
set active = false
where user_id in (
  select id from public.profiles where platform_role <> 'MASTER'
);

commit;
```

Isso bloqueia os usuários no Gerivo, mas mantém os registros e os usuários no Supabase Auth.

## Exclusão definitiva em lote

Não use `delete from auth.users` em massa sem antes mapear as referências `created_by`, `updated_by`, arquivos do Storage e históricos. Para exclusão definitiva, use uma rotina de servidor com a chave secreta/service role e a API administrativa do Supabase, preservando o MASTER.
