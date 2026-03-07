-- Migration: 017_recruitment_module
-- Recruiting CRM + applicant tracking with historical records.

create table if not exists public.recruitment_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  name text not null,
  event_type text not null default 'tryout' check (event_type in ('tryout', 'open_session', 'interest_form', 'camp', 'other')),
  season text,
  age_division text,
  gender text check (gender in ('boys', 'girls', 'coed')),
  starts_at timestamptz,
  ends_at timestamptz,
  location text,
  is_active boolean not null default true,
  created_by uuid references public.memberships(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recruitment_registration_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  event_id uuid references public.recruitment_events(id) on delete set null,
  slug text not null unique,
  name text not null,
  season text,
  age_division text,
  gender text check (gender in ('boys', 'girls', 'coed')),
  team_id uuid references public.teams(id) on delete set null,
  starts_on date,
  ends_on date,
  is_active boolean not null default true,
  created_by uuid references public.memberships(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recruitment_prospects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  event_id uuid references public.recruitment_events(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  source_link_id uuid references public.recruitment_registration_links(id) on delete set null,
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  age_division text,
  gender text check (gender in ('boys', 'girls', 'coed')),
  parent_name text,
  parent_email text,
  parent_phone text,
  current_club text,
  current_team text,
  primary_position text,
  secondary_position text,
  grad_year integer,
  school_year text,
  recruiting_source text,
  roster_fit_tag text,
  tags text[] not null default '{}',
  notes text,
  status text not null default 'New Lead',
  archived boolean not null default false,
  archived_reason text,
  last_contact_at timestamptz,
  created_by uuid references public.memberships(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recruitment_status_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  prospect_id uuid not null references public.recruitment_prospects(id) on delete cascade,
  previous_status text,
  new_status text not null,
  change_reason text,
  changed_by uuid references public.memberships(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.recruitment_evaluations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  prospect_id uuid not null references public.recruitment_prospects(id) on delete cascade,
  event_id uuid references public.recruitment_events(id) on delete set null,
  evaluator_membership_id uuid references public.memberships(id) on delete set null,
  rating numeric(4,2),
  readiness text,
  strengths text,
  development_areas text,
  notes text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recruitment_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  age_division text,
  target_roster_size integer,
  open_positions text[] not null default '{}',
  recruiting_priority text not null default 'medium' check (recruiting_priority in ('low', 'medium', 'high', 'urgent')),
  owner_membership_id uuid references public.memberships(id) on delete set null,
  upcoming_dates date[] not null default '{}',
  notes text,
  is_active boolean not null default true,
  created_by uuid references public.memberships(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_recruitment_events_tenant on public.recruitment_events(tenant_id);
create index if not exists idx_recruitment_links_tenant on public.recruitment_registration_links(tenant_id);
create index if not exists idx_recruitment_prospects_tenant on public.recruitment_prospects(tenant_id);
create index if not exists idx_recruitment_prospects_status on public.recruitment_prospects(status);
create index if not exists idx_recruitment_prospects_age_gender on public.recruitment_prospects(age_division, gender);
create index if not exists idx_recruitment_prospects_archived on public.recruitment_prospects(archived);
create index if not exists idx_recruitment_status_history_prospect on public.recruitment_status_history(prospect_id);
create index if not exists idx_recruitment_evaluations_prospect on public.recruitment_evaluations(prospect_id);
create index if not exists idx_recruitment_plans_tenant on public.recruitment_plans(tenant_id);

alter table public.recruitment_events enable row level security;
alter table public.recruitment_registration_links enable row level security;
alter table public.recruitment_prospects enable row level security;
alter table public.recruitment_status_history enable row level security;
alter table public.recruitment_evaluations enable row level security;
alter table public.recruitment_plans enable row level security;

create policy "platform_admin_manage_recruitment_events"
  on public.recruitment_events for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.role = 'platform_admin' and m.is_active = true
    )
  );

create policy "tenant_member_read_recruitment_events"
  on public.recruitment_events for select
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.tenant_id = recruitment_events.tenant_id and m.is_active = true
    )
  );

create policy "tenant_admin_manage_recruitment_events"
  on public.recruitment_events for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = recruitment_events.tenant_id
        and m.role in ('club_admin', 'club_director', 'director_of_coaching', 'select_coach', 'academy_coach')
        and m.is_active = true
    )
  );

