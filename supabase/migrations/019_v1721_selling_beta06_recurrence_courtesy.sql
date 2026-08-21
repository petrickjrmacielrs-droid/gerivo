-- Gerivo v1.7.21 — Selling Beta 06
-- Execute APÓS a migration 018_v1720_selling_beta05_consolidada.sql.
-- Ajusta recomendações recorrentes e permite vincular um kit que entra automaticamente
-- como primeiro benefício dos três pacotes.

begin;

alter table public.selling_recommendations
  add column if not exists interval_km integer not null default 0 check (interval_km >= 0),
  add column if not exists interval_months integer not null default 0 check (interval_months >= 0),
  add column if not exists catalog_kit_id uuid references public.selling_catalog_kits(id) on delete set null,
  add column if not exists include_in_packages boolean not null default true,
  add column if not exists show_price boolean not null default false;

-- Migra as recomendações já cadastradas. O antigo "km de referência" passa a ser
-- interpretado como intervalo recorrente (ex.: 20.000 => 20/40/60/80 mil km).
update public.selling_recommendations
set interval_km = case when interval_km = 0 then min_km else interval_km end,
    interval_months = case when interval_months = 0 then min_months else interval_months end
where (interval_km = 0 and min_km > 0)
   or (interval_months = 0 and min_months > 0);

create index if not exists selling_recommendations_interval_idx
  on public.selling_recommendations (fuel_type, model_key, interval_km)
  where active = true;

create index if not exists selling_recommendations_kit_idx
  on public.selling_recommendations (catalog_kit_id)
  where catalog_kit_id is not null;

notify pgrst, 'reload schema';
commit;

select 'SELLING_BETA_06_READY' as status,
       count(*) as recomendacoes,
       count(*) filter (where catalog_kit_id is not null) as recomendacoes_com_kit,
       count(*) filter (where include_in_packages) as recomendacoes_automaticas
from public.selling_recommendations;
