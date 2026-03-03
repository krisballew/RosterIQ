-- Migration: 004_fix_rls_recursion
-- Fixes infinite recursion in RLS policies on the memberships table.
--
-- Both "platform_admin_all_memberships" and "club_admin_read_tenant_memberships"
-- called is_platform_admin() / has_tenant_membership(), which in turn query
-- the memberships table — causing infinite recursion.
--
-- Fix: drop the two recursive policies. They are not needed because:
--   - Platform admins read their own membership via read_own_memberships (user_id = auth.uid())
--   - All privileged cross-user membership reads use the service-role admin client (bypasses RLS)

DROP POLICY IF EXISTS "platform_admin_all_memberships" ON public.memberships;
DROP POLICY IF EXISTS "club_admin_read_tenant_memberships" ON public.memberships;
