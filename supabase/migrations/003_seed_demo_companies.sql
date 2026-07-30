-- Gerivo v1.7 — Seis empresas de demonstração
-- Execute somente depois do 001 e 002.
-- O MASTER padrão deve existir com o e-mail gerivo.sistemas@gmail.com.

do $$
declare
  v_master uuid;
  v_plan uuid;
  v_company uuid;
  v_store uuid;
  r record;
  v_modules jsonb;
begin
  select id into v_master from public.profiles
  where lower(email) = lower('gerivo.sistemas@gmail.com') and platform_role = 'MASTER' and active = true
  limit 1;
  if v_master is null then raise exception 'MASTER Gerivo não encontrado.'; end if;

  select id into v_plan from public.subscription_plans where code = 'PROFISSIONAL';

  for r in
    select * from (values
      ('Moda Viva Demonstração','demo-moda-viva','DEMO_ROUPAS','Loja de roupas'),
      ('Oficina Completa Demonstração','demo-oficina-completa','OFICINA_COMPLETA','Oficina completa'),
      ('Doce Encanto Demonstração','demo-doce-encanto','DEMO_CONFEITARIA','Confeitaria'),
      ('Studio Bella Demonstração','demo-studio-bella','DEMO_SALAO','Salão de beleza'),
      ('Detail Prime Demonstração','demo-detail-prime','DEMO_ESTETICA','Lavagem e estética'),
      ('Sabor Express Demonstração','demo-sabor-express','DEMO_DELIVERY','Delivery de comida')
    ) as d(company_name, company_slug, segment, store_name)
  loop
    select id into v_company from public.companies where slug = r.company_slug;
    if v_company is null then
      insert into public.companies(name, slug, segment, status, active, created_by)
      values(r.company_name, r.company_slug, r.segment, 'DEMO', true, v_master)
      returning id into v_company;
    else
      update public.companies set segment = r.segment, status = 'DEMO', active = true where id = v_company;
    end if;

    select id into v_store from public.stores where company_id = v_company order by created_at limit 1;
    if v_store is null then
      insert into public.stores(company_id, name, slug, active, created_by)
      values(v_company, r.store_name, public.slugify(r.store_name), true, v_master)
      returning id into v_store;
    else
      update public.stores set active = true where id = v_store;
    end if;

    insert into public.company_members(company_id, user_id, role, active)
    values(v_company, v_master, 'MASTER', true)
    on conflict(company_id, user_id) do update set role='MASTER', active=true;
    insert into public.store_members(store_id, company_id, user_id, role, active)
    values(v_store, v_company, v_master, 'MASTER', true)
    on conflict(store_id, user_id) do update set role='MASTER', active=true;

    v_modules := case
      when r.segment = 'DEMO_ROUPAS' then '{"APPOINTMENTS":false,"CATALOG":true,"INVENTORY":true,"CHECKLIST":false,"ORDERS":false,"QUOTES":true,"ASSISTANT":true}'::jsonb
      when r.segment = 'OFICINA_COMPLETA' then '{"APPOINTMENTS":true,"CATALOG":true,"INVENTORY":true,"CHECKLIST":true,"ORDERS":true,"QUOTES":true,"ASSISTANT":true}'::jsonb
      when r.segment = 'DEMO_CONFEITARIA' then '{"APPOINTMENTS":true,"CATALOG":true,"INVENTORY":true,"CHECKLIST":false,"ORDERS":false,"QUOTES":true,"ASSISTANT":true}'::jsonb
      when r.segment = 'DEMO_SALAO' then '{"APPOINTMENTS":true,"CATALOG":true,"INVENTORY":true,"CHECKLIST":false,"ORDERS":false,"QUOTES":true,"ASSISTANT":true}'::jsonb
      when r.segment = 'DEMO_ESTETICA' then '{"APPOINTMENTS":true,"CATALOG":true,"INVENTORY":true,"CHECKLIST":true,"ORDERS":true,"QUOTES":true,"ASSISTANT":true}'::jsonb
      else '{"APPOINTMENTS":true,"CATALOG":true,"INVENTORY":true,"CHECKLIST":false,"ORDERS":false,"QUOTES":false,"ASSISTANT":true}'::jsonb
    end;

    insert into public.store_settings(store_id, company_id, display_name, modules, general_margin, updated_by)
    values(v_store, v_company, r.store_name, v_modules, 35, v_master)
    on conflict(store_id) do update set modules=excluded.modules, display_name=excluded.display_name, updated_by=v_master, updated_at=now();

    if not exists(select 1 from public.company_subscriptions where company_id=v_company and status='DEMO') then
      insert into public.company_subscriptions(
        company_id, plan_id, status, billing_cycle, contracted_months, contracted_value,
        user_limit, store_limit, company_limit, storage_gb, ai_queries_monthly, modules,
        activated_at, expires_at, grace_until, read_only_until, activated_by, notes
      ) values(
        v_company, v_plan, 'DEMO', 'ANNUAL', 24, 0, 20, 5, 2, 50, 500, v_modules,
        now(), now()+interval '24 months', now()+interval '24 months 7 days', now()+interval '25 months', v_master,
        'Ambiente fictício para demonstração comercial.'
      );
    end if;
  end loop;
end $$;

select c.name, c.segment, c.status, s.public_code, s.name as store
from public.companies c
join public.stores s on s.company_id = c.id
where c.status = 'DEMO'
order by s.public_code;
