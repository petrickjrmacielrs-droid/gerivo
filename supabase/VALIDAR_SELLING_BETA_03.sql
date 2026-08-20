-- GERIVO v1.7.18 — validação Selling Beta 03

select
  column_name,
  data_type,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'selling_package_items'
  and column_name in ('category_key','category_name','visual_name','show_individual','show_price')
order by column_name;

select
  g.name as grupo,
  s.allow_pix,
  s.allow_debit,
  s.allow_credit,
  s.installment_rules
from public.selling_payment_settings s
join public.business_groups g on g.id = s.group_id
order by g.name;

select
  p.name as pacote,
  count(i.id) as linhas,
  count(*) filter (where coalesce(i.category_key,'') <> '') as linhas_categorizadas,
  count(*) filter (where i.show_price = false) as valores_ocultos
from public.selling_packages p
left join public.selling_package_items i on i.package_id = p.id
where p.fuel_type = 'FLEX'
group by p.id, p.name
order by p.display_order, p.name;
