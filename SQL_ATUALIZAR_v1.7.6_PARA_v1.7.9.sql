-- GERIVO v1.7.9 — ATUALIZAÇÃO CUMULATIVA DO BANCO
-- Este arquivo mantém as alterações estruturais das versões 1.7.7 e 1.7.8.
-- A v1.7.9 não adiciona novas tabelas: se o banco já está na v1.7.8, NÃO execute novamente.
-- Use somente ao atualizar diretamente de uma instalação v1.7.6.

-- Gerivo v1.7.8 — atualização cumulativa a partir da v1.7.6
-- Execute este arquivo inteiro UMA ÚNICA VEZ no SQL Editor do Supabase.
-- Ele aplica as mudanças das versões 1.7.7 e 1.7.8.

-- Gerivo v1.7.7 — contratos personalizados, edição de empresas e histórico comercial.
-- Execute depois de 007_v176_messages_ai.sql.

alter table public.company_subscriptions add column if not exists plan_mode text not null default 'STANDARD'
  check (plan_mode in ('STANDARD','CUSTOM'));
alter table public.company_subscriptions add column if not exists contract_start date;
alter table public.company_subscriptions add column if not exists contract_end date;
alter table public.company_subscriptions add column if not exists billing_due_day integer
  check (billing_due_day is null or billing_due_day between 1 and 31);
alter table public.company_subscriptions add column if not exists auto_renew boolean not null default false;
alter table public.company_subscriptions add column if not exists grace_period_days integer not null default 7
  check (grace_period_days between 0 and 365);
alter table public.company_subscriptions add column if not exists custom_plan_name text;
alter table public.company_subscriptions add column if not exists custom_limits jsonb not null default '{}'::jsonb;
alter table public.company_subscriptions add column if not exists custom_modules jsonb not null default '{}'::jsonb;
alter table public.company_subscriptions add column if not exists commercial_notes text;
alter table public.company_subscriptions add column if not exists scheduled_plan_id uuid references public.subscription_plans(id);
alter table public.company_subscriptions add column if not exists scheduled_change_date date;
alter table public.company_subscriptions add column if not exists updated_by uuid references auth.users(id);

update public.company_subscriptions
set contract_start = coalesce(contract_start, activated_at::date, created_at::date),
    contract_end = coalesce(contract_end, expires_at::date)
where contract_start is null or contract_end is null;

-- BI e Central de Mensagens passam a ser módulos comerciais independentes.
-- Para instalações anteriores, preserva-se o acesso que já era herdado do Assistente.
update public.subscription_plans
set modules = coalesce(modules, '{}'::jsonb) || jsonb_build_object(
      'BI', coalesce((modules ->> 'BI')::boolean, (modules ->> 'ASSISTANT')::boolean, false),
      'MESSAGES', coalesce((modules ->> 'MESSAGES')::boolean, (modules ->> 'ASSISTANT')::boolean, false)
    ),
    updated_at = now();

update public.company_subscriptions
set modules = coalesce(modules, '{}'::jsonb) || jsonb_build_object(
      'BI', coalesce((modules ->> 'BI')::boolean, (modules ->> 'ASSISTANT')::boolean, false),
      'MESSAGES', coalesce((modules ->> 'MESSAGES')::boolean, (modules ->> 'ASSISTANT')::boolean, false)
    ),
    custom_modules = coalesce(custom_modules, '{}'::jsonb) || jsonb_build_object(
      'BI', coalesce((custom_modules ->> 'BI')::boolean, (custom_modules ->> 'ASSISTANT')::boolean, (modules ->> 'BI')::boolean, (modules ->> 'ASSISTANT')::boolean, false),
      'MESSAGES', coalesce((custom_modules ->> 'MESSAGES')::boolean, (custom_modules ->> 'ASSISTANT')::boolean, (modules ->> 'MESSAGES')::boolean, (modules ->> 'ASSISTANT')::boolean, false)
    );

update public.store_settings
set modules = coalesce(modules, '{}'::jsonb) || jsonb_build_object(
      'BI', coalesce((modules ->> 'BI')::boolean, (modules ->> 'ASSISTANT')::boolean, false),
      'MESSAGES', coalesce((modules ->> 'MESSAGES')::boolean, (modules ->> 'ASSISTANT')::boolean, false)
    ),
    updated_at = now();

create table if not exists public.company_subscription_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  subscription_id uuid references public.company_subscriptions(id) on delete set null,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  justification text,
  changed_by uuid not null references auth.users(id),
  changed_at timestamptz not null default now()
);
create index if not exists company_subscription_history_company_idx
  on public.company_subscription_history(company_id, changed_at desc);
create index if not exists audit_logs_ai_usage_idx
  on public.audit_logs(company_id, action, created_at desc);

