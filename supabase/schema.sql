-- كليك — سكيمة آمنة لـ Supabase
-- شغّل الملف مرة واحدة من Supabase Dashboard > SQL Editor كمسؤول للمشروع.
-- لا يوجد بريد مدير في التطبيق أو في سياسات RLS. أضف المدير بالـ UUID في آخر الملف.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  phone text,
  email_verified_at timestamptz,
  phone_verified_at timestamptz,
  display_name text not null default 'العميل' check (char_length(display_name) between 1 and 100),
  role text not null default 'client' check (role in ('admin', 'client', 'support')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ترقية قاعدة بيانات موجودة بالفعل عشان تقبل دور 'support' الجديد (موظف
-- خدمة عملاء منفصل عن الأدمن). آمن يتنفذ أكتر من مرة.
-- Contact data is copied exclusively from auth.users, never trusted from browser input.
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists email_verified_at timestamptz;
alter table public.profiles add column if not exists phone_verified_at timestamptz;
create unique index if not exists profiles_phone_unique_idx on public.profiles(phone) where phone is not null;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'client', 'support'));

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  -- اختياري: فاضي للمستخدمين اللي سجّلوا برقم جوال بدون بريد إلكتروني.
  -- بيتملى تلقائيًا من الـ JWT عن طريق trigger تحت، مش من قيمة العميل.
  client_email text check (char_length(client_email) between 3 and 320),
  client_name text not null check (char_length(client_name) between 1 and 100),
  service text not null check (char_length(service) between 1 and 100),
  description text not null check (char_length(description) between 10 and 5000),
  status text not null default 'submitted'
    check (status in ('submitted', 'priced', 'accepted', 'rejected', 'agreed', 'paid', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ترقية قاعدة بيانات موجودة بالفعل عشان يبقى client_email اختياري (لدعم
-- تسجيل الدخول بالجوال بدون بريد إلكتروني). آمن يتنفذ أكتر من مرة.
alter table public.requests alter column client_email drop not null;

-- ترقية قاعدة بيانات موجودة بالفعل عشان تقبل حالة 'rejected' الجديدة
-- (رفض العميل للعرض). آمن يتنفذ أكتر من مرة.
alter table public.requests drop constraint if exists requests_status_check;
alter table public.requests add constraint requests_status_check
  check (status in ('submitted', 'priced', 'accepted', 'rejected', 'agreed', 'paid', 'completed'));

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.requests(id) on delete cascade,
  price numeric(12, 2) not null check (price > 0),
  currency text not null default 'EGP' check (currency = 'EGP'),
  deliverable text not null check (char_length(deliverable) between 1 and 2000),
  deadline timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- لا يملك متصفح العميل صلاحية INSERT في هذا الجدول.
-- تسجل بوابة الدفع/Edge Function المعتمدة فقط نتيجة الدفع بعد التحقق من webhook.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.requests(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'EGP' check (currency = 'EGP'),
  method text not null check (method in ('card', 'apple-pay')),
  provider_payment_id text unique,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- تحديث على مشروع كانت عملته SAR (Paymob) قبل التبديل لـ XPay (EGP): يحدّث
-- القيمة الافتراضية، أي صفوف قديمة، وقيد الـ check على الجدولين. آمن يتنفذ
-- أكتر من مرة.
alter table public.offers alter column currency set default 'EGP';
update public.offers set currency = 'EGP' where currency <> 'EGP';
alter table public.offers drop constraint if exists offers_currency_check;
alter table public.offers add constraint offers_currency_check check (currency = 'EGP');

alter table public.payments alter column currency set default 'EGP';
update public.payments set currency = 'EGP' where currency <> 'EGP';
alter table public.payments drop constraint if exists payments_currency_check;
alter table public.payments add constraint payments_currency_check check (currency = 'EGP');

alter table public.payments add column if not exists provider_payment_id text;
create unique index if not exists payments_provider_payment_id_idx
  on public.payments(provider_payment_id) where provider_payment_id is not null;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  sender text not null check (sender in ('client', 'admin')),
  sender_name text not null check (char_length(sender_name) between 1 and 100),
  text text not null default '' check (char_length(text) <= 2000),
  created_at timestamptz not null default now()
);

-- ترقية قاعدة بيانات موجودة بالفعل: مرفقات (ملفات/صور) في المحادثة، ونسمح
-- برسالة بدون نص طالما فيها مرفق. آمن يتنفذ أكتر من مرة.
alter table public.messages alter column text set default '';
alter table public.messages drop constraint if exists messages_text_check;
alter table public.messages add constraint messages_text_check check (char_length(text) <= 2000);
alter table public.messages add column if not exists attachment_path text;
alter table public.messages add column if not exists attachment_name text check (char_length(attachment_name) <= 300);
alter table public.messages add column if not exists attachment_type text check (attachment_type is null or attachment_type in ('image', 'file'));
alter table public.messages drop constraint if exists messages_has_content_check;
alter table public.messages add constraint messages_has_content_check
  check (char_length(text) > 0 or attachment_path is not null);

create index if not exists requests_client_id_idx on public.requests(client_id);
create index if not exists messages_request_id_idx on public.messages(request_id);

-- ===== نظام الدعم (منفصل تمامًا عن نظام الطلبات/العروض) =====
-- تذكرة دعم واحدة "مفتوحة" لكل عميل في كل مرة. لما العميل يفتح الدردشة
-- المباشرة أول مرة أو بعد ما آخر تذكرة له تتقفل، بيتعمل صف جديد.
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  -- اختياري: نفس منطق requests.client_email فوق.
  client_email text check (char_length(client_email) between 3 and 320),
  client_name text not null check (char_length(client_name) between 1 and 100),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ترقية قاعدة بيانات موجودة بالفعل عشان يبقى client_email اختياري. آمن
-- يتنفذ أكتر من مرة.
alter table public.support_tickets alter column client_email drop not null;

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender text not null check (sender in ('client', 'support')),
  sender_name text not null check (char_length(sender_name) between 1 and 100),
  text text not null check (char_length(text) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists support_tickets_client_id_idx on public.support_tickets(client_id);
create index if not exists support_messages_ticket_id_idx on public.support_messages(ticket_id);

-- يكمل ملفات المستخدمين الموجودة قبل إضافة trigger.
insert into public.profiles (id, display_name, email, phone, email_verified_at, phone_verified_at)
select id, coalesce(nullif(raw_user_meta_data ->> 'full_name', ''), email, phone, 'العميل'),
  email, phone, email_confirmed_at, phone_confirmed_at
from auth.users
on conflict (id) do update set
  email = excluded.email,
  phone = excluded.phone,
  email_verified_at = excluded.email_verified_at,
  phone_verified_at = excluded.phone_verified_at;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.create_profile_for_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, email, phone, email_verified_at, phone_verified_at)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.email, new.phone, 'العميل'),
    new.email, new.phone, new.email_confirmed_at, new.phone_confirmed_at
  )
  on conflict (id) do update set
    email = excluded.email,
    phone = excluded.phone,
    email_verified_at = excluded.email_verified_at,
    phone_verified_at = excluded.phone_verified_at,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_user();

