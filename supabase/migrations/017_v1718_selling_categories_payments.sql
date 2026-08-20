-- Gerivo v1.7.18 BETA 03 — Selling Categories + Payment Rules
-- Execute após 015 e 016.

begin;

alter table public.selling_package_items
  add column if not exists category_key text,
  add column if not exists category_name text,
  add column if not exists visual_name text,
  add column if not exists show_individual boolean not null default false,
  add column if not exists show_price boolean not null default true;

create table if not exists public.selling_payment_settings (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null unique references public.business_groups(id) on delete cascade,
  allow_pix boolean not null default true,
  allow_debit boolean not null default true,
  allow_credit boolean not null default true,
  installment_rules jsonb not null default '[
    {"min":0,"max":250,"max_installments":1},
    {"min":250.01,"max":500,"max_installments":2},
    {"min":500.01,"max":1000,"max_installments":3},
    {"min":1000.01,"max":null,"max_installments":4}
  ]'::jsonb,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.selling_payment_settings enable row level security;

do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname
    from pg_policies
    where schemaname='public' and tablename='selling_payment_settings'
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

create policy gerivo_selling_payment_master on public.selling_payment_settings
for all to authenticated
using (public.is_platform_master())
with check (public.is_platform_master());

revoke all on public.selling_payment_settings from anon;
grant select, insert, update, delete on public.selling_payment_settings to authenticated;

drop trigger if exists selling_payment_settings_updated_at on public.selling_payment_settings;
create trigger selling_payment_settings_updated_at
before update on public.selling_payment_settings
for each row execute procedure public.set_updated_at();

notify pgrst, 'reload schema';
commit;

select 'SELLING_BETA_03_READY' as status,
       (select count(*) from public.selling_packages where fuel_type='FLEX') as pacotes_flex,
       (select count(*) from public.selling_payment_settings) as regras_pagamento;
