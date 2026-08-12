-- Gerivo v1.7.12 — HOTFIX da migration do módulo opcional Pedidos de peças.
-- Corrige o bloqueio causado pelo trigger guard_store_contracted_modules
-- quando a migration é executada pelo Supabase SQL Editor.
-- Script idempotente: pode ser executado novamente com segurança.

begin;

-- O SQL Editor não carrega a sessão JWT do MASTER Gerivo.
-- Desabilitamos somente o trigger de proteção durante a atualização estrutural.
do $$
begin
  if exists (
    select 1
      from pg_trigger
     where tgrelid = 'public.store_settings'::regclass
       and tgname = 'guard_store_contracted_modules'
       and not tgisinternal
  ) then
    execute 'alter table public.store_settings disable trigger guard_store_contracted_modules';
  end if;
end
$$;

-- O módulo nasce bloqueado para todas as unidades.
update public.store_settings
set modules = coalesce(modules, '{}'::jsonb) || jsonb_build_object(
  'PARTS_ORDERS', coalesce((modules ->> 'PARTS_ORDERS')::boolean, false)
)
where not (coalesce(modules, '{}'::jsonb) ? 'PARTS_ORDERS');

-- Também nasce bloqueado nos planos comerciais.
update public.subscription_plans
set modules = coalesce(modules, '{}'::jsonb) || jsonb_build_object(
  'PARTS_ORDERS', coalesce((modules ->> 'PARTS_ORDERS')::boolean, false)
)
where not (coalesce(modules, '{}'::jsonb) ? 'PARTS_ORDERS');

-- E bloqueado nas assinaturas já existentes, até liberação manual pelo MASTER.
update public.company_subscriptions
set modules = coalesce(modules, '{}'::jsonb) || jsonb_build_object(
      'PARTS_ORDERS', coalesce((modules ->> 'PARTS_ORDERS')::boolean, false)
    ),
    custom_modules = coalesce(custom_modules, '{}'::jsonb) || jsonb_build_object(
      'PARTS_ORDERS', coalesce(
        (custom_modules ->> 'PARTS_ORDERS')::boolean,
        (modules ->> 'PARTS_ORDERS')::boolean,
        false
      )
    )
where not (coalesce(modules, '{}'::jsonb) ? 'PARTS_ORDERS')
   or not (coalesce(custom_modules, '{}'::jsonb) ? 'PARTS_ORDERS');

-- Restaura imediatamente a proteção dos módulos contratados.
do $$
begin
  if exists (
    select 1
      from pg_trigger
     where tgrelid = 'public.store_settings'::regclass
       and tgname = 'guard_store_contracted_modules'
       and not tgisinternal
  ) then
    execute 'alter table public.store_settings enable trigger guard_store_contracted_modules';
  end if;
end
$$;

notify pgrst, 'reload schema';

commit;

-- Conferência: deve retornar false para as bases ainda não liberadas pelo MASTER.
select
  'store_settings' as origem,
  count(*) as registros,
  count(*) filter (where modules ? 'PARTS_ORDERS') as com_chave_parts_orders
from public.store_settings
union all
select
  'subscription_plans' as origem,
  count(*) as registros,
  count(*) filter (where modules ? 'PARTS_ORDERS') as com_chave_parts_orders
from public.subscription_plans
union all
select
  'company_subscriptions' as origem,
  count(*) as registros,
  count(*) filter (
    where modules ? 'PARTS_ORDERS'
      and custom_modules ? 'PARTS_ORDERS'
  ) as com_chave_parts_orders
from public.company_subscriptions;
