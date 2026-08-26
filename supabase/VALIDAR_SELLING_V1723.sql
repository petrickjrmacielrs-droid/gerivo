-- Gerivo v1.7.23 — validação rápida após migration 020
select
  case
    when exists (select 1 from information_schema.columns where table_schema='public' and table_name='selling_packages' and column_name='import_code')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='selling_package_items' and column_name='is_tire')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='selling_package_items' and column_name='max_installments')
    then 'SELLING_V1723_READY'
    else 'SELLING_V1723_PENDENTE'
  end as status,
  (select count(*) from public.selling_revision_templates where active) as revisoes_ativas,
  (select count(*) from public.selling_packages where active) as pacotes_ativos,
  (select count(*) from public.selling_packages where import_code is not null) as pacotes_importados_padrao;
