-- Positioning update: software engineer, public email on the domain, Event Padi renamed Event Pros.
update public.site_settings set
  taglines = '{}',
  role_line = 'Software engineer · 7+ years · Lagos, working worldwide.',
  seo_title = 'Layò · Software engineer in Lagos',
  email = 'hello@layothedeveloper.com'
where id;

-- The three role cards (web developer, I.T consultant, hardware expert) are retired.
-- Unpublished rather than deleted, so they can be brought back from the dashboard.
update public.capabilities set published = false
where title in ('Web developer', 'I.T consultant', 'Hardware expert');

update public.projects set
  slug = 'event-pros',
  title = 'Event Pros',
  image_path = '/images/work/event-pros.jpg',
  image_alt = 'Event Pros admin dashboard preview'
where slug = 'event-padi';
