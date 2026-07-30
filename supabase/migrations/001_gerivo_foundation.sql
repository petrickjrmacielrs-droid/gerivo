-- Gerivo v1.7 — Fundação online, comercial e modular
-- Execute integralmente no Supabase: SQL Editor > New query > Run.
-- Pode ser executado novamente durante a homologação.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;

create sequence if not exists public.store_public_code_seq
  increment by 1
  minvalue 10
  start with 10;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.slugify(value text)
returns text
language sql
stable
as $$
  select trim(both '-' from regexp_replace(lower(extensions.unaccent(coalesce(value, ''))), '[^a-z0-9]+', '-', 'g'));
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  username_normalized text,
  email text,
  recovery_email text,
  full_name text,
  phone text,
  avatar_url text,
  platform_role text not null default 'USER' check (platform_role in ('USER', 'MASTER')),
  active boolean not null default true,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists username_normalized text;
alter table public.profiles add column if not exists recovery_email text;
alter table public.profiles add column if not exists must_change_password boolean not null default false;
create unique index if not exists profiles_username_normalized_unique
  on public.profiles(username_normalized)
  where username_normalized is not null;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  segment text not null default 'OUTRO',
  status text not null default 'DRAFT' check (status in ('DRAFT','AWAITING_ACTIVATION','ACTIVE','GRACE','READ_ONLY','SUSPENDED','CANCELED','EXPIRED','DEMO')),
  active boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies add column if not exists status text not null default 'DRAFT';

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  public_code bigint not null default nextval('public.store_public_code_seq'),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  slug text not null,
  active boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, slug)
);

alter table public.stores add column if not exists public_code bigint;
alter table public.stores alter column public_code set default nextval('public.store_public_code_seq');
update public.stores set public_code = nextval('public.store_public_code_seq') where public_code is null;
alter table public.stores alter column public_code set not null;
create unique index if not exists stores_public_code_unique on public.stores(public_code);
select setval('public.store_public_code_seq', greatest(10, coalesce((select max(public_code) from public.stores), 9) + 1), false);

create table if not exists public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'MEMBER' check (role in ('MASTER', 'ADMIN', 'MANAGER', 'MEMBER')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key(company_id, user_id)
);