alter table public.company_subscription_history enable row level security;
drop policy if exists gerivo_subscription_history_select on public.company_subscription_history;
create policy gerivo_subscription_history_select on public.company_subscription_history for select to authenticated
using (public.is_platform_master());

drop policy if exists gerivo_subscription_history_master_write on public.company_subscription_history;
create policy gerivo_subscription_history_master_write on public.company_subscription_history for all to authenticated
using (public.is_platform_master()) with check (public.is_platform_master());

grant select, insert on public.company_subscription_history to authenticated;

-- Mantém datas contratuais sincronizadas nas ativações antigas.
create or replace function public.sync_subscription_contract_dates()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.contract_start := coalesce(new.contract_start, new.activated_at::date, current_date);
  new.contract_end := coalesce(new.contract_end, new.expires_at::date);
  new.updated_by := coalesce(new.updated_by, auth.uid());
  return new;
end;
$$;

drop trigger if exists sync_subscription_contract_dates on public.company_subscriptions;
create trigger sync_subscription_contract_dates
before insert or update on public.company_subscriptions
for each row execute procedure public.sync_subscription_contract_dates();

-- Contratação e permissões são controladas pelas rotas seguras do Gerivo.
-- ADMIN e MANAGER continuam podendo administrar usuários pela interface, mas não podem
-- alterar vínculos diretamente pelo cliente Supabase nem elevar o próprio perfil.
drop policy if exists gerivo_company_members_write on public.company_members;
create policy gerivo_company_members_write on public.company_members for all to authenticated
using (public.is_platform_master()) with check (public.is_platform_master());

drop policy if exists gerivo_store_members_write on public.store_members;
create policy gerivo_store_members_write on public.store_members for all to authenticated
using (public.is_platform_master()) with check (public.is_platform_master());

-- Módulos pertencem à assinatura da empresa. Um gestor pode personalizar identidade,
-- preços, mensagens e checklist, porém não pode ativar recursos não contratados.
-- Substitui o gatilho antigo por uma validação compatível com chamadas server-side.
drop trigger if exists protect_contracted_modules on public.store_settings;

create or replace function public.guard_store_contracted_modules()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_contract_modules jsonb;
begin
  if coalesce(auth.role(), '') = 'service_role' or public.is_platform_master() then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.modules is distinct from old.modules then
    raise exception 'Somente o MASTER Gerivo pode alterar os módulos contratados.';
  end if;

  if tg_op = 'INSERT' then
    select cs.modules
      into v_contract_modules
      from public.company_subscriptions cs
     where cs.company_id = new.company_id
     order by cs.created_at desc
     limit 1;
    new.modules := coalesce(
      v_contract_modules,
      '{"APPOINTMENTS":false,"CATALOG":false,"INVENTORY":false,"CHECKLIST":false,"ORDERS":false,"QUOTES":false,"ASSISTANT":false,"BI":false,"MESSAGES":false}'::jsonb
    );
  end if;

  return new;
end;
$$;

drop trigger if exists guard_store_contracted_modules on public.store_settings;
create trigger guard_store_contracted_modules
before insert or update of modules on public.store_settings
for each row execute procedure public.guard_store_contracted_modules();

grant execute on function public.guard_store_contracted_modules() to authenticated;

notify pgrst, 'reload schema';

-- ================================================================
-- Continuação: Gerivo v1.7.8
-- ================================================================
-- Gerivo v1.7.8 — operação compartilhada, planos públicos dinâmicos e continuidade de sessão.
-- Execute somente depois da migration 008_v177_company_contracts_ai_bi.sql.

