-- Migration: 006_teams_and_lineup
-- Adds teams table, lineup table, and extends players with positions + birth_year

-- ============================================================
-- EXTEND PLAYERS
-- ============================================================

-- preferred positions (array of text, e.g. '{GK}', '{ST,RW}')
alter table public.players
  add column if not exists positions text[] not null default '{}';

-- birth_year extracted/overridable; defaults to year portion of date_of_birth
-- We store it separately so it can be set independently of DOB
alter table public.players
  add column if not exists birth_year smallint;

-- Backfill birth_year from existing date_of_birth
update public.players
  set birth_year = extract(year from date_of_birth)::smallint
  where date_of_birth is not null and birth_year is null;

-- ============================================================
-- TEAMS
-- ============================================================
create table if not exists public.teams (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  name           text not null,
  age_division   text,
  birth_year     smallint,          -- eligibility birth year for the team
  roster_limit   smallint not null default 16,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.teams enable row level security;

-- updated_at trigger (reuse the function from 005)
drop trigger if exists teams_set_updated_at on public.teams;
create trigger teams_set_updated_at
  before update on public.teams
  for each row execute procedure public.set_updated_at();

-- Platform admins: full access
create policy "platform_admin_all_teams"
  on public.teams for all to authenticated
  using (public.is_platform_admin(auth.uid()))
  with check (public.is_platform_admin(auth.uid()));

-- Any tenant member can read their own teams
create policy "tenant_members_read_teams"
  on public.teams for select to authenticated
  using (public.has_tenant_membership(auth.uid(), tenant_id));

-- Club admins/directors/DOC can manage teams
create policy "club_admin_manage_teams"
  on public.teams for all to authenticated
  using (
    public.has_tenant_membership(auth.uid(), tenant_id)
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = teams.tenant_id
        and m.role in ('club_admin', 'club_director', 'director_of_coaching')
    )
  )
  with check (
    public.has_tenant_membership(auth.uid(), tenant_id)
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = teams.tenant_id
        and m.role in ('club_admin', 'club_director', 'director_of_coaching')
    )
  );

-- ============================================================
-- LINEUPS
-- ============================================================
-- Stores a saved formation + slot assignments for a team
-- slots: { slotKey: playerId | null }
create table if not exists public.lineups (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  team_id     uuid not null references public.teams(id) on delete cascade,
  formation   text not null,               -- '4-3-3' | '4-4-2' | '3-5-2'
  slots       jsonb not null default '{}', -- { slotKey: player_id | null }
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- one lineup per team (upsert target)
  unique (team_id)
);

alter table public.lineups enable row level security;

drop trigger if exists lineups_set_updated_at on public.lineups;
create trigger lineups_set_updated_at
  before update on public.lineups
  for each row execute procedure public.set_updated_at();

create policy "platform_admin_all_lineups"
  on public.lineups for all to authenticated
  using (public.is_platform_admin(auth.uid()))
  with check (public.is_platform_admin(auth.uid()));

create policy "tenant_members_read_lineups"
  on public.lineups for select to authenticated
  using (public.has_tenant_membership(auth.uid(), tenant_id));

create policy "club_admin_manage_lineups"
  on public.lineups for all to authenticated
  using (
    public.has_tenant_membership(auth.uid(), tenant_id)
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = lineups.tenant_id
        and m.role in ('club_admin', 'club_director', 'director_of_coaching')
    )
  )
  with check (
    public.has_tenant_membership(auth.uid(), tenant_id)
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = lineups.tenant_id
        and m.role in ('club_admin', 'club_director', 'director_of_coaching')
    )
  );