create policy "platform_admin_manage_recruitment_links"
  on public.recruitment_registration_links for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.role = 'platform_admin' and m.is_active = true
    )
  );

create policy "tenant_member_read_recruitment_links"
  on public.recruitment_registration_links for select
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.tenant_id = recruitment_registration_links.tenant_id and m.is_active = true
    )
  );

create policy "tenant_admin_manage_recruitment_links"
  on public.recruitment_registration_links for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = recruitment_registration_links.tenant_id
        and m.role in ('club_admin', 'club_director', 'director_of_coaching', 'select_coach', 'academy_coach')
        and m.is_active = true
    )
  );

create policy "platform_admin_manage_recruitment_prospects"
  on public.recruitment_prospects for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.role = 'platform_admin' and m.is_active = true
    )
  );

create policy "tenant_member_read_recruitment_prospects"
  on public.recruitment_prospects for select
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.tenant_id = recruitment_prospects.tenant_id and m.is_active = true
    )
  );

create policy "tenant_admin_manage_recruitment_prospects"
  on public.recruitment_prospects for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = recruitment_prospects.tenant_id
        and m.role in ('club_admin', 'club_director', 'director_of_coaching', 'select_coach', 'academy_coach')
        and m.is_active = true
    )
  );

create policy "platform_admin_manage_recruitment_status_history"
  on public.recruitment_status_history for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.role = 'platform_admin' and m.is_active = true
    )
  );

create policy "tenant_member_read_recruitment_status_history"
  on public.recruitment_status_history for select
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.tenant_id = recruitment_status_history.tenant_id and m.is_active = true
    )
  );

create policy "tenant_admin_manage_recruitment_status_history"
  on public.recruitment_status_history for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = recruitment_status_history.tenant_id
        and m.role in ('club_admin', 'club_director', 'director_of_coaching', 'select_coach', 'academy_coach')
        and m.is_active = true
    )
  );

create policy "platform_admin_manage_recruitment_evaluations"
  on public.recruitment_evaluations for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.role = 'platform_admin' and m.is_active = true
    )
  );

create policy "tenant_member_read_recruitment_evaluations"
  on public.recruitment_evaluations for select
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.tenant_id = recruitment_evaluations.tenant_id and m.is_active = true
    )
  );

create policy "tenant_admin_manage_recruitment_evaluations"
  on public.recruitment_evaluations for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = recruitment_evaluations.tenant_id
        and m.role in ('club_admin', 'club_director', 'director_of_coaching', 'select_coach', 'academy_coach')
        and m.is_active = true
    )
  );

create policy "platform_admin_manage_recruitment_plans"
  on public.recruitment_plans for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.role = 'platform_admin' and m.is_active = true
    )
  );

create policy "tenant_member_read_recruitment_plans"
  on public.recruitment_plans for select
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.tenant_id = recruitment_plans.tenant_id and m.is_active = true
    )
  );

create policy "tenant_admin_manage_recruitment_plans"
  on public.recruitment_plans for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = recruitment_plans.tenant_id
        and m.role in ('club_admin', 'club_director', 'director_of_coaching', 'select_coach', 'academy_coach')
        and m.is_active = true
    )
  );

create or replace function public.recruitment_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger recruitment_events_updated_at
  before update on public.recruitment_events
  for each row execute function public.recruitment_set_updated_at();

create trigger recruitment_registration_links_updated_at
  before update on public.recruitment_registration_links
  for each row execute function public.recruitment_set_updated_at();

create trigger recruitment_prospects_updated_at
  before update on public.recruitment_prospects
  for each row execute function public.recruitment_set_updated_at();

create trigger recruitment_evaluations_updated_at
  before update on public.recruitment_evaluations
  for each row execute function public.recruitment_set_updated_at();

create trigger recruitment_plans_updated_at
  before update on public.recruitment_plans
  for each row execute function public.recruitment_set_updated_at();
