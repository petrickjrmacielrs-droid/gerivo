-- Gerivo v1.7.1 — correção para bancos que já executaram a v1.7
-- Pode ser executado uma vez após 001, 002 e 003.

DO $$
DECLARE
  v_email text := 'gerivo.sistemas@gmail.com';
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário gerivo.sistemas@gmail.com não encontrado em Authentication > Users.';
  END IF;

  UPDATE public.profiles
  SET full_name = 'Gerivo Sistema',
      username = 'gerivo.sistema',
      username_normalized = 'gerivo.sistema',
      email = v_email,
      recovery_email = v_email,
      platform_role = 'MASTER',
      active = true,
      must_change_password = false,
      updated_at = now()
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (
      id, email, recovery_email, full_name, username, username_normalized,
      platform_role, active, must_change_password
    ) VALUES (
      v_user_id, v_email, v_email, 'Gerivo Sistema', 'gerivo.sistema', 'gerivo.sistema',
      'MASTER', true, false
    );
  END IF;
END $$;

-- O delivery passa a exibir Pedidos usando o mecanismo operacional de agenda.
UPDATE public.store_settings ss
SET modules = COALESCE(ss.modules, '{}'::jsonb) ||
  '{"APPOINTMENTS":true,"CATALOG":true,"INVENTORY":true,"CHECKLIST":false,"ORDERS":false,"QUOTES":false,"ASSISTANT":true}'::jsonb,
    updated_at = now()
FROM public.companies c
WHERE c.id = ss.company_id
  AND c.segment IN ('DEMO_DELIVERY', 'DELIVERY');

SELECT username, full_name, email, platform_role, active
FROM public.profiles
WHERE lower(email) = 'gerivo.sistemas@gmail.com';

SELECT c.name AS empresa, c.segment, ss.modules
FROM public.store_settings ss
JOIN public.companies c ON c.id = ss.company_id
WHERE c.segment IN ('DEMO_DELIVERY', 'DELIVERY');
