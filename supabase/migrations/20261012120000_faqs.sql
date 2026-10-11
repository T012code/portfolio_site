-- FAQ entries for the /faq page, edited from the dashboard like the other lists.
create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(question) between 3 and 300),
  answer text not null default '' check (char_length(answer) <= 3000),
  published boolean not null default true,
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);

create trigger faqs_touch before update on public.faqs
  for each row execute function public.touch_updated_at();

alter table public.faqs enable row level security;
create policy faqs_public_read on public.faqs for select to anon using (published);
create policy faqs_admin_read on public.faqs for select to authenticated using ((select private.is_admin()));
create policy faqs_admin_insert on public.faqs for insert to authenticated with check ((select private.is_admin()));
create policy faqs_admin_update on public.faqs for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy faqs_admin_delete on public.faqs for delete to authenticated using ((select private.is_admin()));

-- Drag-to-reorder covers FAQs too.
create or replace function public.reorder_rows(p_table text, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_table not in ('projects', 'services', 'capabilities', 'process_steps', 'skills', 'faqs') then
    raise exception 'invalid_table' using errcode = '22023';
  end if;
  execute format(
    'update public.%I t set sort = o.ord from unnest($1) with ordinality as o(id, ord) where t.id = o.id',
    p_table
  ) using p_ids;
end;
$$;

insert into public.faqs (question, answer, sort) values
('What kind of projects do you take on?',
 'Websites, web apps and mobile apps for businesses that need them to work properly: company websites, WordPress builds, online stores, booking and ticketing platforms, customer portals, Flutter apps, and integrations with payment providers and CRMs. I also take IT consulting and hardware or network setup work.', 1),
('How does a project start?',
 'Send a service enquiry and pick a time for a free 30-minute discovery call. On the call we go through what you need, who it''s for and when you need it. Within a few days I send a written proposal with scope, timeline and price. Work starts once you sign the agreement and pay the deposit.', 2),
('How much does a website or app cost?',
 'It depends on scope, so every project gets a fixed quote after the discovery call. A landing page costs far less than a custom platform with payments and user accounts. If you have a budget in mind, share it in the enquiry form and I''ll tell you honestly what it can cover.', 3),
('How do payments work?',
 'Fixed-price projects are paid 50% upfront and 50% on delivery, before launch. Nigerian clients pay in Naira by bank transfer; international clients pay in US dollars. You get a receipt for every payment.', 4),
('How long will it take?',
 'A landing page usually takes one to two weeks and a business website three to six. Web apps and mobile apps run from six weeks upwards depending on features. The proposal sets out milestones with dates, and I keep you updated every week.', 5),
('Do you work with clients outside Nigeria?',
 'Yes. I''m based in Lagos (WAT, UTC+1), which overlaps well with UK and European working hours and gives a few shared hours with North America. Calls, updates and handover all happen remotely.', 6),
('Who owns the code and content?',
 'You do. Once the project is paid in full, the code, design files and content made for you are yours, and I hand over every login and access key. I keep the right to show the work in my portfolio unless we agree otherwise.', 7),
('What happens after launch?',
 'Every project includes 30 days of free fixes for anything that doesn''t work as agreed. After that I offer monthly maintenance covering updates, backups, security monitoring and small changes, or you can take it in-house with the documentation I provide.', 8),
('Can you fix or take over an existing site?',
 'Yes. Rescuing and improving existing codebases is a regular part of my work. I start with a short audit so you know what state it''s in and what it will take, before you commit to anything.', 9),
('Will you sign an NDA?',
 'Yes. If your idea or data is sensitive, send your NDA before the discovery call, or I can provide one.', 10);