-- Sync authentication contact fields after a successful OTP confirmation.
drop trigger if exists on_auth_user_contact_confirmed on auth.users;
create trigger on_auth_user_contact_confirmed
  after update of email, phone, email_confirmed_at, phone_confirmed_at on auth.users
  for each row execute function public.create_profile_for_user();

-- بيملأ client_email تلقائيًا من JWT المستخدم الحالي وقت الإدخال (أو NULL
-- لو سجّل بالجوال بدون بريد إلكتروني)، بدل ما نصدّق أي قيمة يبعتها العميل
-- من المتصفح. كده مينفعش حد "يزوّر" بريد تاني في طلب أو تذكرة بتاعته.
create or replace function public.set_client_email_from_jwt()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.client_email = (select auth.jwt() ->> 'email');
  return new;
end;
$$;

drop trigger if exists trg_requests_client_email on public.requests;
create trigger trg_requests_client_email before insert on public.requests
  for each row execute function public.set_client_email_from_jwt();

drop trigger if exists trg_support_tickets_client_email on public.support_tickets;
create trigger trg_support_tickets_client_email before insert on public.support_tickets
  for each row execute function public.set_client_email_from_jwt();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
drop trigger if exists trg_requests_updated_at on public.requests;
create trigger trg_requests_updated_at before update on public.requests
  for each row execute function public.set_updated_at();
