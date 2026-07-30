-- Gerivo v1.7.3 — cor independente e identidade oficial
begin;

alter table public.store_settings
  add column if not exists selection_color text not null default '#C89B3C';

alter table public.store_settings
  alter column selection_color set default '#C89B3C';

update public.store_settings
set selection_color = '#C89B3C'
where selection_color is null
   or selection_color !~ '^#[0-9A-Fa-f]{6}$'
   or lower(selection_color) in ('#0a7a67', '#176b5a');

update public.store_settings
set sidebar_color = '#0B1F3A'
where sidebar_color is null
   or sidebar_color !~ '^#[0-9A-Fa-f]{6}$'
   or lower(sidebar_color) in ('#071b2a', '#0d1b28', '#101923');

commit;
