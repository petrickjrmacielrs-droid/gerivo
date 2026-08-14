-- GERIVO v1.7.15 — SOMENTE LEITURA
-- Rode antes da migration para enxergar como os grupos atuais serão classificados.

select
  g.id as group_id,
  g.name as grupo,
  g.status as status_grupo,
  count(c.id) as cnpjs,
  case when count(c.id) > 1 then 'GROUP' else 'COMPANY' end as escopo_sugerido
from public.business_groups g
left join public.companies c on c.group_id = g.id
group by g.id, g.name, g.status
order by g.name;

-- Contratações existentes, da mais recente para a mais antiga.
select
  g.name as grupo,
  c.name as empresa,
  sp.name as plano,
  cs.plan_mode,
  cs.status,
  cs.company_limit,
  cs.store_limit,
  cs.user_limit,
  cs.contract_start,
  cs.contract_end,
  cs.created_at
from public.company_subscriptions cs
join public.companies c on c.id = cs.company_id
left join public.business_groups g on g.id = c.group_id
left join public.subscription_plans sp on sp.id = cs.plan_id
order by g.name, c.name, cs.created_at desc;

-- Atenção: grupos multiempresa cujo contrato mais recente pode ter limite de CNPJ menor que o grupo.
with group_counts as (
  select g.id, g.name, count(c.id)::int as company_count
  from public.business_groups g
  join public.companies c on c.group_id = g.id
  group by g.id, g.name
), latest as (
  select distinct on (c.group_id)
    c.group_id,
    cs.id as subscription_id,
    cs.status,
    cs.company_limit,
    sp.name as plan_name,
    cs.created_at
  from public.companies c
  join public.company_subscriptions cs on cs.company_id = c.id
  left join public.subscription_plans sp on sp.id = cs.plan_id
  order by c.group_id,
    case when cs.status in ('ACTIVE','GRACE','READ_ONLY','DEMO','AWAITING_ACTIVATION') then 0 else 1 end,
    cs.created_at desc
)
select
  gc.name as grupo,
  gc.company_count as cnpjs,
  latest.plan_name as plano_candidato,
  latest.status,
  latest.company_limit,
  case
    when latest.subscription_id is null then 'SEM CONTRATACAO'
    when coalesce(latest.company_limit, 1) < gc.company_count then 'REVISAR LIMITE DO PLANO'
    else 'OK'
  end as diagnostico
from group_counts gc
left join latest on latest.group_id = gc.id
where gc.company_count > 1
order by gc.name;
