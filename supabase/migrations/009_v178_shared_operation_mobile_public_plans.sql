-- Gerivo v1.7.8 — operação compartilhada, planos públicos dinâmicos e continuidade de sessão.
-- Execute somente depois da migration 008_v177_company_contracts_ai_bi.sql.

-- Snapshot operacional compartilhado por unidade.
-- Mantém clientes, veículos, agenda, checklist, O.S., orçamentos, catálogo,
-- estoque e conhecimento visíveis para todos os usuários autorizados da mesma loja.
create table if not exists public.store_data_snapshots (
  store_id uuid primary key references public.stores(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  revision bigint not null default 1,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_data_snapshots_company_idx
  on public.store_data_snapshots(company_id, updated_at desc);

create or replace function public.touch_store_data_snapshot()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  new.revision := case when tg_op = 'INSERT' then coalesce(new.revision, 1) else old.revision + 1 end;
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

drop trigger if exists touch_store_data_snapshot on public.store_data_snapshots;
create trigger touch_store_data_snapshot
before insert or update on public.store_data_snapshots
for each row execute procedure public.touch_store_data_snapshot();

alter table public.store_data_snapshots enable row level security;

drop policy if exists gerivo_store_snapshot_select on public.store_data_snapshots;
create policy gerivo_store_snapshot_select
on public.store_data_snapshots for select to authenticated
using (public.is_store_member(store_id));

drop policy if exists gerivo_store_snapshot_insert on public.store_data_snapshots;
create policy gerivo_store_snapshot_insert
on public.store_data_snapshots for insert to authenticated
with check (
  public.is_store_member(store_id)
  and exists (
    select 1 from public.stores s
    where s.id = store_data_snapshots.store_id and s.company_id = store_data_snapshots.company_id
  )
);

drop policy if exists gerivo_store_snapshot_update on public.store_data_snapshots;
create policy gerivo_store_snapshot_update
on public.store_data_snapshots for update to authenticated
using (public.is_store_member(store_id))
with check (
  public.is_store_member(store_id)
  and exists (
    select 1 from public.stores s
    where s.id = store_data_snapshots.store_id and s.company_id = store_data_snapshots.company_id
  )
);

drop policy if exists gerivo_store_snapshot_delete on public.store_data_snapshots;
create policy gerivo_store_snapshot_delete
on public.store_data_snapshots for delete to authenticated
using (public.is_company_admin(company_id));

grant select, insert, update, delete on public.store_data_snapshots to authenticated;

-- Publicação em tempo real para refletir alterações feitas por outros usuários.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'store_data_snapshots'
     ) then
    alter publication supabase_realtime add table public.store_data_snapshots;
  end if;
exception when others then
  raise notice 'Não foi possível adicionar store_data_snapshots ao Realtime automaticamente: %', sqlerrm;
end $$;

-- Conteúdo comercial editável dos planos.
alter table public.subscription_plans add column if not exists public_visible boolean not null default true;
alter table public.subscription_plans add column if not exists recommended boolean not null default false;
alter table public.subscription_plans add column if not exists public_description text;
alter table public.subscription_plans add column if not exists public_features jsonb not null default '[]'::jsonb;
alter table public.subscription_plans add column if not exists public_cta_label text not null default 'Tenho interesse';
alter table public.subscription_plans add column if not exists public_sort_order integer;

update public.subscription_plans
set public_sort_order = coalesce(public_sort_order, sort_order),
    public_description = coalesce(
      nullif(public_description, ''),
      case upper(code)
        when 'ESSENCIAL' then '1 empresa · 1 unidade · 3 usuários'
        when 'GESTAO' then '1 empresa · até 2 unidades · 8 usuários'
        when 'PROFISSIONAL' then 'Até 2 empresas · 5 unidades · 20 usuários'
        when 'ENTERPRISE' then 'Estrutura e limites personalizados'
        else concat(company_limit, ' empresa(s) · ', store_limit, ' unidade(s) · ', user_limit, ' usuário(s)')
      end
    ),
    public_features = case
      when jsonb_array_length(coalesce(public_features, '[]'::jsonb)) > 0 then public_features
      when upper(code) = 'ESSENCIAL' then '["Painel e clientes","Catálogo e orçamentos","Agenda básica"]'::jsonb
      when upper(code) = 'GESTAO' then '["Tudo do Essencial","O.S., estoque e compras","Indicadores e satisfação"]'::jsonb
      when upper(code) = 'PROFISSIONAL' then '["Indicadores gerenciais","Automações e auditoria","Assistente Gerivo"]'::jsonb
      when upper(code) = 'ENTERPRISE' then '["Múltiplas empresas","Implantação acompanhada","Integrações e suporte prioritário"]'::jsonb
      else coalesce(features, '[]'::jsonb)
    end,
    recommended = case when upper(code) = 'GESTAO' then true else recommended end,
    public_cta_label = case when upper(code) = 'ENTERPRISE' then 'Solicitar proposta' else coalesce(nullif(public_cta_label, ''), 'Tenho interesse') end,
    updated_at = now();

-- Consulta pública segura usada pelo site de vendas. Expõe somente conteúdo comercial.
create or replace function public.get_public_subscription_plans()
returns table (
  id uuid,
  code text,
  name text,
  monthly_price numeric,
  annual_price numeric,
  company_limit integer,
  store_limit integer,
  user_limit integer,
  public_description text,
  public_features jsonb,
  public_cta_label text,
  recommended boolean,
  public_sort_order integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p.id,
    p.code,
    p.name,
    p.monthly_price,
    p.annual_price,
    p.company_limit,
    p.store_limit,
    p.user_limit,
    p.public_description,
    p.public_features,
    p.public_cta_label,
    p.recommended,
    coalesce(p.public_sort_order, p.sort_order)
  from public.subscription_plans p
  where p.active = true and p.public_visible = true
  order by coalesce(p.public_sort_order, p.sort_order), p.name;
$$;

grant execute on function public.get_public_subscription_plans() to anon, authenticated;

notify pgrst, 'reload schema';
