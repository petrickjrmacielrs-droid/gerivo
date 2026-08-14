-- Gerivo v1.7.15 — contratação por grupo/empresa, status de cobrança e herança de módulos.
-- Execute depois de 013_v17141_parts_orders_workflow.sql.

-- 1) Escopo comercial do grupo.
alter table public.business_groups add column if not exists plan_scope text;
update public.business_groups g
set plan_scope = case
  when (select count(*) from public.companies c where c.group_id = g.id) > 1 then 'GROUP'
  else coalesce(nullif(g.plan_scope, ''), 'COMPANY')
end
where plan_scope is null or plan_scope not in ('GROUP','COMPANY');
alter table public.business_groups alter column plan_scope set default 'GROUP';
alter table public.business_groups alter column plan_scope set not null;
alter table public.business_groups drop constraint if exists business_groups_plan_scope_check;
alter table public.business_groups add constraint business_groups_plan_scope_check check (plan_scope in ('GROUP','COMPANY'));

-- 2) A assinatura continua na tabela histórica existente, mas agora declara explicitamente
-- se é a contratação canônica do grupo ou uma contratação exclusiva de uma empresa.
alter table public.company_subscriptions add column if not exists contract_scope text;
alter table public.company_subscriptions add column if not exists group_id uuid references public.business_groups(id) on delete cascade;

update public.company_subscriptions cs
set group_id = c.group_id
from public.companies c
where c.id = cs.company_id and cs.group_id is null;

update public.company_subscriptions
set contract_scope = 'COMPANY'
where contract_scope is null or contract_scope not in ('GROUP','COMPANY');

alter table public.company_subscriptions alter column contract_scope set default 'COMPANY';
alter table public.company_subscriptions alter column contract_scope set not null;
alter table public.company_subscriptions drop constraint if exists company_subscriptions_contract_scope_check;
alter table public.company_subscriptions add constraint company_subscriptions_contract_scope_check check (contract_scope in ('GROUP','COMPANY'));

create index if not exists company_subscriptions_group_scope_idx
  on public.company_subscriptions(group_id, contract_scope, created_at desc);
create index if not exists company_subscriptions_company_scope_idx
  on public.company_subscriptions(company_id, contract_scope, created_at desc);

-- 3) Status explícito para cobrança pendente.
alter table public.companies drop constraint if exists companies_status_check;
alter table public.companies add constraint companies_status_check
  check (status in ('DRAFT','AWAITING_ACTIVATION','PENDING_PAYMENT','ACTIVE','GRACE','READ_ONLY','SUSPENDED','CANCELED','EXPIRED','DEMO'));

alter table public.company_subscriptions drop constraint if exists company_subscriptions_status_check;
alter table public.company_subscriptions add constraint company_subscriptions_status_check
  check (status in ('DRAFT','AWAITING_ACTIVATION','PENDING_PAYMENT','ACTIVE','GRACE','READ_ONLY','SUSPENDED','CANCELED','EXPIRED','DEMO'));

alter table public.business_groups drop constraint if exists business_groups_status_check;
alter table public.business_groups add constraint business_groups_status_check
  check (status in ('DRAFT','AWAITING_ACTIVATION','PENDING_PAYMENT','ACTIVE','GRACE','READ_ONLY','SUSPENDED','CANCELED','EXPIRED','DEMO'));

-- 4) Histórico comercial passa a indicar grupo e escopo, sem apagar o histórico antigo.
alter table public.company_subscription_history add column if not exists group_id uuid references public.business_groups(id) on delete set null;
alter table public.company_subscription_history add column if not exists contract_scope text;
update public.company_subscription_history h
set group_id = c.group_id
from public.companies c
where c.id = h.company_id and h.group_id is null;
update public.company_subscription_history
set contract_scope = coalesce(contract_scope, 'COMPANY')
where contract_scope is null;

