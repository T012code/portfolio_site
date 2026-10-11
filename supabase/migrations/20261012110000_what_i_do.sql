-- "What I do" is back, with the roles expanded.
update public.capabilities set published = true, sort = 6 where title = 'I.T consultant';
update public.capabilities set published = true, sort = 7 where title = 'Hardware expert';
update public.capabilities set
  published = true,
  sort = 3,
  short_body = 'WordPress sites, themes and e-commerce.',
  body = 'Business websites, custom WordPress themes and plugins, and WooCommerce stores that owners can update themselves.'
where title = 'Web developer';

insert into public.capabilities (title, short_body, body, sort, published)
select v.title, v.short_body, v.body, v.sort, true
from (values
  ('Full-stack developer', 'Web apps from database to interface.',
   'End-to-end web applications in React, Next.js, Node.js, PHP and MySQL: data models, APIs, sign-in, interfaces and deployment. From greenfield builds to legacy rescues.', 1),
  ('Front-end developer', 'Fast, accessible, animated interfaces.',
   'Interfaces in React and Next.js that load fast and work for everyone: responsive layouts, motion, accessibility and performance tuning.', 2),
  ('Mobile app developer', 'Flutter apps for iOS and Android.',
   'Companion apps in Flutter for iOS and Android that share one backend with the web product: registration, ticketing and on-site check-in.', 4),
  ('Integrations & APIs', 'Payments, CRMs and booking systems.',
   'Connecting the tools a business already runs on: Paystack and Stripe payments, HubSpot and other CRMs, booking platforms, maps and video, with webhooks that keep data in sync.', 5)
) as v(title, short_body, body, sort)
where not exists (select 1 from public.capabilities c where c.title = v.title);
