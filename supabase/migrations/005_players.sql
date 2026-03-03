-- Migration: 005_players
-- Creates the players table for club roster management

-- ============================================================
-- PLAYERS
-- ============================================================
create table if not exists public.players (
  id                     uuid primary key default gen_random_uuid(),
  tenant_id              uuid not null references public.tenants(id) on delete cascade,
  first_name             text not null,
  last_name              text not null,
  team_assigned          text,
  age_division           text,
  date_of_birth          date,
  primary_parent_email   text,
  secondary_parent_email text,
  status                 text not null default 'active'
                           check (status in ('active', 'inactive', 'practice_only')),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table public.players enable row level security;

-- Automatically keep updated_at current
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists players_set_updated_at on public.players;
create trigger players_set_updated_at
  before update on public.players
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Platform admins: full access
create policy "platform_admin_all_players"
  on public.players
  for all
  to authenticated
  using (public.is_platform_admin(auth.uid()))
  with check (public.is_platform_admin(auth.uid()));

-- Any tenant member can read players in their tenant
create policy "tenant_members_read_players"
  on public.players
  for select
  to authenticated
  using (public.has_tenant_membership(auth.uid(), tenant_id));

-- Club admins / directors / DOC can insert, update, delete players in their tenant
create policy "club_admin_manage_players"
  on public.players
  for all
  to authenticated
  using (
    public.has_tenant_membership(auth.uid(), tenant_id)
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = players.tenant_id
        and m.role in ('club_admin', 'club_director', 'director_of_coaching')
    )
  )
  with check (
    public.has_tenant_membership(auth.uid(), tenant_id)
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = players.tenant_id
        and m.role in ('club_admin', 'club_director', 'director_of_coaching')
    )
  );
