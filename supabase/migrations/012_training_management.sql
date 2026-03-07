-- Training Management System
-- Provides a club-wide learning and development hub for players and coaches

-- Training Categories (hierarchical organization)
create table if not exists public.training_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  parent_category_id uuid references public.training_categories(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Training Content (videos, documents, lessons)
create table if not exists public.training_content (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  
  -- Content metadata
  title text not null,
  description text,
  content_type text not null check (content_type in ('video', 'document', 'lesson', 'article')),
  
  -- Target audience
  audience text not null check (audience in ('player', 'coach', 'both')),
  
  -- Age and skill filters
  min_age_division text check (min_age_division in ('U6', 'U7', 'U8', 'U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19')),
  max_age_division text check (max_age_division in ('U6', 'U7', 'U8', 'U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19')),
  gender_filter text check (gender_filter in ('boys', 'girls', 'both')),
  skill_level text check (skill_level in ('beginner', 'intermediate', 'advanced', 'all')),
  
  -- Content storage
  video_url text,
  document_url text,
  thumbnail_url text,
  duration_minutes integer,
  
  -- Rich content
  content_body text, -- For lessons/articles, can contain markdown
  
  -- Organization
  category_id uuid references public.training_categories(id) on delete set null,
  tags text[] default '{}',
  
  -- Status and access
  is_published boolean not null default false,
  is_featured boolean not null default false,
  view_count integer not null default 0,
  
  -- Metadata
  created_by uuid references public.memberships(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Training Assignments (coaches assign content to players/teams)
create table if not exists public.training_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  content_id uuid not null references public.training_content(id) on delete cascade,
  
  -- Assignment source
  assigned_by uuid not null references public.memberships(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  
  -- Assignment target (can be individual player, team, or age group)
  player_id uuid references public.players(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  
  -- Optional messaging
  assignment_note text,
  due_date timestamptz,
  
  -- Status
  is_required boolean not null default true, -- Required vs recommended
  
  created_at timestamptz not null default now(),
  
  -- Ensure at least one target is specified
  constraint training_assignments_target_check check (
    (player_id is not null and team_id is null) or
    (player_id is null and team_id is not null)
  )
);

-- Training Progress (track player viewing and completion)
create table if not exists public.training_progress (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  content_id uuid not null references public.training_content(id) on delete cascade,
  membership_id uuid not null references public.memberships(id) on delete cascade,
  
  -- Progress tracking
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  view_count integer not null default 0,
  completion_percentage integer not null default 0 check (completion_percentage >= 0 and completion_percentage <= 100),
  is_completed boolean not null default false,
  completed_at timestamptz,
  
  -- Feedback (optional)
  rating integer check (rating >= 1 and rating <= 5),
  feedback_text text,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- One progress record per person per content
  unique(content_id, membership_id)
);

-- Create indexes for performance
create index if not exists idx_training_categories_tenant on public.training_categories(tenant_id);
create index if not exists idx_training_categories_parent on public.training_categories(parent_category_id);
create index if not exists idx_training_content_tenant on public.training_content(tenant_id);
create index if not exists idx_training_content_category on public.training_content(category_id);
create index if not exists idx_training_content_audience on public.training_content(audience);
create index if not exists idx_training_content_published on public.training_content(is_published);
create index if not exists idx_training_assignments_tenant on public.training_assignments(tenant_id);
create index if not exists idx_training_assignments_content on public.training_assignments(content_id);
create index if not exists idx_training_assignments_player on public.training_assignments(player_id);
create index if not exists idx_training_assignments_team on public.training_assignments(team_id);
create index if not exists idx_training_progress_content on public.training_progress(content_id);
create index if not exists idx_training_progress_membership on public.training_progress(membership_id);
create index if not exists idx_training_progress_tenant on public.training_progress(tenant_id);

-- Enable Row Level Security
alter table public.training_categories enable row level security;
alter table public.training_content enable row level security;
alter table public.training_assignments enable row level security;
alter table public.training_progress enable row level security;

-- RLS Policies for training_categories
create policy "Platform admins can manage all categories"
  on public.training_categories for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.role = 'platform_admin'
        and m.is_active = true
    )
  );

create policy "Club leadership can manage their tenant's categories"
  on public.training_categories for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = training_categories.tenant_id
        and m.role in ('club_admin', 'director_of_coaching', 'club_director')
        and m.is_active = true
    )
  );

