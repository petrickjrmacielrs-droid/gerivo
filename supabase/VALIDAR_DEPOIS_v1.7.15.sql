-- GERIVO v1.7.15 — SOMENTE LEITURA
-- Rode depois da migration 014.

select
  g.id as group_id,
  g.name as grupo,
  g.plan_scope,
  g.status,
  g.active,
  count(c.id) as cnpjs
from public.business_groups g
left join public.companies c on c.group_id = g.id
group by g.id, g.name, g.plan_scope, g.status, g.active
order by g.name;

-- Contratos canônicos de grupo.
select
  g.name as grupo,
  cs.id as subscription_id,
  c.name as empresa_ancora,
  sp.name as plano,
  cs.plan_mode,
  cs.contract_scope,
  cs.status,
  cs.company_limit,
  cs.store_limit,
  cs.user_limit,
  cs.contract_start,
  cs.contract_end,
  cs.created_at
from public.company_subscriptions cs
join public.business_groups g on g.id = cs.group_id
left join public.companies c on c.id = cs.company_id
left join public.subscription_plans sp on sp.id = cs.plan_id
where cs.contract_scope = 'GROUP'
order by g.name, cs.created_at desc;

-- Plano/situação efetivos por empresa, seguindo a regra GROUP -> COMPANY.
select
  g.name as grupo,
  c.name as empresa,
  g.plan_scope,
  coalesce(gs.contract_scope, cs.contract_scope, 'SEM CONTRATO') as origem_contrato,
  coalesce(gsp.name, csp.name, 'Sem plano') as plano_efetivo,
  coalesce(gs.status, cs.status, c.status) as status_efetivo,
  coalesce(gs.company_limit, cs.company_limit) as company_limit,
  coalesce(gs.store_limit, cs.store_limit) as store_limit,
  coalesce(gs.user_limit, cs.user_limit) as user_limit
from public.companies c
join public.business_groups g on g.id = c.group_id
left join lateral (
  select x.*
  from public.company_subscriptions x
  where x.group_id = g.id and x.contract_scope = 'GROUP'
  order by x.created_at desc
  limit 1
) gs on g.plan_scope = 'GROUP'
left join public.subscription_plans gsp on gsp.id = gs.plan_id
left join lateral (
  select x.*
  from public.company_subscriptions x
  where x.company_id = c.id and x.contract_scope = 'COMPANY'
  order by x.created_at desc
  limit 1
) cs on g.plan_scope = 'COMPANY' or gs.id is null
left join public.subscription_plans csp on csp.id = cs.plan_id
order by g.name, c.name;

-- Nenhuma empresa deve ter módulos diferentes do contrato de grupo quando o escopo é GROUP.
select
  g.name as grupo,
  c.name as empresa,
  s.name as unidade,
  ss.modules as modulos_unidade,
  gs.modules as modulos_grupo
from public.business_groups g
join public.companies c on c.group_id = g.id
join public.stores s on s.company_id = c.id
join public.store_settings ss on ss.store_id = s.id
join lateral (
  select x.modules
  from public.company_subscriptions x
  where x.group_id = g.id and x.contract_scope = 'GROUP'
  order by x.created_at desc
  limit 1
) gs on true
where g.plan_scope = 'GROUP'
  and coalesce(ss.modules, '{}'::jsonb) is distinct from coalesce(gs.modules, '{}'::jsonb)
order by g.name, c.name, s.name;
