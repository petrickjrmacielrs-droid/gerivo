-- Gerivo v1.7.13.1 — reparo da gestão de usuários
-- Execute uma única vez no Supabase SQL Editor após a migration 011.
-- Este script não altera planos, módulos contratados nem dados operacionais.

begin;

alter table public.store_members
  add column if not exists job_function text not null default 'OUTRO';

alter table public.store_members
  add column if not exists custom_job_function text;

alter table public.store_members
  add column if not exists available_as_consultant boolean not null default false;

create index if not exists store_members_consultant_idx
  on public.store_members(store_id, active, available_as_consultant)
  where active = true and available_as_consultant = true;

-- Garante que logins existentes no Auth possuam perfil correspondente.
insert into public.profiles (
  id,
  username,
  username_normalized,
  email,
  recovery_email,
  full_name,
  active,
  updated_at
)
select
  u.id,
  replace(nullif(public.slugify(replace(coalesce(u.raw_user_meta_data ->> 'username', ''), '-', '.')), ''), '-', '.'),
  replace(nullif(public.slugify(replace(coalesce(u.raw_user_meta_data ->> 'username', ''), '-', '.')), ''), '-', '.'),
  u.email,
  u.email,
  coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(u.email, ''), '@', 1)),
  true,
  now()
from auth.users u
on conflict (id) do update set
  email = excluded.email,
  recovery_email = coalesce(public.profiles.recovery_email, excluded.recovery_email),
  full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
  active = coalesce(public.profiles.active, true),
  updated_at = now();

update public.store_members
set available_as_consultant = true
where upper(coalesce(job_function, '')) in (
  'CONSULTOR_SERVICOS',
  'CONSULTOR DE SERVIÇOS',
  'CONSULTOR DE SERVICOS'
);

notify pgrst, 'reload schema';

commit;

-- Conferência final.
select
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'store_members' and column_name = 'job_function'
  ) as job_function_ok,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'store_members' and column_name = 'custom_job_function'
  ) as custom_job_function_ok,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'store_members' and column_name = 'available_as_consultant'
  ) as available_as_consultant_ok,
  (select count(*) from auth.users) as auth_users,
  (select count(*) from public.profiles) as profiles;
