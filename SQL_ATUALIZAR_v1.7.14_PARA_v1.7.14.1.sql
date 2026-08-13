-- Gerivo v1.7.14.1
-- Configuração de campos do módulo Pedidos de peças por unidade.

begin;

alter table public.store_settings
  add column if not exists parts_order_settings jsonb not null
  default '{"fields":{"contact":{"enabled":true,"required":false},"plate":{"enabled":false,"required":false},"quoteNumber":{"enabled":true,"required":false},"productive":{"enabled":true,"required":false}}}'::jsonb;

update public.store_settings
set parts_order_settings = '{"fields":{"contact":{"enabled":true,"required":false},"plate":{"enabled":false,"required":false},"quoteNumber":{"enabled":true,"required":false},"productive":{"enabled":true,"required":false}}}'::jsonb
where parts_order_settings is null or parts_order_settings = '{}'::jsonb;

commit;

select store_id, display_name, parts_order_settings
from public.store_settings
order by display_name;
