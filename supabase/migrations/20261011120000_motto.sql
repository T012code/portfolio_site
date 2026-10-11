-- Brand motto, shown in the preloader, the hero and the footer.
alter table public.site_settings
  add column if not exists motto text not null default 'Everything is possible.';
