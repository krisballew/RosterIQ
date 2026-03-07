-- Migration: 009_team_coach_assignment
-- Adds optional coach assignment on teams.

alter table public.teams
  add column if not exists coach_membership_id uuid references public.memberships(id) on delete set null;

create index if not exists teams_coach_membership_idx
  on public.teams (coach_membership_id)
  where coach_membership_id is not null;