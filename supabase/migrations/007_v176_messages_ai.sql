-- Gerivo v1.7.6 — amplia os modelos permitidos para mensagens de orçamento.

alter table if exists public.store_settings
  drop constraint if exists store_settings_quote_message_template_check;

alter table if exists public.store_settings
  add constraint store_settings_quote_message_template_check
  check (quote_message_template in (
    'PROFISSIONAL',
    'DIRETA',
    'CONSULTIVA',
    'PREVENTIVA',
    'AMIGAVEL',
    'FORMAL',
    'COMERCIAL',
    'CURTA'
  ));

-- Compatibilidade com instalações que utilizam company_settings.
alter table if exists public.company_settings
  drop constraint if exists company_settings_quote_message_template_check;

alter table if exists public.company_settings
  add constraint company_settings_quote_message_template_check
  check (quote_message_template in (
    'PROFISSIONAL',
    'DIRETA',
    'CONSULTIVA',
    'PREVENTIVA',
    'AMIGAVEL',
    'FORMAL',
    'COMERCIAL',
    'CURTA'
  ));

notify pgrst, 'reload schema';