create policy "Everyone in tenant can view categories"
  on public.training_categories for select
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = training_categories.tenant_id
        and m.is_active = true
    )
  );

-- RLS Policies for training_content
create policy "Platform admins can manage all content"
  on public.training_content for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.role = 'platform_admin'
        and m.is_active = true
    )
  );

create policy "Club leadership can manage their tenant's content"
  on public.training_content for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = training_content.tenant_id
        and m.role in ('club_admin', 'director_of_coaching', 'club_director')
        and m.is_active = true
    )
  );

create policy "Players can view published player content in their tenant"
  on public.training_content for select
  using (
    training_content.is_published = true
    and training_content.audience in ('player', 'both')
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = training_content.tenant_id
        and m.role = 'player'
        and m.is_active = true
    )
  );

create policy "Coaches can view published content in their tenant"
  on public.training_content for select
  using (
    training_content.is_published = true
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = training_content.tenant_id
        and m.role in ('select_coach', 'academy_coach', 'director_of_coaching', 'club_admin', 'club_director')
        and m.is_active = true
    )
  );

-- RLS Policies for training_assignments
create policy "Platform admins can manage all assignments"
  on public.training_assignments for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.role = 'platform_admin'
        and m.is_active = true
    )
  );

create policy "Club leadership can manage their tenant's assignments"
  on public.training_assignments for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = training_assignments.tenant_id
        and m.role in ('club_admin', 'director_of_coaching', 'club_director')
        and m.is_active = true
    )
  );

create policy "Coaches can create and view assignments for their teams"
  on public.training_assignments for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = training_assignments.tenant_id
        and m.role in ('select_coach', 'academy_coach', 'director_of_coaching')
        and m.is_active = true
    )
  );

create policy "Players can view their own assignments"
  on public.training_assignments for select
  using (
    exists (
      select 1 from public.memberships m
      join public.players p on p.membership_id = m.id
      where m.user_id = auth.uid()
        and p.id = training_assignments.player_id
        and m.is_active = true
    )
    or exists (
      select 1 from public.memberships m
      join public.players p on p.membership_id = m.id
      join public.team_players tp on tp.player_id = p.id
      where m.user_id = auth.uid()
        and tp.team_id = training_assignments.team_id
        and m.is_active = true
    )
  );

-- RLS Policies for training_progress
create policy "Platform admins can view all progress"
  on public.training_progress for select
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.role = 'platform_admin'
        and m.is_active = true
    )
  );

create policy "Club leadership can view their tenant's progress"
  on public.training_progress for select
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = training_progress.tenant_id
        and m.role in ('club_admin', 'director_of_coaching', 'club_director')
        and m.is_active = true
    )
  );

create policy "Coaches can view progress for their assigned players"
  on public.training_progress for select
  using (
    exists (
      select 1 from public.memberships coach_m
      join public.teams t on t.coach_membership_id = coach_m.id
      join public.team_players tp on tp.team_id = t.id
      join public.players p on p.id = tp.player_id
      where coach_m.user_id = auth.uid()
        and p.membership_id = training_progress.membership_id
        and coach_m.is_active = true
    )
  );

create policy "Users can manage their own progress"
  on public.training_progress for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.id = training_progress.membership_id
        and m.is_active = true
    )
  );

-- Functions for updated_at triggers
create or replace function public.update_training_categories_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.update_training_content_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.update_training_progress_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create triggers
create trigger training_categories_updated_at
  before update on public.training_categories
  for each row execute function public.update_training_categories_updated_at();

create trigger training_content_updated_at
  before update on public.training_content
  for each row execute function public.update_training_content_updated_at();

create trigger training_progress_updated_at
  before update on public.training_progress
  for each row execute function public.update_training_progress_updated_at();