-- Snapshot operacional compartilhado por unidade.
-- Mantém clientes, veículos, agenda, checklist, O.S., orçamentos, catálogo,
-- estoque e conhecimento visíveis para todos os usuários autorizados da mesma loja.
create table if not exists public.store_data_snapshots (
  store_id uuid primary key references public.stores(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  revision bigint not null default 1,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_data_snapshots_company_idx
  on public.store_data_snapshots(company_id, updated_at desc);

create or replace function public.touch_store_data_snapshot()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  new.revision := case when tg_op = 'INSERT' then coalesce(new.revision, 1) else old.revision + 1 end;
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

drop trigger if exists touch_store_data_snapshot on public.store_data_snapshots;
create trigger touch_store_data_snapshot
before insert or update on public.store_data_snapshots
for each row execute procedure public.touch_store_data_snapshot();

alter table public.store_data_snapshots enable row level security;

drop policy if exists gerivo_store_snapshot_select on public.store_data_snapshots;
create policy gerivo_store_snapshot_select
on public.store_data_snapshots for select to authenticated
using (public.is_store_member(store_id));

drop policy if exists gerivo_store_snapshot_insert on public.store_data_snapshots;
create policy gerivo_store_snapshot_insert
on public.store_data_snapshots for insert to authenticated
with check (
  public.is_store_member(store_id)
  and exists (
    select 1 from public.stores s
    where s.id = store_data_snapshots.store_id and s.company_id = store_data_snapshots.company_id
  )
);

drop policy if exists gerivo_store_snapshot_update on public.store_data_snapshots;
create policy gerivo_store_snapshot_update
on public.store_data_snapshots for update to authenticated
using (public.is_store_member(store_id))
with check (
  public.is_store_member(store_id)
  and exists (
    select 1 from public.stores s
    where s.id = store_data_snapshots.store_id and s.company_id = store_data_snapshots.company_id
  )
);

drop policy if exists gerivo_store_snapshot_delete on public.store_data_snapshots;
create policy gerivo_store_snapshot_delete
on public.store_data_snapshots for delete to authenticated
using (public.is_company_admin(company_id));

grant select, insert, update, delete on public.store_data_snapshots to authenticated;

-- Publicação em tempo real para refletir alterações feitas por outros usuários.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'store_data_snapshots'
     ) then
    alter publication supabase_realtime add table public.store_data_snapshots;
  end if;
exception when others then
  raise notice 'Não foi possível adicionar store_data_snapshots ao Realtime automaticamente: %', sqlerrm;
end $$;

-- Conteúdo comercial editável dos planos.
alter table public.subscription_plans add column if not exists public_visible boolean not null default true;
alter table public.subscription_plans add column if not exists recommended boolean not null default false;
alter table public.subscription_plans add column if not exists public_description text;
alter table public.subscription_plans add column if not exists public_features jsonb not null default '[]'::jsonb;
alter table public.subscription_plans add column if not exists public_cta_label text not null default 'Tenho interesse';
alter table public.subscription_plans add column if not exists public_sort_order integer;

update public.subscription_plans
set public_sort_order = coalesce(public_sort_order, sort_order),
    public_description = coalesce(
      nullif(public_description, ''),
      case upper(code)
        when 'ESSENCIAL' then '1 empresa · 1 unidade · 3 usuários'
        when 'GESTAO' then '1 empresa · até 2 unidades · 8 usuários'
        when 'PROFISSIONAL' then 'Até 2 empresas · 5 unidades · 20 usuários'
        when 'ENTERPRISE' then 'Estrutura e limites personalizados'
        else concat(company_limit, ' empresa(s) · ', store_limit, ' unidade(s) · ', user_limit, ' usuário(s)')
      end
    ),
    public_features = case
      when jsonb_array_length(coalesce(public_features, '[]'::jsonb)) > 0 then public_features
      when upper(code) = 'ESSENCIAL' then '["Painel e clientes","Catálogo e orçamentos","Agenda básica"]'::jsonb
      when upper(code) = 'GESTAO' then '["Tudo do Essencial","O.S., estoque e compras","Indicadores e satisfação"]'::jsonb
      when upper(code) = 'PROFISSIONAL' then '["Indicadores gerenciais","Automações e auditoria","Assistente Gerivo"]'::jsonb
      when upper(code) = 'ENTERPRISE' then '["Múltiplas empresas","Implantação acompanhada","Integrações e suporte prioritário"]'::jsonb
      else coalesce(features, '[]'::jsonb)
    end,
    recommended = case when upper(code) = 'GESTAO' then true else recommended end,
    public_cta_label = case when upper(code) = 'ENTERPRISE' then 'Solicitar proposta' else coalesce(nullif(public_cta_label, ''), 'Tenho interesse') end,
    updated_at = now();

-- Consulta pública segura usada pelo site de vendas. Expõe somente conteúdo comercial.
create or replace function public.get_public_subscription_plans()
returns table (
  id uuid,
  code text,
  name text,
  monthly_price numeric,
  annual_price numeric,
  company_limit integer,
  store_limit integer,
  user_limit integer,
  public_description text,
  public_features jsonb,
  public_cta_label text,
  recommended boolean,
  public_sort_order integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p.id,
    p.code,
    p.name,
    p.monthly_price,
    p.annual_price,
    p.company_limit,
    p.store_limit,
    p.user_limit,
    p.public_description,
    p.public_features,
    p.public_cta_label,
    p.recommended,
    coalesce(p.public_sort_order, p.sort_order)
  from public.subscription_plans p
  where p.active = true and p.public_visible = true
  order by coalesce(p.public_sort_order, p.sort_order), p.name;
$$;

grant execute on function public.get_public_subscription_plans() to anon, authenticated;

notify pgrst, 'reload schema';
