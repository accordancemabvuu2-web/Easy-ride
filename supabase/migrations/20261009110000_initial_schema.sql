create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

create type public.account_role as enum ('buyer', 'seller', 'dealer', 'admin');
create type public.application_status as enum ('pending', 'approved', 'rejected');
create type public.listing_type as enum ('buy', 'rent');
create type public.listing_status as enum ('draft', 'pending', 'active', 'rejected', 'sold', 'rented', 'suspended');
create type public.booking_status as enum ('pending', 'confirmed', 'cancelled', 'completed', 'declined');
create type public.transaction_status as enum ('pending', 'succeeded', 'failed', 'refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  avatar_url text,
  role public.account_role not null default 'buyer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dealer_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_name text not null,
  registration_number text,
  notes text,
  status public.application_status not null default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  listing_type public.listing_type not null,
  status public.listing_status not null default 'draft',
  make text not null,
  model text not null,
  year integer not null check (year between 1886 and 2100),
  price numeric(12, 2) not null check (price >= 0),
  currency text not null default 'USD' check (length(currency) = 3),
  transmission text not null check (transmission in ('Automatic', 'Manual')),
  fuel_type text not null check (fuel_type in ('Petrol', 'Diesel', 'Hybrid', 'Electric')),
  mileage integer not null default 0 check (mileage >= 0),
  condition text not null check (condition in ('New', 'Excellent', 'Good', 'Fair')),
  body_type text,
  color text,
  description text not null default '',
  address text,
  city text,
  country text,
  latitude double precision,
  longitude double precision,
  views integer not null default 0 check (views >= 0),
  favorites_count integer not null default 0 check (favorites_count >= 0),
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicle_images (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  image_url text not null,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  unique (vehicle_id, display_order)
);

create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, vehicle_id)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  status public.booking_status not null default 'pending',
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  currency text not null default 'USD' check (length(currency) = 3),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

alter table public.bookings
  add constraint bookings_no_overlapping_confirmed_dates
  exclude using gist (
    vehicle_id with =,
    daterange(start_date, end_date, '[]') with &&
  ) where (status in ('pending', 'confirmed'));

create table public.transactions (
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

create index vehicles_active_created_at_idx on public.vehicles (created_at desc) where status = 'active';
create index vehicles_owner_id_idx on public.vehicles (owner_id);
create index vehicle_images_vehicle_id_idx on public.vehicle_images (vehicle_id, display_order);
create index bookings_vehicle_dates_idx on public.bookings (vehicle_id, start_date, end_date);
create index bookings_customer_id_idx on public.bookings (customer_id);
create index transactions_user_id_idx on public.transactions (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger vehicles_set_updated_at before update on public.vehicles
for each row execute function public.set_updated_at();
create trigger bookings_set_updated_at before update on public.bookings
for each row execute function public.set_updated_at();
create trigger transactions_set_updated_at before update on public.transactions
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_dealer_or_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('dealer', 'admin')
  );
$$;

alter table public.profiles enable row level security;
alter table public.dealer_applications enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_images enable row level security;
alter table public.favorites enable row level security;
alter table public.bookings enable row level security;
alter table public.transactions enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Users can manage their dealer application"
  on public.dealer_applications for all to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() and status = 'pending' or public.is_admin());

create policy "Anyone can view active vehicles"
  on public.vehicles for select to anon, authenticated
  using (status = 'active' or owner_id = auth.uid() or public.is_admin());
create policy "Sellers can create their own vehicles"
  on public.vehicles for insert to authenticated
  with check (owner_id = auth.uid() and (public.is_dealer_or_admin() or status in ('draft', 'pending')));
create policy "Owners can update their vehicles"
  on public.vehicles for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
create policy "Owners can delete their vehicles"
  on public.vehicles for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin());

create policy "Anyone can view images for visible vehicles"
  on public.vehicle_images for select to anon, authenticated
  using (exists (
    select 1 from public.vehicles
    where id = vehicle_id and (status = 'active' or owner_id = auth.uid() or public.is_admin())
  ));
create policy "Owners can manage vehicle images"
  on public.vehicle_images for all to authenticated
  using (exists (select 1 from public.vehicles where id = vehicle_id and (owner_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.vehicles where id = vehicle_id and (owner_id = auth.uid() or public.is_admin())));

create policy "Users can manage their favorites"
  on public.favorites for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Customers and owners can view bookings"
  on public.bookings for select to authenticated
  using (
    customer_id = auth.uid()
    or exists (select 1 from public.vehicles where id = vehicle_id and owner_id = auth.uid())
    or public.is_admin()
  );
create policy "Customers can create bookings"
  on public.bookings for insert to authenticated
  with check (customer_id = auth.uid());
create policy "Customers and owners can update bookings"
  on public.bookings for update to authenticated
  using (
    customer_id = auth.uid()
    or exists (select 1 from public.vehicles where id = vehicle_id and owner_id = auth.uid())
    or public.is_admin()
  )
  with check (
    customer_id = auth.uid()
    or exists (select 1 from public.vehicles where id = vehicle_id and owner_id = auth.uid())
    or public.is_admin()
  );

create policy "Users can view their transactions"
  on public.transactions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "Admins can manage transactions"
  on public.transactions for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
