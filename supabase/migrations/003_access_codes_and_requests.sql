-- Migration: 003_access_codes_and_requests
-- Adds tenant access codes for self-service sign-up
-- and access_requests for pending user approvals

-- ============================================================
-- ACCESS CODES
-- Each tenant has one or more short codes (e.g. "cfc") that
-- users enter during sign-up to associate themselves with
-- the correct tenant.
-- ============================================================
create table if not exists public.access_codes (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.access_codes enable row level security;

-- Platform admins can manage all access codes
create policy "platform_admin_all_access_codes"
  on public.access_codes
  for all
  to authenticated
  using (public.is_platform_admin(auth.uid()))
  with check (public.is_platform_admin(auth.uid()));

-- Club admins can read their own tenant's codes
create policy "club_admin_read_own_codes"
  on public.access_codes
  for select
  to authenticated
  using (
    public.has_tenant_membership(auth.uid(), tenant_id)
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = access_codes.tenant_id
        and m.role in ('club_admin')
    )
  );

-- ============================================================
-- ACCESS REQUESTS
-- Created when a new user self-registers via the sign-up flow.
-- Status moves from 'pending' → 'approved' or 'rejected' by
-- a Club Administrator.
-- ============================================================
create table if not exists public.access_requests (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete cascade,
  first_name   text not null,
  last_name    text not null,
  email        text not null,
  status       text not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected')),
  reviewed_by  uuid references auth.users(id) on delete set null,
  reviewed_at  timestamptz,
  notes        text,
  created_at   timestamptz not null default now()
);

alter table public.access_requests enable row level security;

-- Platform admins can manage all requests
create policy "platform_admin_all_requests"
  on public.access_requests
  for all
  to authenticated
  using (public.is_platform_admin(auth.uid()))
  with check (public.is_platform_admin(auth.uid()));

-- Club admins can view and update requests for their tenant
create policy "club_admin_view_tenant_requests"
  on public.access_requests
  for select
  to authenticated
  using (
    public.has_tenant_membership(auth.uid(), tenant_id)
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = access_requests.tenant_id
        and m.role in ('club_admin', 'club_director', 'director_of_coaching')
    )
  );

create policy "club_admin_update_tenant_requests"
  on public.access_requests
  for update
  to authenticated
  using (
    public.has_tenant_membership(auth.uid(), tenant_id)
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = access_requests.tenant_id
        and m.role in ('club_admin', 'club_director', 'director_of_coaching')
    )
  )
  with check (
    public.has_tenant_membership(auth.uid(), tenant_id)
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = access_requests.tenant_id
        and m.role in ('club_admin', 'club_director', 'director_of_coaching')
    )
  );

-- Users can view their own request
create policy "user_read_own_request"
  on public.access_requests
  for select
  to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- SEED: Example access code for Coppell FC (if tenant exists)
-- This is left as a comment; seed via the /api/dev/seed route
-- or the Platform Admin UI.
-- ============================================================
