-- Migration: 010_player_reviews
-- Adds review periods and seasonal individual player reviews (IDP workflow).

-- ============================================================
-- REVIEW PERIODS
-- ============================================================
create table if not exists public.review_periods (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  season       text not null check (season in ('fall', 'spring')),
  season_year  smallint not null,
  title        text not null,
  due_date     date not null,
  is_active    boolean not null default true,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (tenant_id, season, season_year)
);

alter table public.review_periods enable row level security;

drop trigger if exists review_periods_set_updated_at on public.review_periods;
create trigger review_periods_set_updated_at
  before update on public.review_periods
  for each row execute procedure public.set_updated_at();

create policy "platform_admin_all_review_periods"
  on public.review_periods for all to authenticated
  using (public.is_platform_admin(auth.uid()))
  with check (public.is_platform_admin(auth.uid()));

create policy "tenant_members_read_review_periods"
  on public.review_periods for select to authenticated
  using (public.has_tenant_membership(auth.uid(), tenant_id));

create policy "club_admin_manage_review_periods"
  on public.review_periods for all to authenticated
  using (
    public.has_tenant_membership(auth.uid(), tenant_id)
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = review_periods.tenant_id
        and m.role in ('club_admin', 'club_director', 'director_of_coaching')
    )
  )
  with check (
    public.has_tenant_membership(auth.uid(), tenant_id)
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = review_periods.tenant_id
        and m.role in ('club_admin', 'club_director', 'director_of_coaching')
    )
  );

create index if not exists review_periods_tenant_due_idx
  on public.review_periods (tenant_id, due_date);

-- ============================================================
-- PLAYER REVIEWS (IDP)
-- ============================================================
create table if not exists public.player_reviews (
  id                     uuid primary key default gen_random_uuid(),
  tenant_id              uuid not null references public.tenants(id) on delete cascade,
  player_id              uuid not null references public.players(id) on delete cascade,
  team_id                uuid references public.teams(id) on delete set null,
  review_period_id       uuid not null references public.review_periods(id) on delete cascade,
  reviewer_membership_id uuid references public.memberships(id) on delete set null,
  status                 text not null default 'draft' check (status in ('draft', 'completed')),
  ratings                jsonb not null default '{}'::jsonb,
  key_strengths          text not null default '',
  growth_areas           text not null default '',
  coach_notes            text not null default '',
  shared_at              timestamptz,
  completed_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (review_period_id, player_id)
);

alter table public.player_reviews enable row level security;

drop trigger if exists player_reviews_set_updated_at on public.player_reviews;
create trigger player_reviews_set_updated_at
  before update on public.player_reviews
  for each row execute procedure public.set_updated_at();

create policy "platform_admin_all_player_reviews"
  on public.player_reviews for all to authenticated
  using (public.is_platform_admin(auth.uid()))
  with check (public.is_platform_admin(auth.uid()));

create policy "club_admin_manage_player_reviews"
  on public.player_reviews for all to authenticated
  using (
    public.has_tenant_membership(auth.uid(), tenant_id)
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = player_reviews.tenant_id
        and m.role in ('club_admin', 'club_director', 'director_of_coaching')
    )
  )
  with check (
    public.has_tenant_membership(auth.uid(), tenant_id)
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = player_reviews.tenant_id
        and m.role in ('club_admin', 'club_director', 'director_of_coaching')
    )
  );

create policy "assigned_coach_manage_player_reviews"
  on public.player_reviews for all to authenticated
  using (
    public.has_tenant_membership(auth.uid(), tenant_id)
    and exists (
      select 1
      from public.memberships me
      join public.teams t
        on t.tenant_id = player_reviews.tenant_id
       and t.coach_membership_id = me.id
      join public.players p
        on p.id = player_reviews.player_id
       and p.tenant_id = player_reviews.tenant_id
       and p.team_assigned = t.name
      where me.user_id = auth.uid()
        and me.role in ('select_coach', 'academy_coach')
        and coalesce(me.is_active, true) = true
    )
  )
  with check (
    public.has_tenant_membership(auth.uid(), tenant_id)
    and exists (
      select 1
      from public.memberships me
      join public.teams t
        on t.tenant_id = player_reviews.tenant_id
       and t.coach_membership_id = me.id
      join public.players p
        on p.id = player_reviews.player_id
       and p.tenant_id = player_reviews.tenant_id
       and p.team_assigned = t.name
      where me.user_id = auth.uid()
        and me.role in ('select_coach', 'academy_coach')
        and coalesce(me.is_active, true) = true
    )
  );

create index if not exists player_reviews_tenant_period_idx
  on public.player_reviews (tenant_id, review_period_id);

create index if not exists player_reviews_player_idx
  on public.player_reviews (player_id);