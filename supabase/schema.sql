-- Run in Supabase → SQL Editor (once) before first API deploy.
-- Catalog/orders/admin via PostgREST; users/OTP/addresses via EF Core on the same DB.

create extension if not exists "pgcrypto";

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text not null default '',
  domain text not null default '',
  theme_key text not null default '',
  hero_eyebrow text not null default '',
  hero_title text not null default '',
  hero_highlight text not null default '',
  hero_body text not null default '',
  story_title text not null default '',
  story_body text not null default '',
  logo_url text not null default '',
  hero_video_url text not null default '',
  order_prefix text not null default 'DP'
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  unique (tenant_id, name)
);

create table if not exists subcategories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  category_name text not null,
  name text not null,
  unique (tenant_id, category_name, name)
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_in_inr numeric(10,2) not null,
  domain text not null default '',
  category text not null default '',
  subcategory text not null default '',
  description text not null default '',
  ingredients jsonb not null default '[]'::jsonb,
  bestseller boolean not null default false,
  available boolean not null default true,
  image_url text not null default ''
);

create table if not exists product_tenants (
  product_id uuid not null references products(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  primary key (product_id, tenant_id)
);

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  tenant_id uuid null references tenants(id) on delete set null
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  tenant_id uuid not null references tenants(id),
  user_id uuid not null,
  total_price numeric(10,2) not null,
  status int not null default 0,
  phone text not null default '',
  shipping_name text not null default '',
  shipping_line1 text not null default '',
  shipping_city text not null default '',
  shipping_pincode text not null default '',
  shipping_state text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null,
  name text not null,
  qty int not null,
  price_in_inr numeric(10,2) not null
);

-- EF Core (OTP / account) — must exist; EnsureCreated is skipped when SUPABASE_* is set.
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  name text null,
  created_at timestamptz not null default now()
);

create table if not exists addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  full_name text not null default '',
  line1 text not null default '',
  city text not null default '',
  pincode text not null default '',
  state text not null default 'Karnataka',
  is_default boolean not null default false
);

create table if not exists otp_challenges (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  purpose text not null default 'login',
  expires_at timestamptz not null,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ix_otp_challenges_phone_created_at
  on otp_challenges (phone, created_at);

create table if not exists message_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid null,
  channel text not null default '',
  to_phone text not null default '',
  template text not null default '',
  status text not null default '',
  provider_id text null,
  error text null,
  created_at timestamptz not null default now()
);

-- Service role bypasses RLS; enable RLS and deny anon by default.
alter table tenants enable row level security;
alter table categories enable row level security;
alter table subcategories enable row level security;
alter table products enable row level security;
alter table product_tenants enable row level security;
alter table admin_users enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table users enable row level security;
alter table addresses enable row level security;
alter table otp_challenges enable row level security;
alter table message_logs enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant select on tenants, categories, subcategories, products, product_tenants to anon, authenticated;

-- Safe for existing projects created before domain filter.
alter table products add column if not exists domain text not null default '';
