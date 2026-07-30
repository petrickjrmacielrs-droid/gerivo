-- Gerivo v1.7.1 — Criar ou corrigir o usuário MASTER padrão
-- Primeiro crie gerivo.sistemas@gmail.com em Authentication > Users.

DO $$
DECLARE
  v_email text := 'gerivo.sistemas@gmail.com';
  v_user_id uuid;
  v_username text := 'gerivo.sistema';
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário gerivo.sistemas@gmail.com não encontrado em Authentication > Users.';
  END IF;

  INSERT INTO public.profiles (
    id, email, recovery_email, full_name, username, username_normalized,
    platform_role, active, must_change_password
  ) VALUES (
    v_user_id, v_email, v_email, 'Gerivo Sistema', v_username, v_username,
    'MASTER', true, false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    recovery_email = EXCLUDED.recovery_email,
    full_name = EXCLUDED.full_name,
    username = EXCLUDED.username,
    username_normalized = EXCLUDED.username_normalized,
    platform_role = 'MASTER',
    active = true,
    must_change_password = false,
    updated_at = now();
END $$;

SELECT id, username, email, full_name, platform_role, active
FROM public.profiles
WHERE lower(email) = 'gerivo.sistemas@gmail.com';
