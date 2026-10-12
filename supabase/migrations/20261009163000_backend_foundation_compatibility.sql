-- Extends the existing Easy Ride schema without replacing its buy/rent model.
-- Apply after 20261009110000_initial_schema.sql.

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

do $$ begin
  create type public.staff_role as enum ('SUPPORT', 'VERIFICATION', 'ADMIN', 'SUPER_ADMIN');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.offer_status as enum ('pending', 'accepted', 'declined', 'withdrawn', 'expired');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.support_ticket_status as enum ('open', 'in_progress', 'waiting_for_user', 'resolved', 'closed');
exception when duplicate_object then null;
end $$;

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists country_code text;
alter table public.profiles add column if not exists account_status text not null default 'active';
update public.profiles set display_name = full_name where display_name is null;
alter table public.profiles alter column display_name set default '';

alter table public.vehicles add column if not exists dealer_id uuid references public.profiles(id);
alter table public.vehicles add column if not exists trim text;
alter table public.vehicles add column if not exists mileage_km integer;
alter table public.vehicles add column if not exists sale_price numeric(12, 2);
alter table public.vehicles add column if not exists rent_day_price numeric(12, 2);
alter table public.vehicles add column if not exists rent_week_price numeric(12, 2);
alter table public.vehicles add column if not exists rent_month_price numeric(12, 2);
alter table public.vehicles add column if not exists published_at timestamptz;
alter table public.vehicles add column if not exists rejection_reason text;
update public.vehicles
set mileage_km = mileage,
    sale_price = case when listing_type = 'buy' then price end,
    rent_day_price = case when listing_type = 'rent' then price end,
    published_at = case when status = 'active' then coalesce(published_at, created_at) end
where mileage_km is null;

create table if not exists public.staff_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.staff_role not null,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table if not exists public.dealer_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  business_name text not null,
  registration_number text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  criteria jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.vehicles(id) on delete set null,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (vehicle_id, buyer_id, seller_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'USD' check (length(currency) = 3),
  status public.offer_status not null default 'pending',
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete restrict,
  provider text not null,
  provider_reference text,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'USD' check (length(currency) = 3),
  status public.transaction_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_reference)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  body text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  description text not null,
  status public.support_ticket_status not null default 'open',
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists staff_roles_user_id_idx on public.staff_roles(user_id);
create index if not exists saved_searches_user_id_idx on public.saved_searches(user_id);
create index if not exists messages_conversation_id_idx on public.messages(conversation_id, created_at);
create index if not exists notifications_user_id_idx on public.notifications(user_id, created_at desc);
create index if not exists audit_logs_actor_id_idx on public.audit_logs(actor_id, created_at desc);

create or replace function public.has_staff_role(required_roles public.staff_role[])
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.staff_roles
    where user_id = auth.uid() and role = any(required_roles)
  );
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public
as $$
  select public.has_staff_role(array['SUPPORT','VERIFICATION','ADMIN','SUPER_ADMIN']::public.staff_role[]);
$$;

create or replace function public.is_master_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select public.has_staff_role(array['SUPER_ADMIN']::public.staff_role[]);
$$;

create or replace function public.can_review_dealers()
returns boolean language sql stable security definer set search_path = public
as $$
  select public.has_staff_role(array['VERIFICATION','ADMIN','SUPER_ADMIN']::public.staff_role[]);
$$;

create or replace function public.create_rental_booking(
  p_vehicle_id uuid,
  p_start_date date,
  p_end_date date,
  p_notes text default null
)
returns public.bookings
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_vehicle public.vehicles;
  v_booking public.bookings;
  v_total numeric(12, 2);
  v_days integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_end_date < p_start_date then
    raise exception 'End date must be on or after start date';
  end if;

  select * into v_vehicle
  from public.vehicles
  where id = p_vehicle_id and status = 'active' and listing_type = 'rent'
  for update;
  if not found then raise exception 'Rental vehicle is not available'; end if;

  if exists (
    select 1 from public.availability_blocks
    where vehicle_id = p_vehicle_id
      and daterange(start_date, end_date, '[]') && daterange(p_start_date, p_end_date, '[]')
  ) then
    raise exception 'Vehicle is unavailable for those dates';
  end if;

  v_days := (p_end_date - p_start_date) + 1;
  v_total := v_vehicle.price * v_days;

  insert into public.bookings (
    vehicle_id, customer_id, start_date, end_date, status, total_amount, currency, notes
  ) values (
    p_vehicle_id, auth.uid(), p_start_date, p_end_date, 'pending', v_total, v_vehicle.currency, p_notes
  )
  returning * into v_booking;
  return v_booking;
exception when exclusion_violation then
  raise exception 'Vehicle is already booked for those dates';
end;
$$;

alter table public.staff_roles enable row level security;
alter table public.dealer_profiles enable row level security;
alter table public.saved_searches enable row level security;
alter table public.availability_blocks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.offers enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.reviews enable row level security;
alter table public.promotions enable row level security;
alter table public.support_tickets enable row level security;
alter table public.audit_logs enable row level security;

create policy "Users can view their staff roles"
  on public.staff_roles for select to authenticated
  using (user_id = auth.uid() or public.is_master_admin());
create policy "Users can manage saved searches"
  on public.saved_searches for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Owners can manage availability blocks"
  on public.availability_blocks for all to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
create policy "Participants can view conversations"
  on public.conversations for select to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_staff());
create policy "Participants can manage messages"
  on public.messages for all to authenticated
  using (sender_id = auth.uid() or exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  ))
  with check (sender_id = auth.uid());
create policy "Users can manage their offers"
  on public.offers for all to authenticated
  using (buyer_id = auth.uid() or exists (
    select 1 from public.vehicles v where v.id = vehicle_id and v.owner_id = auth.uid()
  ) or public.is_staff())
  with check (buyer_id = auth.uid());
create policy "Users can view their payments"
  on public.payments for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
create policy "Users can view their notifications"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy "Users can manage their reviews"
  on public.reviews for all to authenticated
  using (reviewer_id = auth.uid() or public.is_admin())
  with check (reviewer_id = auth.uid());
create policy "Owners can manage promotions"
  on public.promotions for all to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
create policy "Users can manage their support tickets"
  on public.support_tickets for all to authenticated
  using (user_id = auth.uid() or public.is_staff())
  with check (user_id = auth.uid() or public.is_staff());
create policy "Staff can view audit logs"
  on public.audit_logs for select to authenticated
  using (public.is_staff());
