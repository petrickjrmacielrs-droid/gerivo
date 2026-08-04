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
