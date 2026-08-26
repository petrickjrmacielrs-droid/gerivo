-- Gerivo v1.7.23 — importação padrão de revisões + pacotes
-- Execute APÓS 019_v1721_selling_beta06_recurrence_courtesy.sql.

begin;

alter table public.selling_packages
  add column if not exists import_code text;

create unique index if not exists selling_packages_import_code_unique
  on public.selling_packages (import_code)
  where import_code is not null;

alter table public.selling_package_items
  add column if not exists is_tire boolean not null default false,
  add column if not exists max_installments integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.selling_package_items'::regclass
      and conname='selling_package_items_max_installments_check'
  ) then
    alter table public.selling_package_items
      add constraint selling_package_items_max_installments_check
      check (max_installments is null or max_installments between 1 and 24);
  end if;
end $$;

create index if not exists selling_package_items_tire_idx
  on public.selling_package_items (package_id)
  where is_tire = true;

notify pgrst, 'reload schema';
commit;

select 'SELLING_V1723_TEMPLATE_IMPORT_READY' as status,
       count(*) filter (where import_code is not null) as pacotes_com_codigo_importacao
from public.selling_packages;
