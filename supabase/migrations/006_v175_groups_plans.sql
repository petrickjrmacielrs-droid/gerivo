-- Gerivo v1.7.5 — grupos empresariais, limites comerciais e ativação por grupo.
-- Execute depois de 005_v173_selection_color.sql.

create table if not exists public.business_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'AWAITING_ACTIVATION'
    check (status in ('DRAFT','AWAITING_ACTIVATION','ACTIVE','GRACE','READ_ONLY','SUSPENDED','CANCELED','EXPIRED','DEMO')),
  active boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies add column if not exists group_id uuid references public.business_groups(id) on delete restrict;
alter table public.companies add column if not exists document text;

do $$
declare
  company_row record;
  new_group_id uuid;
  base_slug text;
begin
  for company_row in
    select id, name, slug, status, active, created_by
    from public.companies
    where group_id is null
  loop
    base_slug := coalesce(nullif(company_row.slug, ''), public.slugify(company_row.name));
    insert into public.business_groups (name, slug, status, active, created_by)
    values (
      company_row.name,
      base_slug || '-grupo-' || substr(replace(company_row.id::text, '-', ''), 1, 8),
      company_row.status,
      company_row.active,
      company_row.created_by
    ) returning id into new_group_id;

    update public.companies set group_id = new_group_id where id = company_row.id;
  end loop;
end
$$;

alter table public.companies alter column group_id set not null;
create index if not exists companies_group_idx on public.companies(group_id);
create unique index if not exists companies_document_unique
  on public.companies(document)
  where document is not null and document <> '';

update public.subscription_plans
set monthly_price = 119, annual_price = 1188, company_limit = 1, store_limit = 1, user_limit = 3, updated_at = now()
where code = 'ESSENCIAL';

update public.subscription_plans
set monthly_price = 219, annual_price = 2148, company_limit = 1, store_limit = 2, user_limit = 8, updated_at = now()
where code = 'GESTAO';

update public.subscription_plans
set monthly_price = 349, annual_price = 3588, company_limit = 2, store_limit = 5, user_limit = 20, updated_at = now()
where code = 'PROFISSIONAL';

update public.subscription_plans
set monthly_price = 599, annual_price = 0, company_limit = 999, store_limit = 999, user_limit = 999, updated_at = now()
where code = 'ENTERPRISE';

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
  v_group_id uuid;
  v_company_count integer;
  v_store_count integer;
  v_user_count integer;
begin
  if not public.is_platform_master() then
    raise exception 'Somente o MASTER Gerivo pode ativar assinaturas.';
  end if;

  select * into v_plan from public.subscription_plans where id = p_plan_id and active = true;
  if not found then raise exception 'Plano não encontrado.'; end if;

  select group_id into v_group_id from public.companies where id = p_company_id;
  if v_group_id is null then raise exception 'Empresa ou grupo não encontrado.'; end if;

  select count(*) into v_company_count from public.companies where group_id = v_group_id;
  select count(*) into v_store_count from public.stores s join public.companies c on c.id = s.company_id where c.group_id = v_group_id;
  select count(distinct cm.user_id) into v_user_count
  from public.company_members cm join public.companies c on c.id = cm.company_id
  where c.group_id = v_group_id and cm.active = true;

  if v_plan.code <> 'ENTERPRISE' then
    if v_company_count > v_plan.company_limit then raise exception 'O grupo possui % CNPJs e o plano permite %.', v_company_count, v_plan.company_limit; end if;
    if v_store_count > v_plan.store_limit then raise exception 'O grupo possui % unidades e o plano permite %.', v_store_count, v_plan.store_limit; end if;
    if v_user_count > v_plan.user_limit then raise exception 'O grupo possui % usuários ativos e o plano permite %.', v_user_count, v_plan.user_limit; end if;
  end if;

  v_value := case when v_months = 12 and v_plan.annual_price > 0 then v_plan.annual_price else v_plan.monthly_price * v_months end;

  update public.company_subscriptions cs
  set status = 'EXPIRED', updated_at = now()
  where cs.company_id in (select id from public.companies where group_id = v_group_id)
    and cs.status in ('ACTIVE','GRACE','READ_ONLY');

  insert into public.company_subscriptions (
    company_id, plan_id, status, billing_cycle, contracted_months, contracted_value,
    user_limit, store_limit, company_limit, storage_gb, ai_queries_monthly, modules,
    activated_at, expires_at, grace_until, read_only_until, activated_by, notes
  ) values (
    p_company_id, p_plan_id, 'ACTIVE', case when v_months = 12 then 'ANNUAL' else 'CUSTOM' end,
    v_months, v_value, v_plan.user_limit, v_plan.store_limit, v_plan.company_limit,
    v_plan.storage_gb, v_plan.ai_queries_monthly, v_plan.modules,
    now(), now() + (v_months || ' months')::interval,
    now() + (v_months || ' months')::interval + interval '7 days',
    now() + (v_months || ' months')::interval + interval '30 days',
    auth.uid(), 'Assinatura aplicada ao grupo empresarial.'
  ) returning id into v_subscription_id;

  update public.business_groups set active = true, status = 'ACTIVE', updated_at = now() where id = v_group_id;
  update public.companies set active = true, status = 'ACTIVE', updated_at = now() where group_id = v_group_id;
  update public.stores s set active = true, updated_at = now() from public.companies c where c.id = s.company_id and c.group_id = v_group_id;
  update public.store_settings ss set modules = v_plan.modules, updated_by = auth.uid(), updated_at = now()
  from public.companies c where c.id = ss.company_id and c.group_id = v_group_id;

  insert into public.audit_logs(company_id, user_id, action, entity, entity_id, new_value)
  values (p_company_id, auth.uid(), 'GROUP_SUBSCRIPTION_ACTIVATED', 'business_group', v_group_id::text,
    jsonb_build_object('plan', v_plan.code, 'months', v_months, 'companies', v_company_count, 'stores', v_store_count, 'users', v_user_count, 'expires_at', now() + (v_months || ' months')::interval));

  return v_subscription_id;
end;
$$;

grant execute on function public.master_activate_subscription(uuid, uuid, integer) to authenticated;

alter table public.business_groups enable row level security;
drop policy if exists gerivo_business_groups_select on public.business_groups;
create policy gerivo_business_groups_select on public.business_groups for select to authenticated
using (
  public.is_platform_master()
  or exists (
    select 1 from public.companies c
    join public.company_members cm on cm.company_id = c.id
    where c.group_id = business_groups.id and cm.user_id = auth.uid() and cm.active = true
  )
);

drop policy if exists gerivo_business_groups_master_write on public.business_groups;
create policy gerivo_business_groups_master_write on public.business_groups for all to authenticated
using (public.is_platform_master()) with check (public.is_platform_master());

grant select, insert, update, delete on public.business_groups to authenticated;
notify pgrst, 'reload schema';
