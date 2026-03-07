-- Migration: 014_training_field_assignment_module
-- Interactive map-based training field setup + assignment scheduling.

create table if not exists public.training_complexes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  facility text,
  notes text,
  is_active boolean not null default true,
  created_by uuid references public.memberships(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table if not exists public.training_field_maps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  complex_id uuid not null references public.training_complexes(id) on delete cascade,
  name text not null,
  background_image_url text not null,
  canvas_width integer not null default 1200,
  canvas_height integer not null default 800,
  is_active boolean not null default true,
  created_by uuid references public.memberships(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_field_spaces (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  map_id uuid not null references public.training_field_maps(id) on delete cascade,
  name text not null,
  field_type text,
  age_suitability text,
  format text,
  availability_status text not null default 'available' check (availability_status in ('available', 'maintenance', 'closed')),
  notes text,
  x numeric not null default 100,
  y numeric not null default 100,
  width numeric not null default 140,
  height numeric not null default 90,
  rotation numeric not null default 0,
  fill_color text not null default 'rgba(34, 197, 94, 0.15)',
  border_color text not null default '#16a34a',
  border_style text not null default 'solid' check (border_style in ('solid', 'dashed', 'dotted')),
  created_by uuid references public.memberships(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_field_space_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  map_id uuid not null references public.training_field_maps(id) on delete cascade,
  field_space_id uuid not null references public.training_field_spaces(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  coach_membership_id uuid references public.memberships(id) on delete set null,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled', 'completed')),
  notes text,
  published_at timestamptz,
  published_by uuid references public.memberships(id) on delete set null,
  created_by uuid references public.memberships(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_at < end_at)
);

create index if not exists idx_training_complexes_tenant on public.training_complexes(tenant_id);
create index if not exists idx_training_field_maps_tenant on public.training_field_maps(tenant_id);
create index if not exists idx_training_field_maps_complex on public.training_field_maps(complex_id);
create index if not exists idx_training_field_spaces_tenant on public.training_field_spaces(tenant_id);
create index if not exists idx_training_field_spaces_map on public.training_field_spaces(map_id);
create index if not exists idx_training_field_assignments_tenant on public.training_field_space_assignments(tenant_id);
create index if not exists idx_training_field_assignments_map on public.training_field_space_assignments(map_id);
create index if not exists idx_training_field_assignments_field_space on public.training_field_space_assignments(field_space_id);
create index if not exists idx_training_field_assignments_time on public.training_field_space_assignments(start_at, end_at);

alter table public.training_complexes enable row level security;
alter table public.training_field_maps enable row level security;
alter table public.training_field_spaces enable row level security;
alter table public.training_field_space_assignments enable row level security;

create policy "platform_admin_manage_training_complexes"
  on public.training_complexes for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.role = 'platform_admin'
        and m.is_active = true
    )
  );

create policy "tenant_admin_manage_training_complexes"
  on public.training_complexes for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = training_complexes.tenant_id
        and m.role in ('club_admin', 'club_director', 'director_of_coaching')
        and m.is_active = true
    )
  );

create policy "tenant_members_read_training_complexes"
  on public.training_complexes for select
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = training_complexes.tenant_id
        and m.is_active = true
    )
  );

create policy "platform_admin_manage_training_field_maps"
  on public.training_field_maps for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.role = 'platform_admin'
        and m.is_active = true
    )
  );

create policy "tenant_admin_manage_training_field_maps"
  on public.training_field_maps for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = training_field_maps.tenant_id
        and m.role in ('club_admin', 'club_director', 'director_of_coaching')
        and m.is_active = true
    )
  );

create policy "tenant_members_read_training_field_maps"
  on public.training_field_maps for select
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = training_field_maps.tenant_id
        and m.is_active = true
    )
  );

create policy "platform_admin_manage_training_field_spaces"
  on public.training_field_spaces for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.role = 'platform_admin'
        and m.is_active = true
    )
  );

create policy "tenant_admin_manage_training_field_spaces"
  on public.training_field_spaces for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = training_field_spaces.tenant_id
        and m.role in ('club_admin', 'club_director', 'director_of_coaching')
        and m.is_active = true
    )
  );

create policy "tenant_members_read_training_field_spaces"
  on public.training_field_spaces for select
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = training_field_spaces.tenant_id
        and m.is_active = true
    )
  );

create policy "platform_admin_manage_training_field_assignments"
  on public.training_field_space_assignments for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.role = 'platform_admin'
        and m.is_active = true
    )
  );

create policy "tenant_admin_manage_training_field_assignments"
  on public.training_field_space_assignments for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = training_field_space_assignments.tenant_id
        and m.role in ('club_admin', 'club_director', 'director_of_coaching', 'select_coach', 'academy_coach')
        and m.is_active = true
    )
  );

create policy "tenant_members_read_training_field_assignments"
  on public.training_field_space_assignments for select
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = training_field_space_assignments.tenant_id
        and m.is_active = true
    )
  );

create or replace function public.update_training_complexes_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.update_training_field_maps_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.update_training_field_spaces_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.update_training_field_space_assignments_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger training_complexes_updated_at
  before update on public.training_complexes
  for each row execute function public.update_training_complexes_updated_at();

create trigger training_field_maps_updated_at
  before update on public.training_field_maps
  for each row execute function public.update_training_field_maps_updated_at();

create trigger training_field_spaces_updated_at
  before update on public.training_field_spaces
  for each row execute function public.update_training_field_spaces_updated_at();

create trigger training_field_space_assignments_updated_at
  before update on public.training_field_space_assignments
  for each row execute function public.update_training_field_space_assignments_updated_at();
