select id, name, tier, fuel_type, offer_type, active, published
from public.selling_packages
order by offer_type, display_order, name;

select p.name as pacote,
       count(i.id) as linhas,
       count(i.id) filter (where i.is_courtesy) as cortesias,
       count(distinct nullif(i.bundle_key,'')) as vinculos_kits,
       coalesce(sum(case when i.is_courtesy then 0 else coalesce(i.line_total, i.quantity*i.unit_price) end),0) as total_cobrado,
       coalesce(sum(coalesce(i.line_total, i.quantity*i.unit_price)),0) as valor_referencia
from public.selling_packages p
left join public.selling_package_items i on i.package_id=p.id
group by p.id,p.name
order by p.display_order,p.name;

select k.name, k.visual_name, k.is_tire, k.max_installments, count(i.id) as componentes
from public.selling_catalog_kits k
left join public.selling_catalog_kit_items i on i.kit_id=k.id
group by k.id,k.name,k.visual_name,k.is_tire,k.max_installments
order by k.display_order,k.name;