-- 5) Para grupos que já possuem mais de uma empresa, cria uma contratação canônica de grupo
-- a partir da contratação mais recente já existente. Nada é apagado; as assinaturas anteriores
-- permanecem como histórico/fallback e a aplicação passa a priorizar a linha GROUP.
with multi_groups as (
  select g.id
  from public.business_groups g
  where g.plan_scope = 'GROUP'
    and (select count(*) from public.companies c where c.group_id = g.id) > 1
), latest as (
  select distinct on (c.group_id)
    c.group_id as target_group_id,
    cs.id as source_subscription_id
  from multi_groups mg
  join public.companies c on c.group_id = mg.id
  join public.company_subscriptions cs on cs.company_id = c.id
  where not exists (
    select 1 from public.company_subscriptions existing
    where existing.group_id = c.group_id and existing.contract_scope = 'GROUP'
  )
  order by c.group_id,
    case when cs.status in ('ACTIVE','GRACE','READ_ONLY','DEMO','PENDING_PAYMENT','AWAITING_ACTIVATION') then 0 else 1 end,
    cs.created_at desc
)
insert into public.company_subscriptions (
  company_id, group_id, contract_scope, plan_id, status, billing_cycle, contracted_months,
  contracted_value, discount_value, user_limit, store_limit, company_limit, storage_gb,
  ai_queries_monthly, modules, activated_at, expires_at, grace_until, read_only_until,
  activated_by, notes, plan_mode, contract_start, contract_end, billing_due_day, auto_renew,
  grace_period_days, custom_plan_name, custom_limits, custom_modules, commercial_notes,
  scheduled_plan_id, scheduled_change_date, updated_by, created_at, updated_at
)
select
  cs.company_id, latest.target_group_id, 'GROUP', cs.plan_id, cs.status, cs.billing_cycle, cs.contracted_months,
  cs.contracted_value, cs.discount_value, cs.user_limit, cs.store_limit, cs.company_limit, cs.storage_gb,
  cs.ai_queries_monthly, cs.modules, cs.activated_at, cs.expires_at, cs.grace_until, cs.read_only_until,
  cs.activated_by, coalesce(cs.notes, 'Contratação consolidada automaticamente no escopo do grupo.'),
  cs.plan_mode, cs.contract_start, cs.contract_end, cs.billing_due_day, cs.auto_renew,
  cs.grace_period_days, cs.custom_plan_name, cs.custom_limits, cs.custom_modules, cs.commercial_notes,
  cs.scheduled_plan_id, cs.scheduled_change_date, cs.updated_by, now(), now()
from latest
join public.company_subscriptions cs on cs.id = latest.source_subscription_id;

-- 6) Reaplica estado e módulos do contrato de grupo às empresas já existentes.
with group_contract as (
  select distinct on (cs.group_id)
    cs.group_id, cs.status, cs.modules
  from public.company_subscriptions cs
  join public.business_groups g on g.id = cs.group_id and g.plan_scope = 'GROUP'
  where cs.contract_scope = 'GROUP'
  order by cs.group_id, cs.created_at desc
)
update public.companies c
set status = gc.status,
    active = gc.status in ('ACTIVE','GRACE','READ_ONLY','DEMO'),
    updated_at = now()
from group_contract gc
where c.group_id = gc.group_id;

with group_contract as (
  select distinct on (cs.group_id)
    cs.group_id, cs.status, cs.modules
  from public.company_subscriptions cs
  join public.business_groups g on g.id = cs.group_id and g.plan_scope = 'GROUP'
  where cs.contract_scope = 'GROUP'
  order by cs.group_id, cs.created_at desc
)
update public.stores s
set active = gc.status in ('ACTIVE','GRACE','READ_ONLY','DEMO'),
    updated_at = now()
from public.companies c, group_contract gc
where c.id = s.company_id and c.group_id = gc.group_id;

with group_contract as (
  select distinct on (cs.group_id)
    cs.group_id, cs.modules
  from public.company_subscriptions cs
  join public.business_groups g on g.id = cs.group_id and g.plan_scope = 'GROUP'
  where cs.contract_scope = 'GROUP'
  order by cs.group_id, cs.created_at desc
)
update public.store_settings ss
set modules = coalesce(gc.modules, '{}'::jsonb),
    updated_at = now()
from public.companies c, group_contract gc
where c.id = ss.company_id and c.group_id = gc.group_id;

-- 7) O gatilho que protege módulos passa a resolver a contratação efetiva do grupo/empresa.
create or replace function public.guard_store_contracted_modules()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_contract_modules jsonb;
  v_group_id uuid;
  v_plan_scope text;
begin
  if coalesce(auth.role(), '') = 'service_role' or public.is_platform_master() then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.modules is distinct from old.modules then
    raise exception 'Somente o MASTER Gerivo pode alterar os módulos contratados.';
  end if;

  if tg_op = 'INSERT' then
    select c.group_id, coalesce(g.plan_scope, 'COMPANY')
      into v_group_id, v_plan_scope
      from public.companies c
      left join public.business_groups g on g.id = c.group_id
     where c.id = new.company_id;

    if v_plan_scope = 'GROUP' and v_group_id is not null then
      select cs.modules
        into v_contract_modules
        from public.company_subscriptions cs
       where cs.group_id = v_group_id
         and cs.contract_scope = 'GROUP'
       order by cs.created_at desc
       limit 1;
    end if;

    if v_contract_modules is null then
      select cs.modules
        into v_contract_modules
        from public.company_subscriptions cs
       where cs.company_id = new.company_id
         and cs.contract_scope = 'COMPANY'
       order by cs.created_at desc
       limit 1;
    end if;

    new.modules := coalesce(
      v_contract_modules,
      '{"APPOINTMENTS":false,"CATALOG":false,"INVENTORY":false,"CHECKLIST":false,"ORDERS":false,"QUOTES":false,"PARTS_ORDERS":false,"ASSISTANT":false,"BI":false,"MESSAGES":false,"BUDGET_IMPORT":false}'::jsonb
    );
  end if;

  return new;
end;
$$;

grant execute on function public.guard_store_contracted_modules() to authenticated;
notify pgrst, 'reload schema';
