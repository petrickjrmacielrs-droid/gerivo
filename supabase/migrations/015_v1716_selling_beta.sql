-- Gerivo v1.7.16 BETA — Selling
-- Revisão obrigatória importada + pacotes agregados FLEX/DIESEL.
-- Idempotente para homologação.

begin;

create table if not exists public.selling_import_batches (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  status text not null default 'PROCESSING' check (status in ('PROCESSING','COMPLETED','FAILED')),
  revisions_count integer not null default 0,
  items_count integer not null default 0,
  notes text,
  imported_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.selling_revision_templates (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  model_key text not null,
  model_name text not null,
  fuel_type text not null default 'FLEX' check (fuel_type in ('FLEX','DIESEL','ELECTRIC','OTHER')),
  year_label text,
  revision_km integer not null check (revision_km > 0),
  base_price numeric(12,2) not null default 0,
  labor_hours numeric(10,2) not null default 0,
  labor_value numeric(12,2) not null default 0,
  source_sheet text,
  source_file text,
  import_batch_id uuid references public.selling_import_batches(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists selling_revision_model_idx on public.selling_revision_templates(model_key, fuel_type, revision_km) where active;

create table if not exists public.selling_revision_items (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.selling_revision_templates(id) on delete cascade,
  item_type text not null check (item_type in ('PART','LABOR')),
  code text,
  description text not null,
  quantity numeric(12,3) not null default 1,
  unit_price numeric(12,2) not null default 0,
  total_price numeric(12,2) not null default 0,
  labor_hours numeric(10,2) not null default 0,
  display_order integer not null default 0,
  source_sheet text,
  created_at timestamptz not null default now()
);
create index if not exists selling_revision_items_revision_idx on public.selling_revision_items(revision_id, display_order);

create table if not exists public.selling_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tier text not null default 'ESSENCIAL' check (tier in ('ESSENCIAL','INTERMEDIARIO','PREMIUM')),
  fuel_type text not null check (fuel_type in ('FLEX','DIESEL')),
  color text not null default '#11c7a7',
  description text,
  price_mode text not null default 'ITEM_SUM' check (price_mode in ('ITEM_SUM','FIXED')),
  fixed_addon_price numeric(12,2) not null default 0,
  installments integer not null default 1 check (installments between 1 and 24),
  target_group_id uuid references public.business_groups(id) on delete cascade,
  target_company_id uuid references public.companies(id) on delete cascade,
  display_order integer not null default 0,
  active boolean not null default true,
  published boolean not null default false,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint selling_package_single_scope check (not (target_group_id is not null and target_company_id is not null))
);
create index if not exists selling_packages_publish_idx on public.selling_packages(published, active, fuel_type, display_order);

create table if not exists public.selling_package_items (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.selling_packages(id) on delete cascade,
  item_type text not null check (item_type in ('PART','SERVICE','LABOR')),
  code text,
  description text not null,
  quantity numeric(12,3) not null default 1,
  unit_price numeric(12,2) not null default 0,
  labor_hours numeric(10,2) not null default 0,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists selling_package_items_package_idx on public.selling_package_items(package_id, display_order);

create table if not exists public.selling_package_models (
  package_id uuid not null references public.selling_packages(id) on delete cascade,
  model_key text not null,
  created_at timestamptz not null default now(),
  primary key(package_id, model_key)
);

create table if not exists public.selling_package_revisions (
  package_id uuid not null references public.selling_packages(id) on delete cascade,
  revision_km integer not null check (revision_km > 0),
  created_at timestamptz not null default now(),
  primary key(package_id, revision_km)
);

-- Módulo comercial controlado pelo MASTER como os demais módulos.
update public.subscription_plans
set modules = coalesce(modules, '{}'::jsonb) || '{"SELLING":false}'::jsonb,
    updated_at = now()
where not coalesce(modules, '{}'::jsonb) ? 'SELLING';

update public.company_subscriptions
set modules = coalesce(modules, '{}'::jsonb) || '{"SELLING":false}'::jsonb,
    updated_at = now()
where not coalesce(modules, '{}'::jsonb) ? 'SELLING';

-- O SQL Editor não carrega a sessão JWT do MASTER Gerivo.
-- Desabilitamos SOMENTE o trigger de proteção durante a atualização estrutural
-- e o restauramos imediatamente em seguida.
do $$
begin
  if exists (
    select 1
      from pg_trigger
     where tgrelid = 'public.store_settings'::regclass
       and tgname = 'guard_store_contracted_modules'
       and not tgisinternal
  ) then
    execute 'alter table public.store_settings disable trigger guard_store_contracted_modules';
  end if;
end
$$;

update public.store_settings
set modules = coalesce(modules, '{}'::jsonb) || '{"SELLING":false}'::jsonb,
    updated_at = now()
where not coalesce(modules, '{}'::jsonb) ? 'SELLING';

do $$
begin
  if exists (
    select 1
      from pg_trigger
     where tgrelid = 'public.store_settings'::regclass
       and tgname = 'guard_store_contracted_modules'
       and not tgisinternal
  ) then
    execute 'alter table public.store_settings enable trigger guard_store_contracted_modules';
  end if;
end
$$;

-- Timestamps.
do $$
declare t text;
begin
  foreach t in array array['selling_revision_templates','selling_packages'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute procedure public.set_updated_at()', t || '_updated_at', t);
  end loop;
end $$;

-- Acesso direto às tabelas fica restrito ao MASTER. A operação usa API server-side
-- que valida vínculo do usuário à empresa/unidade antes de devolver conteúdo publicado.
alter table public.selling_import_batches enable row level security;
alter table public.selling_revision_templates enable row level security;
alter table public.selling_revision_items enable row level security;
alter table public.selling_packages enable row level security;
alter table public.selling_package_items enable row level security;
alter table public.selling_package_models enable row level security;
alter table public.selling_package_revisions enable row level security;

do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies
    where schemaname='public' and tablename in (
      'selling_import_batches','selling_revision_templates','selling_revision_items',
      'selling_packages','selling_package_items','selling_package_models','selling_package_revisions'
    ) loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

create policy gerivo_selling_import_master on public.selling_import_batches for all to authenticated
  using (public.is_platform_master()) with check (public.is_platform_master());
create policy gerivo_selling_revisions_master on public.selling_revision_templates for all to authenticated
  using (public.is_platform_master()) with check (public.is_platform_master());
create policy gerivo_selling_revision_items_master on public.selling_revision_items for all to authenticated
  using (public.is_platform_master()) with check (public.is_platform_master());
create policy gerivo_selling_packages_master on public.selling_packages for all to authenticated
  using (public.is_platform_master()) with check (public.is_platform_master());
create policy gerivo_selling_package_items_master on public.selling_package_items for all to authenticated
  using (public.is_platform_master()) with check (public.is_platform_master());
create policy gerivo_selling_package_models_master on public.selling_package_models for all to authenticated
  using (public.is_platform_master()) with check (public.is_platform_master());
create policy gerivo_selling_package_revisions_master on public.selling_package_revisions for all to authenticated
  using (public.is_platform_master()) with check (public.is_platform_master());

revoke all on public.selling_import_batches, public.selling_revision_templates, public.selling_revision_items,
  public.selling_packages, public.selling_package_items, public.selling_package_models, public.selling_package_revisions from anon;

grant select, insert, update, delete on public.selling_import_batches, public.selling_revision_templates, public.selling_revision_items,
  public.selling_packages, public.selling_package_items, public.selling_package_models, public.selling_package_revisions to authenticated;

notify pgrst, 'reload schema';
commit;

-- Conferência rápida.
select 'SELLING_READY' as status,
       (select count(*) from public.selling_revision_templates) as revisoes,
       (select count(*) from public.selling_packages) as pacotes;
