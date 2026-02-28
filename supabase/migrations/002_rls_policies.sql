-- Migration: 002_rls_policies
-- Row-Level Security policies for all tenant-scoped tables

-- ============================================================
-- TENANTS RLS
-- ============================================================

-- Platform admins can do anything with tenants
create policy "platform_admin_all_tenants"
  on public.tenants
  for all
  to authenticated
  using (public.is_platform_admin(auth.uid()))
  with check (public.is_platform_admin(auth.uid()));

-- Tenant members can read their own tenant
create policy "members_read_own_tenant"
  on public.tenants
  for select
  to authenticated
  using (public.has_tenant_membership(auth.uid(), id));

-- ============================================================
-- PROFILES RLS
-- ============================================================

-- Users can read and update their own profile
create policy "own_profile_read"
  on public.profiles
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_platform_admin(auth.uid()));

create policy "own_profile_update"
  on public.profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own_profile_insert"
  on public.profiles
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- ============================================================
-- MEMBERSHIPS RLS
-- ============================================================

-- Platform admins can manage all memberships
create policy "platform_admin_all_memberships"
  on public.memberships
  for all
  to authenticated
  using (public.is_platform_admin(auth.uid()))
  with check (public.is_platform_admin(auth.uid()));

-- Users can read their own memberships
create policy "read_own_memberships"
  on public.memberships
  for select
  to authenticated
  using (user_id = auth.uid());

-- Club admins can read memberships within their tenant
create policy "club_admin_read_tenant_memberships"
  on public.memberships
  for select
  to authenticated
  using (
    tenant_id is not null
    and public.has_tenant_membership(auth.uid(), tenant_id)
    and exists (
      select 1 from public.memberships m2
      where m2.user_id = auth.uid()
        and m2.tenant_id = memberships.tenant_id
        and m2.role in ('club_admin', 'club_director', 'director_of_coaching')
    )
  );

-- ============================================================
-- AUDIT EVENTS RLS
-- ============================================================

-- Platform admins can read all audit events
create policy "platform_admin_read_audit"
  on public.audit_events
  for select
  to authenticated
  using (public.is_platform_admin(auth.uid()));

-- Platform admins can insert audit events
create policy "platform_admin_insert_audit"
  on public.audit_events
  for insert
  to authenticated
  with check (public.is_platform_admin(auth.uid()));

-- Service role bypass (set via supabase client with service role key)
-- No explicit policy needed — service_role bypasses RLS by default