create table if not exists public.store_members (
  store_id uuid not null references public.stores(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'MEMBER' check (role in ('MASTER', 'ADMIN', 'MANAGER', 'MEMBER')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key(store_id, user_id)
);

create table if not exists public.store_settings (
  store_id uuid primary key references public.stores(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  display_name text not null,
  logo_value text,
  sidebar_color text not null default '#0d1b28',
  company_profile text not null default 'CUSTOM' check (company_profile in ('FULL', 'QUOTE_ONLY', 'CUSTOM')),
  modules jsonb not null default '{"APPOINTMENTS":false,"CATALOG":false,"INVENTORY":false,"CHECKLIST":false,"ORDERS":false,"QUOTES":false,"ASSISTANT":false}'::jsonb,
  quote_delivery_mode text not null default 'BOTH' check (quote_delivery_mode in ('LINK', 'MESSAGE', 'BOTH')),
  quote_message_template text not null default 'PROFISSIONAL' check (quote_message_template in ('PROFISSIONAL', 'DIRETA', 'CONSULTIVA', 'PREVENTIVA')),
  checklist_name text not null default 'Checklist padrão',
  checklist_enabled_keys jsonb not null default '{}'::jsonb,
  general_margin numeric(8,2) not null default 35,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.store_settings add column if not exists general_margin numeric(8,2) not null default 35;

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  monthly_price numeric(12,2) not null default 0,
  annual_price numeric(12,2) not null default 0,
  company_limit integer not null default 1,
  store_limit integer not null default 1,
  user_limit integer not null default 1,
  storage_gb integer not null default 5,
  ai_queries_monthly integer not null default 0,
  modules jsonb not null default '{}'::jsonb,
  features jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  plan_id uuid references public.subscription_plans(id),
  status text not null default 'AWAITING_ACTIVATION' check (status in ('DRAFT','AWAITING_ACTIVATION','ACTIVE','GRACE','READ_ONLY','SUSPENDED','CANCELED','EXPIRED','DEMO')),
  billing_cycle text not null default 'ANNUAL' check (billing_cycle in ('MONTHLY','QUARTERLY','SEMIANNUAL','ANNUAL','CUSTOM')),
  contracted_months integer not null default 12 check (contracted_months > 0),
  contracted_value numeric(12,2) not null default 0,
  discount_value numeric(12,2) not null default 0,
  user_limit integer not null default 1,
  store_limit integer not null default 1,
  company_limit integer not null default 1,
  storage_gb integer not null default 5,
  ai_queries_monthly integer not null default 0,
  modules jsonb not null default '{}'::jsonb,
  activated_at timestamptz,
  expires_at timestamptz,
  grace_until timestamptz,
  read_only_until timestamptz,
  activated_by uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists company_subscriptions_company_idx on public.company_subscriptions(company_id, created_at desc);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  document text,
  phone text,
  email text,
  payment_terms text,
  lead_time_days integer not null default 0,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  name text not null,
  category text not null default 'Geral',
  kind text not null default 'PRODUTO' check (kind in ('SERVICO','PRODUTO','PECA','KIT','MATERIAL')),
  sku text,
  image_url text,
  reference_image text,
  cost numeric(12,2) not null default 0,
  price numeric(12,2) not null default 0,
  margin_mode text not null default 'GENERAL' check (margin_mode in ('GENERAL','INDIVIDUAL')),
  individual_margin numeric(8,2),
  stock numeric(14,3) not null default 0,
  minimum_stock numeric(14,3) not null default 0,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
  movement_type text not null check (movement_type in ('ENTRY','EXIT','ADJUSTMENT','TRANSFER_IN','TRANSFER_OUT','LOSS')),
  quantity numeric(14,3) not null,
  unit_cost numeric(12,2),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_name text not null,
  customer_phone text,
  title text not null,
  professional text,
  starts_at timestamptz not null,
  duration_minutes integer not null default 60,
  status text not null default 'AGENDADO' check (status in ('AGENDADO','CONFIRMADO','EM_ATENDIMENTO','CONCLUIDO','CANCELADO')),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  company_id uuid references public.companies(id) on delete set null,
  store_id uuid references public.stores(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index if not exists stores_company_idx on public.stores(company_id);
create index if not exists company_members_user_idx on public.company_members(user_id) where active;
create index if not exists store_members_user_idx on public.store_members(user_id) where active;
create index if not exists store_members_company_idx on public.store_members(company_id);
create index if not exists catalog_items_store_idx on public.catalog_items(store_id, active);
create index if not exists suppliers_store_idx on public.suppliers(store_id, active);
create index if not exists appointments_store_date_idx on public.appointments(store_id, starts_at);

create or replace function public.is_platform_master()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and platform_role = 'MASTER' and active = true
  );
$$;

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_platform_master() or exists (
    select 1 from public.company_members
    where company_id = target_company_id and user_id = auth.uid() and active = true
  );
$$;

create or replace function public.is_company_admin(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_platform_master() or exists (
    select 1 from public.company_members
    where company_id = target_company_id
      and user_id = auth.uid()
      and role in ('MASTER','ADMIN','MANAGER')
      and active = true
  );
$$;

create or replace function public.is_store_member(target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_platform_master() or exists (
    select 1 from public.store_members
    where store_id = target_store_id and user_id = auth.uid() and active = true
  );
$$;

grant execute on function public.is_platform_master() to authenticated;
grant execute on function public.is_company_member(uuid) to authenticated;
grant execute on function public.is_company_admin(uuid) to authenticated;
grant execute on function public.is_store_member(uuid) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_username text;
begin
  v_username := nullif(public.slugify(replace(coalesce(new.raw_user_meta_data ->> 'username', ''), '-', '.')), '');
  v_username := replace(v_username, '-', '.');
  insert into public.profiles (
    id, username, username_normalized, email, recovery_email, full_name
  ) values (
    new.id,
    v_username,
    v_username,
    new.email,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do update set
    email = excluded.email,
    recovery_email = coalesce(public.profiles.recovery_email, excluded.recovery_email),
    full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email on auth.users
for each row execute procedure public.handle_new_user();

insert into public.profiles (id, email, recovery_email, full_name)
select id, email, email, coalesce(raw_user_meta_data ->> 'full_name', split_part(coalesce(email, ''), '@', 1))
from auth.users
on conflict (id) do update set email = excluded.email, updated_at = now();

create or replace function public.protect_profile_platform_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.platform_role is distinct from old.platform_role
     and current_user not in ('postgres','supabase_admin','service_role')
     and not public.is_platform_master() then
    raise exception 'Somente o MASTER Gerivo pode alterar a função da plataforma.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_platform_role on public.profiles;
create trigger protect_profile_platform_role
before update on public.profiles
for each row execute procedure public.protect_profile_platform_role();

create or replace function public.protect_contracted_modules()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.modules is distinct from old.modules
     and current_user not in ('postgres','supabase_admin','service_role')
     and not public.is_platform_master() then
    raise exception 'Os módulos contratados são definidos pelo MASTER Gerivo.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_contracted_modules on public.store_settings;
create trigger protect_contracted_modules
before update on public.store_settings
for each row execute procedure public.protect_contracted_modules();

-- Atualização automática de timestamps.
do $$
declare t text;
begin
  foreach t in array array['profiles','companies','stores','store_settings','subscription_plans','company_subscriptions','suppliers','catalog_items','appointments'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute procedure public.set_updated_at()', t || '_updated_at', t);
  end loop;
end $$;

-- Planos sugeridos da Gerivo.
insert into public.subscription_plans (
  code, name, monthly_price, annual_price, company_limit, store_limit, user_limit,
  storage_gb, ai_queries_monthly, modules, features, sort_order
) values
(
  'ESSENCIAL','Gerivo Essencial',119,1188,1,1,3,5,0,
  '{"APPOINTMENTS":true,"CATALOG":true,"INVENTORY":false,"CHECKLIST":false,"ORDERS":false,"QUOTES":true,"ASSISTANT":false}'::jsonb,
  '["Painel inicial","Clientes","Catálogo","Orçamentos","Agenda básica","Identidade visual","Relatórios básicos"]'::jsonb, 10
),
(
  'GESTAO','Gerivo Gestão',219,2148,1,2,8,20,100,
  '{"APPOINTMENTS":true,"CATALOG":true,"INVENTORY":true,"CHECKLIST":true,"ORDERS":true,"QUOTES":true,"ASSISTANT":true}'::jsonb,
  '["Tudo do Essencial","Ordens de trabalho","Estoque","Fornecedores","Compras","Pesquisa de satisfação","Pacote de segmento"]'::jsonb, 20
),
(
  'PROFISSIONAL','Gerivo Profissional',349,3588,2,5,20,50,500,
  '{"APPOINTMENTS":true,"CATALOG":true,"INVENTORY":true,"CHECKLIST":true,"ORDERS":true,"QUOTES":true,"ASSISTANT":true}'::jsonb,
  '["Tudo do Gestão","Financeiro gerencial","Indicadores avançados","Auditoria","Automações","Assistente Gerivo"]'::jsonb, 30
),
(
  'ENTERPRISE','Gerivo Enterprise',599,0,999,999,999,500,5000,
  '{"APPOINTMENTS":true,"CATALOG":true,"INVENTORY":true,"CHECKLIST":true,"ORDERS":true,"QUOTES":true,"ASSISTANT":true}'::jsonb,
  '["Limites personalizados","Implantação acompanhada","Migração de dados","Suporte prioritário","Integrações"]'::jsonb, 40
)
on conflict (code) do update set
  name = excluded.name,
  monthly_price = excluded.monthly_price,
  annual_price = excluded.annual_price,
  company_limit = excluded.company_limit,
  store_limit = excluded.store_limit,
  user_limit = excluded.user_limit,
  storage_gb = excluded.storage_gb,
  ai_queries_monthly = excluded.ai_queries_monthly,
  modules = excluded.modules,
  features = excluded.features,
  active = true,
  sort_order = excluded.sort_order,
  updated_at = now();

create or replace function public.bootstrap_first_company(
  p_company_name text,
  p_store_name text,
  p_segment text default 'OUTRO'
)
returns table(company_id uuid, store_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_store_id uuid;
  v_company_slug text;
  v_store_slug text;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado.'; end if;
  if not public.is_platform_master() then raise exception 'Somente o MASTER Gerivo pode cadastrar novas empresas.'; end if;
  if coalesce(trim(p_company_name), '') = '' then raise exception 'Informe o nome da empresa.'; end if;

  v_company_slug := public.slugify(p_company_name) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  v_store_slug := public.slugify(coalesce(nullif(trim(p_store_name), ''), p_company_name));

  insert into public.companies (name, slug, segment, status, active, created_by)
  values (trim(p_company_name), v_company_slug, upper(coalesce(p_segment, 'OUTRO')), 'AWAITING_ACTIVATION', false, v_user_id)
  returning id into v_company_id;

  insert into public.stores (company_id, name, slug, active, created_by)
  values (v_company_id, coalesce(nullif(trim(p_store_name), ''), trim(p_company_name)), v_store_slug, false, v_user_id)
  returning id into v_store_id;

  insert into public.company_members (company_id, user_id, role, active)
  values (v_company_id, v_user_id, 'MASTER', true)
  on conflict (company_id, user_id) do update set role = 'MASTER', active = true;

  insert into public.store_members (store_id, company_id, user_id, role, active)
  values (v_store_id, v_company_id, v_user_id, 'MASTER', true)
  on conflict (store_id, user_id) do update set role = 'MASTER', active = true;

  insert into public.store_settings (store_id, company_id, display_name, updated_by)
  values (v_store_id, v_company_id, coalesce(nullif(trim(p_store_name), ''), trim(p_company_name)), v_user_id)
  on conflict (store_id) do nothing;

  insert into public.company_subscriptions (company_id, status, contracted_months, created_at)
  values (v_company_id, 'AWAITING_ACTIVATION', 12, now());

  return query select v_company_id, v_store_id;
end;
$$;

grant execute on function public.bootstrap_first_company(text, text, text) to authenticated;

create or replace function public.master_activate_subscription(
  p_company_id uuid,
  p_plan_id uuid,
  p_duration_months integer default 12
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan public.subscription_plans%rowtype;
  v_subscription_id uuid;
  v_months integer := greatest(1, coalesce(p_duration_months, 12));
  v_value numeric(12,2);
begin
  if not public.is_platform_master() then
    raise exception 'Somente o MASTER Gerivo pode ativar assinaturas.';
  end if;
  select * into v_plan from public.subscription_plans where id = p_plan_id and active = true;
  if not found then raise exception 'Plano não encontrado.'; end if;
  if not exists(select 1 from public.companies where id = p_company_id) then raise exception 'Empresa não encontrada.'; end if;

  v_value := case when v_months = 12 and v_plan.annual_price > 0 then v_plan.annual_price else v_plan.monthly_price * v_months end;

  update public.company_subscriptions
  set status = 'EXPIRED', updated_at = now()
  where company_id = p_company_id and status in ('ACTIVE','GRACE','READ_ONLY');

  insert into public.company_subscriptions (
    company_id, plan_id, status, billing_cycle, contracted_months, contracted_value,
    user_limit, store_limit, company_limit, storage_gb, ai_queries_monthly, modules,
    activated_at, expires_at, grace_until, read_only_until, activated_by
  ) values (
    p_company_id, p_plan_id, 'ACTIVE', case when v_months = 12 then 'ANNUAL' else 'CUSTOM' end,
    v_months, v_value, v_plan.user_limit, v_plan.store_limit, v_plan.company_limit,
    v_plan.storage_gb, v_plan.ai_queries_monthly, v_plan.modules,
    now(), now() + (v_months || ' months')::interval,
    now() + (v_months || ' months')::interval + interval '7 days',
    now() + (v_months || ' months')::interval + interval '30 days',
    auth.uid()
  ) returning id into v_subscription_id;

  update public.companies set active = true, status = 'ACTIVE' where id = p_company_id;
  update public.stores set active = true where company_id = p_company_id;
  update public.store_settings set modules = v_plan.modules, updated_by = auth.uid() where company_id = p_company_id;

  insert into public.audit_logs(company_id, user_id, action, entity, entity_id, new_value)
  values (p_company_id, auth.uid(), 'SUBSCRIPTION_ACTIVATED', 'company_subscription', v_subscription_id::text,
    jsonb_build_object('plan', v_plan.code, 'months', v_months, 'expires_at', now() + (v_months || ' months')::interval));

  return v_subscription_id;
end;
$$;

grant execute on function public.master_activate_subscription(uuid, uuid, integer) to authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.stores enable row level security;
alter table public.company_members enable row level security;
alter table public.store_members enable row level security;
alter table public.store_settings enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.company_subscriptions enable row level security;
alter table public.suppliers enable row level security;
alter table public.catalog_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.appointments enable row level security;
alter table public.audit_logs enable row level security;

-- Remove também as políticas da prévia anterior da v1.7.
drop policy if exists "profiles_select_own_or_master" on public.profiles;
drop policy if exists "profiles_update_own_or_master" on public.profiles;
drop policy if exists "companies_select_members" on public.companies;
drop policy if exists "companies_update_admins" on public.companies;
drop policy if exists "companies_insert_master" on public.companies;
drop policy if exists "stores_select_company_members" on public.stores;
drop policy if exists "stores_insert_admins" on public.stores;
drop policy if exists "stores_update_admins" on public.stores;
drop policy if exists "company_members_select_authorized" on public.company_members;
drop policy if exists "company_members_insert_admins" on public.company_members;
drop policy if exists "company_members_update_admins" on public.company_members;
drop policy if exists "company_members_delete_admins" on public.company_members;
drop policy if exists "store_members_select_authorized" on public.store_members;
drop policy if exists "store_members_insert_admins" on public.store_members;
drop policy if exists "store_members_update_admins" on public.store_members;
drop policy if exists "store_members_delete_admins" on public.store_members;
drop policy if exists "store_settings_select_members" on public.store_settings;
drop policy if exists "store_settings_insert_admins" on public.store_settings;
drop policy if exists "store_settings_update_admins" on public.store_settings;

-- Remove políticas anteriores com os mesmos nomes.
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname='public' and policyname like 'gerivo_%' loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

create policy gerivo_profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_platform_master());
create policy gerivo_profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_platform_master())
  with check (id = auth.uid() or public.is_platform_master());

create policy gerivo_companies_select on public.companies for select to authenticated
  using (public.is_company_member(id));
create policy gerivo_companies_insert on public.companies for insert to authenticated
  with check (public.is_platform_master() and created_by = auth.uid());
create policy gerivo_companies_update on public.companies for update to authenticated
  using (public.is_company_admin(id)) with check (public.is_company_admin(id));

create policy gerivo_stores_select on public.stores for select to authenticated
  using (public.is_company_member(company_id));
create policy gerivo_stores_insert on public.stores for insert to authenticated
  with check (public.is_company_admin(company_id) and created_by = auth.uid());
create policy gerivo_stores_update on public.stores for update to authenticated
  using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy gerivo_company_members_select on public.company_members for select to authenticated
  using (user_id = auth.uid() or public.is_company_admin(company_id));
create policy gerivo_company_members_write on public.company_members for all to authenticated
  using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy gerivo_store_members_select on public.store_members for select to authenticated
  using (user_id = auth.uid() or public.is_company_admin(company_id));
create policy gerivo_store_members_write on public.store_members for all to authenticated
  using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy gerivo_store_settings_select on public.store_settings for select to authenticated
  using (public.is_store_member(store_id) or public.is_company_admin(company_id));
create policy gerivo_store_settings_write on public.store_settings for all to authenticated
  using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy gerivo_plans_select on public.subscription_plans for select to authenticated using (active = true or public.is_platform_master());
create policy gerivo_plans_master_write on public.subscription_plans for all to authenticated
  using (public.is_platform_master()) with check (public.is_platform_master());
create policy gerivo_subscriptions_master on public.company_subscriptions for all to authenticated
  using (public.is_platform_master()) with check (public.is_platform_master());

create policy gerivo_suppliers_select on public.suppliers for select to authenticated using (public.is_store_member(store_id));
create policy gerivo_suppliers_write on public.suppliers for all to authenticated
  using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id) and public.is_store_member(store_id));
create policy gerivo_catalog_select on public.catalog_items for select to authenticated using (public.is_store_member(store_id));
create policy gerivo_catalog_write on public.catalog_items for all to authenticated
  using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id) and public.is_store_member(store_id));
create policy gerivo_stock_select on public.stock_movements for select to authenticated using (public.is_store_member(store_id));
create policy gerivo_stock_write on public.stock_movements for insert to authenticated
  with check (public.is_company_admin(company_id) and public.is_store_member(store_id));
create policy gerivo_appointments_select on public.appointments for select to authenticated using (public.is_store_member(store_id));
create policy gerivo_appointments_write on public.appointments for all to authenticated
  using (public.is_store_member(store_id)) with check (public.is_store_member(store_id));
create policy gerivo_audit_select on public.audit_logs for select to authenticated
  using (public.is_platform_master() or (company_id is not null and public.is_company_admin(company_id)));

revoke all on public.profiles, public.companies, public.stores, public.company_members, public.store_members,
  public.store_settings, public.subscription_plans, public.company_subscriptions, public.suppliers,
  public.catalog_items, public.stock_movements, public.appointments, public.audit_logs from anon;

grant select, update on public.profiles to authenticated;
grant select, insert, update on public.companies to authenticated;
grant select, insert, update on public.stores to authenticated;
grant select, insert, update, delete on public.company_members to authenticated;
grant select, insert, update, delete on public.store_members to authenticated;
grant select, insert, update on public.store_settings to authenticated;
grant select, insert, update, delete on public.subscription_plans to authenticated;
grant select, insert, update, delete on public.company_subscriptions to authenticated;
grant select, insert, update, delete on public.suppliers to authenticated;
grant select, insert, update, delete on public.catalog_items to authenticated;
grant select, insert on public.stock_movements to authenticated;
grant select, insert, update, delete on public.appointments to authenticated;
grant select on public.audit_logs to authenticated;
