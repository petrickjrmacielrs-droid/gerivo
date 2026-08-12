-- Gerivo v1.7.11 — grupos, escopo multiempresa, função profissional e importador adicional.
-- Execute após a migration 009_v178_shared_operation_mobile_public_plans.sql.

-- Importador Mobato/NBS passa a ser módulo adicional, desligado por padrão.
update public.store_settings
set modules = coalesce(modules, '{}'::jsonb) || jsonb_build_object(
  'BUDGET_IMPORT', coalesce((modules ->> 'BUDGET_IMPORT')::boolean, false)
)
where not (coalesce(modules, '{}'::jsonb) ? 'BUDGET_IMPORT');

update public.subscription_plans
set modules = coalesce(modules, '{}'::jsonb) || jsonb_build_object(
  'BUDGET_IMPORT', coalesce((modules ->> 'BUDGET_IMPORT')::boolean, false)
)
where not (coalesce(modules, '{}'::jsonb) ? 'BUDGET_IMPORT');

update public.company_subscriptions
set modules = coalesce(modules, '{}'::jsonb) || jsonb_build_object(
      'BUDGET_IMPORT', coalesce((modules ->> 'BUDGET_IMPORT')::boolean, false)
    ),
    custom_modules = coalesce(custom_modules, '{}'::jsonb) || jsonb_build_object(
      'BUDGET_IMPORT', coalesce((custom_modules ->> 'BUDGET_IMPORT')::boolean, (modules ->> 'BUDGET_IMPORT')::boolean, false)
    )
where not (coalesce(modules, '{}'::jsonb) ? 'BUDGET_IMPORT')
   or not (coalesce(custom_modules, '{}'::jsonb) ? 'BUDGET_IMPORT');

-- Liberação inicial controlada: o recurso adicional entra ativo apenas para empresas IESA já cadastradas.
-- Novas liberações continuam sendo feitas individualmente pelo MASTER em Plano personalizado.
update public.store_settings ss
set modules = coalesce(ss.modules, '{}'::jsonb) || '{"BUDGET_IMPORT": true}'::jsonb,
    updated_at = now()
from public.companies c
where c.id = ss.company_id
  and c.name ilike '%IESA%';

update public.company_subscriptions cs
set modules = coalesce(cs.modules, '{}'::jsonb) || '{"BUDGET_IMPORT": true}'::jsonb,
    custom_modules = coalesce(cs.custom_modules, '{}'::jsonb) || '{"BUDGET_IMPORT": true}'::jsonb,
    updated_at = now()
from public.companies c
where c.id = cs.company_id
  and c.name ilike '%IESA%';

-- Função exercida por vínculo/unidade.
alter table public.store_members add column if not exists job_function text not null default 'OUTRO';
alter table public.store_members add column if not exists custom_job_function text;
alter table public.store_members add column if not exists available_as_consultant boolean not null default false;

create index if not exists store_members_consultant_idx
  on public.store_members(store_id, active, available_as_consultant)
  where active = true and available_as_consultant = true;

-- Normaliza usuários já existentes que tenham função de consultor cadastrada manualmente depois da atualização.
update public.store_members
set available_as_consultant = true
where upper(coalesce(job_function, '')) in ('CONSULTOR_SERVICOS','CONSULTOR DE SERVIÇOS','CONSULTOR DE SERVICOS');

notify pgrst, 'reload schema';