drop trigger if exists trg_offers_updated_at on public.offers;
create trigger trg_offers_updated_at before update on public.offers
  for each row execute function public.set_updated_at();

-- دالة الدور لا تحتوي بريدًا ولا تستقبل user_id من المتصفح.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

create or replace function public.owns_request(target_request_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.requests r
    where r.id = target_request_id and r.client_id = (select auth.uid())
  );
$$;

-- موظف الدعم أو الأدمن (الأدمن يقدر يشوف تذاكر الدعم كمان، لكن عنده
-- لوحته المنفصلة أصلًا في /admin).
create or replace function public.is_support_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role in ('support', 'admin')
  );
$$;

create or replace function public.owns_support_ticket(target_ticket_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.support_tickets t
    where t.id = target_ticket_id and t.client_id = (select auth.uid())
  );
$$;

alter table public.profiles enable row level security;
alter table public.requests enable row level security;
alter table public.offers enable row level security;
alter table public.payments enable row level security;
alter table public.messages enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

-- صلاحيات SQL: العميل لا يستطيع تعديل إلا status، ولا يستطيع كتابة مدفوعات.
revoke all on public.profiles, public.requests, public.offers, public.payments, public.messages,
  public.support_tickets, public.support_messages from anon;
revoke all on public.profiles, public.requests, public.offers, public.payments, public.messages,
  public.support_tickets, public.support_messages from authenticated;
grant select on public.profiles to authenticated;
grant select, insert on public.requests to authenticated;
grant update(status) on public.requests to authenticated;
grant select, insert, update on public.offers to authenticated;
grant select on public.payments to authenticated;
grant select, insert on public.messages to authenticated;
grant select, insert on public.support_tickets to authenticated;
grant update(status) on public.support_tickets to authenticated;
grant select, insert on public.support_messages to authenticated;

revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.owns_request(uuid) from public, anon;
revoke execute on function public.is_support_staff() from public, anon;
revoke execute on function public.owns_support_ticket(uuid) from public, anon;
grant execute on function public.is_admin(), public.owns_request(uuid),
  public.is_support_staff(), public.owns_support_ticket(uuid) to authenticated;

drop policy if exists "profiles: select own" on public.profiles;
create policy "profiles: select own" on public.profiles for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "requests: select own or admin" on public.requests;
drop policy if exists "requests: insert own" on public.requests;
drop policy if exists "requests: update own or admin" on public.requests;
drop policy if exists "requests: client accepts priced offer" on public.requests;
drop policy if exists "requests: admin updates" on public.requests;
create policy "requests: select own or admin" on public.requests for select to authenticated
  using (client_id = (select auth.uid()) or (select public.is_admin()));
create policy "requests: insert own" on public.requests for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and client_id = (select auth.uid())
  );
-- العميل يقدر يرد على عرض معروض عليه: يقبله (priced -> accepted) أو يرفضه
-- (priced -> rejected). أي انتقال تاني ممنوع.
create policy "requests: client accepts priced offer" on public.requests for update to authenticated
  using (client_id = (select auth.uid()) and status = 'priced')
  with check (client_id = (select auth.uid()) and status in ('accepted', 'rejected'));
create policy "requests: admin updates" on public.requests for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "offers: select own or admin" on public.offers;
drop policy if exists "offers: admin writes" on public.offers;
drop policy if exists "offers: admin updates" on public.offers;
create policy "offers: select own or admin" on public.offers for select to authenticated
  using ((select public.owns_request(request_id)) or (select public.is_admin()));
create policy "offers: admin writes" on public.offers for insert to authenticated
  with check ((select public.is_admin()));
create policy "offers: admin updates" on public.offers for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "payments: select own or admin" on public.payments;
drop policy if exists "payments: client pays own request" on public.payments;
create policy "payments: select own or admin" on public.payments for select to authenticated
  using ((select public.owns_request(request_id)) or (select public.is_admin()));

drop policy if exists "messages: select own or admin" on public.messages;
drop policy if exists "messages: insert" on public.messages;
create policy "messages: select own or admin" on public.messages for select to authenticated
  using ((select public.owns_request(request_id)) or (select public.is_admin()));
