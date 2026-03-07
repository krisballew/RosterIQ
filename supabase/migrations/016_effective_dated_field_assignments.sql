-- Migration: 016_effective_dated_field_assignments
-- Add effective-dated assignment metadata for slot-based recurring coverage.

alter table public.training_field_space_assignments
  add column if not exists slot_id text,
  add column if not exists slot_name text,
  add column if not exists slot_start_time text,
  add column if not exists slot_end_time text,
  add column if not exists effective_start_date date,
  add column if not exists effective_end_date date;

create index if not exists idx_training_field_assignments_effective_dates
  on public.training_field_space_assignments(effective_start_date, effective_end_date);
