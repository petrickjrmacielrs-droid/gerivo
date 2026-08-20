-- Gerivo v1.7.17 BETA 02 — Selling Presentation
-- Importação de RECOMENDADOS Mobato, ordenação de adicionais, apresentação/checkout e histórico.
-- Execute após 015_v1716_selling_beta.sql.

begin;

alter table public.selling_package_items
  add column if not exists line_total numeric(12,2),
  add column if not exists source text,
  add column if not exists source_file text;

alter table public.selling_packages
  add column if not exists presentation_mode text not null default 'GROUPED';

alter table public.selling_packages
  drop constraint if exists selling_packages_presentation_mode_check;
alter table public.selling_packages
  add constraint selling_packages_presentation_mode_check
  check (presentation_mode in ('GROUPED','DETAILED'));

-- A Beta 02 entra inicialmente apenas em FLEX. Pacotes Diesel existentes ficam preservados,
-- porém despublicados para não aparecerem na operação até a próxima fase.
update public.selling_packages
set published = false,
    updated_at = now()
where fuel_type <> 'FLEX' and published = true;

create table if not exists public.selling_presentations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  revision_id uuid references public.selling_revision_templates(id) on delete set null,
  package_id uuid references public.selling_packages(id) on delete set null,
  customer_ref text,
  vehicle_ref text,
  customer_name text not null,
  customer_phone text,
  plate text not null,
  vehicle_description text,
  consultant_name text,
  consultant_phone text,
  promised_time text,
  total numeric(12,2) not null default 0,
  snapshot jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists selling_presentations_store_created_idx
  on public.selling_presentations(store_id, created_at desc);

alter table public.selling_presentations enable row level security;

do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname
    from pg_policies
    where schemaname='public' and tablename='selling_presentations'
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Consulta direta reservada ao MASTER. A operação grava e lê via API server-side.
create policy gerivo_selling_presentations_master on public.selling_presentations
for all to authenticated
using (public.is_platform_master())
with check (public.is_platform_master());

revoke all on public.selling_presentations from anon;
grant select, insert, update, delete on public.selling_presentations to authenticated;

notify pgrst, 'reload schema';
commit;

select 'SELLING_BETA_02_READY' as status,
       (select count(*) from public.selling_packages where fuel_type='FLEX') as pacotes_flex,
       (select count(*) from public.selling_presentations) as apresentacoes;
