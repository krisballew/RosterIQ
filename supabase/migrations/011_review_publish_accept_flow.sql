-- Migration: 011_review_publish_accept_flow
-- Adds publish + player-accept workflow for player reviews.

alter table public.player_reviews
  add column if not exists published_at timestamptz,
  add column if not exists accepted_by_user_id uuid references auth.users(id) on delete set null;

alter table public.player_reviews
  drop constraint if exists player_reviews_status_check;

alter table public.player_reviews
  add constraint player_reviews_status_check
  check (status in ('draft', 'published', 'completed'));
