-- Migration: 007_lineup_names_notes
-- Allow multiple named lineups per team; add notes field

-- Add name column (coach-given name for the lineup, e.g. "Home vs Rivals")
alter table public.lineups
  add column if not exists name text not null default 'Untitled Lineup';

-- Add notes column (coach notes about the lineup)
alter table public.lineups
  add column if not exists notes text;

-- Drop the old one-lineup-per-team constraint so coaches can save multiple lineups
alter table public.lineups
  drop constraint if exists lineups_team_id_key;
