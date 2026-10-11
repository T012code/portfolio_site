-- Tools: Cloudflare and Antigravity.
insert into public.skills (name, sort, published) values
  ('Cloudflare', 16, true),
  ('Antigravity', 17, true)
on conflict (name) do update set published = true;

update public.page_blocks
set content = jsonb_set(content, '{note}', to_jsonb('AI-assisted development with Claude, Codex and Antigravity, for faster iteration with human review in charge.'::text))
where page = 'about' and key = 'tools';
