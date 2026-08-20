-- Gerivo Selling BETA 02 - validação sem alteração de dados
select
  p.name,
  p.tier,
  p.fuel_type,
  p.presentation_mode,
  p.display_order,
  p.published,
  count(i.id) as itens,
  coalesce(sum(coalesce(i.line_total, i.quantity * i.unit_price)),0) as valor_adicionais
from public.selling_packages p
left join public.selling_package_items i on i.package_id = p.id
where p.fuel_type = 'FLEX'
group by p.id
order by p.display_order, p.name;

select
  count(*) filter (where item_type in ('LABOR','SERVICE')) as mao_de_obra_servicos,
  count(*) filter (where item_type = 'PART') as pecas,
  count(*) filter (where source = 'MOBATO_RECOMENDADOS') as importados_mobato
from public.selling_package_items;

select count(*) as apresentacoes_registradas from public.selling_presentations;
