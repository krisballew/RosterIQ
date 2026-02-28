-- Migration: 001_initial_schema
-- Creates core tenant, profile, membership, and audit tables with RLS

-- ============================================================
-- TENANTS
-- ============================================================
create table if not exists public.tenants (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  timezone     text not null default 'America/Chicago',
  address_text text,
  logo_url     text,
  status       text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
  created_at   timestamptz not null default now()
);

alter table public.tenants enable row level security;

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists public.profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  first_name     text,
  last_name      text,
  avatar_url     text,
  last_login_at  timestamptz
);

alter table public.profiles enable row level security;

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- MEMBERSHIPS
-- ============================================================
create table if not exists public.memberships (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  tenant_id  uuid references public.tenants(id) on delete cascade,
  role       text not null,
  created_at timestamptz not null default now(),
  constraint valid_role check (role in (
    'platform_admin',
    'club_admin',
    'club_director',
    'director_of_coaching',
    'select_coach',
    'academy_coach',
    'select_player',
    'academy_player'
  )),
  -- platform_admin has tenant_id = NULL; all others require a tenant
  constraint tenant_required_for_non_platform check (
    role = 'platform_admin' or tenant_id is not null
  )
);

alter table public.memberships enable row level security;

-- ============================================================
-- AUDIT EVENTS
-- ============================================================
create table if not exists public.audit_events (
  id             uuid primary key default gen_random_uuid(),
  actor_user_id  uuid references auth.users(id) on delete set null,
  tenant_id      uuid references public.tenants(id) on delete set null,
  action         text not null,
  entity_type    text not null,
  entity_id      text,
  metadata       jsonb,
  created_at     timestamptz not null default now()
);

alter table public.audit_events enable row level security;

-- ============================================================
-- HELPER FUNCTION: is platform admin?
-- ============================================================
create or replace function public.is_platform_admin(uid uuid)
returns boolean
language sql
security definer stable
as $$
  select exists (
    select 1 from public.memberships
    where user_id = uid
      and role = 'platform_admin'
      and tenant_id is null
  );
$$;

-- ============================================================
-- HELPER FUNCTION: user has membership for tenant?
-- ============================================================
create or replace function public.has_tenant_membership(uid uuid, tid uuid)
returns boolean
language sql
security definer stable
as $$
  select exists (
    select 1 from public.memberships
    where user_id = uid
      and tenant_id = tid
  );
$$;
