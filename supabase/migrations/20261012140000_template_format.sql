-- Autoresponders: HTML (default) or plain text. Both formats support {{tokens}}.
alter table public.mail_templates
  add column if not exists format text not null default 'html' check (format in ('html', 'text'));

update public.mail_templates set format = 'html', body =
'<p>Hi {{first_name}},</p>

<p>Thanks for getting in touch about {{service}}. Your enquiry has reached me and I''ll reply within 24 hours.</p>

<p>If you haven''t picked a call time yet, you can book one here:<br>
<a href="{{booking_url}}">Book a 30-minute call</a></p>

<p>Talk soon,<br>
{{site_name}}<br>
<a href="https://{{site_url}}">{{site_url}}</a></p>'
where key = 'enquiry_autoreply' and body like 'Hi {{first_name}},%' and body not like '<%';

update public.mail_templates set format = 'html', body =
'<p>Hi {{first_name}},</p>

<p>Thanks for your message. It has reached me and I''ll get back to you within 24 hours.</p>

<p>Talk soon,<br>
{{site_name}}<br>
<a href="https://{{site_url}}">{{site_url}}</a></p>'
where key = 'message_autoreply' and body like 'Hi {{first_name}},%' and body not like '<%';
