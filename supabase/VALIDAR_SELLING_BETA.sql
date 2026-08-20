-- Gerivo v1.7.16 — validação somente leitura do Selling BETA
-- Pode executar inteiro no SQL Editor após a migration 015 e após importar a planilha.

-- 1) Estrutura e volume importado por família.
select
  fuel_type,
  count(distinct model_key) as modelos,
  count(*) as revisoes,
  min(revision_km) as menor_revisao_km,
  max(revision_km) as maior_revisao_km
from public.selling_revision_templates
where active
 group by fuel_type
 order by fuel_type;

-- 2) Modelos/aplicações encontrados e revisões disponíveis.
select
  model_name,
  fuel_type,
  string_agg(distinct revision_km::text, ', ' order by revision_km::text) as revisoes_km
from public.selling_revision_templates
where active
 group by model_name, fuel_type
 order by fuel_type, model_name;

-- 3) Pacotes agregados e sua publicação.
select
  p.name,
  p.tier,
  p.fuel_type,
  p.price_mode,
  p.fixed_addon_price,
  p.installments,
  p.active,
  p.published,
  case
    when p.target_company_id is not null then 'COMPANY'
    when p.target_group_id is not null then 'GROUP'
    else 'GLOBAL'
  end as escopo,
  count(distinct pm.model_key) as modelos_vinculados,
  count(distinct pr.revision_km) as revisoes_vinculadas,
  count(distinct pi.id) as opcionais
from public.selling_packages p
left join public.selling_package_models pm on pm.package_id = p.id
left join public.selling_package_revisions pr on pr.package_id = p.id
left join public.selling_package_items pi on pi.package_id = p.id
 group by p.id
 order by p.fuel_type, p.display_order, p.name;

-- 4) Trava FLEX/DIESEL: idealmente retorna ZERO linhas.
select
  p.name as pacote,
  p.fuel_type as familia_pacote,
  r.model_name,
  r.fuel_type as familia_modelo
from public.selling_packages p
join public.selling_package_models pm on pm.package_id = p.id
join public.selling_revision_templates r on r.model_key = pm.model_key and r.active
where p.fuel_type <> r.fuel_type
  and r.fuel_type in ('FLEX','DIESEL')
 group by p.name, p.fuel_type, r.model_name, r.fuel_type
 order by p.name, r.model_name;

-- 5) Status do módulo SELLING nos planos.
select
  name as plano,
  coalesce((modules ->> 'SELLING')::boolean, false) as selling_ativo
from public.subscription_plans
where active
order by sort_order nulls last, name;

-- 6) Contratações que já receberam SELLING.
select
  cs.id,
  cs.contract_scope,
  cs.status,
  cs.group_id,
  cs.company_id,
  coalesce((cs.modules ->> 'SELLING')::boolean, false) as selling_ativo
from public.company_subscriptions cs
where cs.status in ('ACTIVE','GRACE','READ_ONLY','DEMO','AWAITING_ACTIVATION')
order by cs.updated_at desc nulls last;

-- 7) Unidades com o módulo liberado.
select
  c.name as empresa,
  s.name as unidade,
  coalesce((ss.modules ->> 'SELLING')::boolean, false) as selling_ativo
from public.store_settings ss
join public.stores s on s.id = ss.store_id
join public.companies c on c.id = ss.company_id
order by c.name, s.name;
