-- Migration: 015_field_space_time_slots
-- Add per-space reusable time slots for assignment mode.

alter table public.training_field_spaces
  add column if not exists available_time_slots jsonb not null default '[]'::jsonb;