create policy "messages: insert" on public.messages for insert to authenticated
  with check (
    (sender = 'admin' and (select public.is_admin()))
    or (sender = 'client' and (select public.owns_request(request_id)))
  );

drop policy if exists "support_tickets: select own or staff" on public.support_tickets;
drop policy if exists "support_tickets: insert own" on public.support_tickets;
drop policy if exists "support_tickets: staff updates status" on public.support_tickets;
create policy "support_tickets: select own or staff" on public.support_tickets for select to authenticated
  using (client_id = (select auth.uid()) or (select public.is_support_staff()));
create policy "support_tickets: insert own" on public.support_tickets for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and client_id = (select auth.uid())
  );
-- بس فريق الدعم يقدر يقفل التذكرة (العميل بيفتح تذكرة جديدة تلقائيًا
-- بدل ما يقدر يتلاعب في حالة التذكرة بنفسه).
create policy "support_tickets: staff updates status" on public.support_tickets for update to authenticated
  using ((select public.is_support_staff())) with check ((select public.is_support_staff()));

drop policy if exists "support_messages: select own or staff" on public.support_messages;
drop policy if exists "support_messages: insert" on public.support_messages;
create policy "support_messages: select own or staff" on public.support_messages for select to authenticated
  using ((select public.owns_support_ticket(ticket_id)) or (select public.is_support_staff()));
create policy "support_messages: insert" on public.support_messages for insert to authenticated
  with check (
    (sender = 'support' and (select public.is_support_staff()))
    or (sender = 'client' and (select public.owns_support_ticket(ticket_id)))
  );

-- ===== تخزين مرفقات المحادثة (ملفات/صور تسليم المشروع) =====
-- باكت خاص (public = false)؛ أي ملف بيتعرض عن طريق رابط موقّع مؤقت
-- (signed URL) بيتولّد وقت الحاجة بس، مش رابط عام ثابت.
insert into storage.buckets (id, name, public, file_size_limit)
values ('chat-attachments', 'chat-attachments', false, 26214400) -- 25MB
on conflict (id) do nothing;

-- مسار كل ملف بيتبني بالشكل: <request_id>/<اسم عشوائي فريد>، فبنستخدم أول
-- جزء من المسار (foldername) كرقم الطلب، ونتحقق إن اللي بيرفع/بيقرا الملف
-- ده هو صاحب الطلب أو الأدمن — بنفس الدالة owns_request المستخدمة لباقي
-- جداول الطلب.
drop policy if exists "chat-attachments: select own or admin" on storage.objects;
drop policy if exists "chat-attachments: insert own or admin" on storage.objects;
create policy "chat-attachments: select own or admin" on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and ((select public.owns_request((storage.foldername(name))[1]::uuid)) or (select public.is_admin()))
  );
create policy "chat-attachments: insert own or admin" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and ((select public.owns_request((storage.foldername(name))[1]::uuid)) or (select public.is_admin()))
  );

create or replace view public.service_requests_view
  with (security_invoker = true) as
select
  r.id, r.client_id, r.client_email, r.client_name, r.service, r.description,
  r.status, r.created_at, r.updated_at,
  o.price, coalesce(o.currency, 'EGP') as currency, o.deliverable, o.deadline,
  p.paid_at, p.method as payment_method, p.provider_payment_id as gateway_payment_id
from public.requests r
left join public.offers o on o.request_id = r.id
left join public.payments p on p.request_id = r.id;

grant select on public.service_requests_view to authenticated;

-- شغّل الأوامر التالية بعد إنشاء حساب المدير/موظف الدعم، مع استبدال UUID فقط.
-- update public.profiles set role = 'admin' where id = 'PUT-ADMIN-USER-UUID-HERE';
-- update public.profiles set role = 'support' where id = 'PUT-SUPPORT-USER-UUID-HERE';
-- لا تضع Service Role Key أو أسرار بوابة الدفع داخل VITE_* أو frontend.

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'requests') then
    alter publication supabase_realtime add table public.requests;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'offers') then
    alter publication supabase_realtime add table public.offers;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'payments') then
    alter publication supabase_realtime add table public.payments;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'support_tickets') then
    alter publication supabase_realtime add table public.support_tickets;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'support_messages') then
    alter publication supabase_realtime add table public.support_messages;
  end if;
end;
$$;
