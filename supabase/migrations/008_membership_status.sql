-- Migration: 008_membership_status
-- Adds is_active flag to memberships for tenant-level user deactivation.
-- Deactivated users retain their membership record (for audit history)
-- but are blocked from accessing tenant resources.

alter table public.memberships
  add column if not exists is_active boolean not null default true;

-- Index for fast active-user lookups
create index if not exists memberships_tenant_active_idx
  on public.memberships (tenant_id, is_active)
  where tenant_id is not null;
