-- Gerivo v1.7.20 — Selling Beta 05 (consolidada)
-- Execute APÓS a Beta 03 / migration 017.
-- Substitui a migration 018 da v1.7.19 para quem AINDA NÃO instalou aquela versão.
-- Inclui: informações visuais, recomendações, cortesia/valor de referência,
-- vínculo peça + M.O., catálogo de kits avulsos e pacotes de troca de óleo.

begin;

alter table public.selling_package_items
  add column if not exists info_title text,
  add column if not exists info_text text,
  add column if not exists info_image_url text,
  add column if not exists is_courtesy boolean not null default false,
  add column if not exists courtesy_label text not null default 'Cortesia',
  add column if not exists courtesy_note text,
  add column if not exists item_class text,
  add column if not exists bundle_key text,
  add column if not exists bundle_name text;

alter table public.selling_packages
  add column if not exists offer_type text not null default 'REVISION';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.selling_packages'::regclass
      and conname='selling_packages_offer_type_check'
  ) then
    alter table public.selling_packages
      add constraint selling_packages_offer_type_check
      check (offer_type in ('REVISION','OIL_CHANGE'));
  end if;
end $$;

create index if not exists selling_packages_offer_idx
  on public.selling_packages (offer_type, published, active, fuel_type, display_order);

create table if not exists public.selling_recommendations (
  id uuid primary key default gen_random_uuid(),
  model_key text,
  fuel_type text not null default 'FLEX' check (fuel_type in ('FLEX','DIESEL','ELECTRIC','OTHER')),
  title text not null,
  description text not null default '',
  min_km integer not null default 0 check (min_km >= 0),
  min_months integer not null default 0 check (min_months >= 0),
  priority text not null default 'IMPORTANT' check (priority in ('INFO','IMPORTANT','SAFETY')),
  active boolean not null default true,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists selling_recommendations_model_idx
  on public.selling_recommendations (fuel_type, model_key, min_km)
  where active = true;

create table if not exists public.selling_catalog_kits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  visual_name text,
  description text,
  fuel_type text not null default 'FLEX' check (fuel_type in ('FLEX','DIESEL')),
  is_tire boolean not null default false,
  max_installments integer not null default 4 check (max_installments between 1 and 24),
  target_group_id uuid references public.business_groups(id) on delete cascade,
  target_company_id uuid references public.companies(id) on delete cascade,
  active boolean not null default true,
  display_order integer not null default 0,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint selling_catalog_kit_single_scope check (not (target_group_id is not null and target_company_id is not null))
);

create table if not exists public.selling_catalog_kit_items (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references public.selling_catalog_kits(id) on delete cascade,
  item_type text not null check (item_type in ('PART','SERVICE','LABOR')),
  item_class text,
  code text,
  description text not null,
  quantity numeric(12,3) not null default 1,
  unit_price numeric(12,2) not null default 0,
  line_total numeric(12,2),
  labor_hours numeric(10,2) not null default 0,
  display_order integer not null default 0,
  source text,
  source_file text,
  category_key text,
  category_name text,
  visual_name text,
  show_individual boolean not null default false,
  show_price boolean not null default true,
  info_title text,
  info_text text,
  info_image_url text,
  is_courtesy boolean not null default false,
  courtesy_label text not null default 'Cortesia',
  courtesy_note text,
  bundle_key text,
  bundle_name text,
  created_at timestamptz not null default now()
);

create index if not exists selling_catalog_kits_scope_idx on public.selling_catalog_kits(active, fuel_type, display_order);
create index if not exists selling_catalog_kit_items_kit_idx on public.selling_catalog_kit_items(kit_id, display_order);

alter table public.selling_recommendations enable row level security;
alter table public.selling_catalog_kits enable row level security;
alter table public.selling_catalog_kit_items enable row level security;

do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname
    from pg_policies
    where schemaname='public' and tablename in ('selling_recommendations','selling_catalog_kits','selling_catalog_kit_items')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

create policy gerivo_selling_recommendations_read on public.selling_recommendations
for select to authenticated using (true);
create policy gerivo_selling_recommendations_master on public.selling_recommendations
for all to authenticated using (public.is_platform_master()) with check (public.is_platform_master());

create policy gerivo_selling_catalog_kits_master on public.selling_catalog_kits
for all to authenticated using (public.is_platform_master()) with check (public.is_platform_master());
create policy gerivo_selling_catalog_kit_items_master on public.selling_catalog_kit_items
for all to authenticated using (public.is_platform_master()) with check (public.is_platform_master());

revoke all on public.selling_recommendations, public.selling_catalog_kits, public.selling_catalog_kit_items from anon;
grant select, insert, update, delete on public.selling_recommendations, public.selling_catalog_kits, public.selling_catalog_kit_items to authenticated;

drop trigger if exists selling_recommendations_updated_at on public.selling_recommendations;
create trigger selling_recommendations_updated_at before update on public.selling_recommendations for each row execute procedure public.set_updated_at();
drop trigger if exists selling_catalog_kits_updated_at on public.selling_catalog_kits;
create trigger selling_catalog_kits_updated_at before update on public.selling_catalog_kits for each row execute procedure public.set_updated_at();

notify pgrst, 'reload schema';
commit;

select 'SELLING_BETA_05_READY' as status,
       (select count(*) from public.selling_packages where fuel_type='FLEX') as pacotes_flex,
       (select count(*) from public.selling_packages where offer_type='OIL_CHANGE') as pacotes_troca_oleo,
       (select count(*) from public.selling_package_items where is_courtesy) as itens_cortesia,
       (select count(*) from public.selling_catalog_kits) as kits_catalogo,
       (select count(*) from public.selling_recommendations) as recomendacoes;
