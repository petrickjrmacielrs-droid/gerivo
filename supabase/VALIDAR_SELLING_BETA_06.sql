select
  title,
  model_key,
  interval_km,
  interval_months,
  catalog_kit_id,
  include_in_packages,
  show_price,
  active
from public.selling_recommendations
order by title;

select
  p.name as pacote,
  p.tier,
  count(i.id) as itens,
  count(i.id) filter (where i.is_courtesy) as itens_com_botao_cortesia
from public.selling_packages p
left join public.selling_package_items i on i.package_id = p.id
where p.fuel_type = 'FLEX'
group by p.id, p.name, p.tier
order by p.display_order;
