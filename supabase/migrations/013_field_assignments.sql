-- Migration: 013_field_assignments
-- Field maps, labeled fields, availability windows, and team field assignments.

create table if not exists public.field_maps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  image_url text not null,
  is_active boolean not null default true,
  created_by uuid references public.memberships(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fields (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  field_map_id uuid references public.field_maps(id) on delete set null,
  label text not null,
  description text,
  is_active boolean not null default true,
  created_by uuid references public.memberships(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, label)
);

create table if not exists public.field_availability (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  field_id uuid not null references public.fields(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  open_time time not null,
  close_time time not null,
  is_active boolean not null default true,
  created_by uuid references public.memberships(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (open_time < close_time)
);

create table if not exists public.field_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  field_id uuid not null references public.fields(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  notes text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  published_by uuid references public.memberships(id) on delete set null,
  created_by uuid references public.memberships(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_time < end_time)
);

create index if not exists idx_field_maps_tenant on public.field_maps(tenant_id);
create index if not exists idx_fields_tenant on public.fields(tenant_id);
create index if not exists idx_fields_map on public.fields(field_map_id);
create index if not exists idx_field_availability_tenant on public.field_availability(tenant_id);
create index if not exists idx_field_availability_field_day on public.field_availability(field_id, day_of_week);
create index if not exists idx_field_assignments_tenant on public.field_assignments(tenant_id);
create index if not exists idx_field_assignments_team on public.field_assignments(team_id);
create index if not exists idx_field_assignments_field_day on public.field_assignments(field_id, day_of_week);
create index if not exists idx_field_assignments_status on public.field_assignments(status);

alter table public.field_maps enable row level security;
alter table public.fields enable row level security;
alter table public.field_availability enable row level security;
alter table public.field_assignments enable row level security;

create policy "platform_admin_manage_field_maps"
  on public.field_maps for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.role = 'platform_admin'
        and m.is_active = true
    )
  );

create policy "tenant_admin_manage_field_maps"
  on public.field_maps for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = field_maps.tenant_id
        and m.role in ('club_admin', 'club_director', 'director_of_coaching')
        and m.is_active = true
    )
  );

create policy "tenant_members_read_field_maps"
  on public.field_maps for select
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = field_maps.tenant_id
        and m.is_active = true
    )
  );

create policy "platform_admin_manage_fields"
  on public.fields for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.role = 'platform_admin'
        and m.is_active = true
    )
  );

create policy "tenant_admin_manage_fields"
  on public.fields for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = fields.tenant_id
        and m.role in ('club_admin', 'club_director', 'director_of_coaching')
        and m.is_active = true
    )
  );

create policy "tenant_members_read_fields"
  on public.fields for select
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = fields.tenant_id
        and m.is_active = true
    )
  );

create policy "platform_admin_manage_field_availability"
  on public.field_availability for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.role = 'platform_admin'
        and m.is_active = true
    )
  );

create policy "tenant_admin_manage_field_availability"
  on public.field_availability for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = field_availability.tenant_id
        and m.role in ('club_admin', 'club_director', 'director_of_coaching')
        and m.is_active = true
    )
  );

create policy "tenant_members_read_field_availability"
  on public.field_availability for select
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = field_availability.tenant_id
        and m.is_active = true
    )
  );

create policy "platform_admin_manage_field_assignments"
  on public.field_assignments for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.role = 'platform_admin'
        and m.is_active = true
    )
  );

create policy "tenant_admin_manage_field_assignments"
  on public.field_assignments for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = field_assignments.tenant_id
        and m.role in ('club_admin', 'club_director', 'director_of_coaching')
        and m.is_active = true
    )
  );

create policy "coaches_read_published_field_assignments"
  on public.field_assignments for select
  using (
    status = 'published'
    and exists (
      select 1
      from public.memberships coach_m
      join public.teams t on t.coach_membership_id = coach_m.id
      where coach_m.user_id = auth.uid()
        and coach_m.is_active = true
        and t.id = field_assignments.team_id
    )
  );

create policy "tenant_members_read_field_assignments"
  on public.field_assignments for select
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = field_assignments.tenant_id
        and m.is_active = true
    )
  );

create or replace function public.update_field_maps_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.update_fields_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.update_field_availability_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.update_field_assignments_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger field_maps_updated_at
  before update on public.field_maps
  for each row execute function public.update_field_maps_updated_at();

create trigger fields_updated_at
  before update on public.fields
  for each row execute function public.update_fields_updated_at();

create trigger field_availability_updated_at
  before update on public.field_availability
  for each row execute function public.update_field_availability_updated_at();

create trigger field_assignments_updated_at
  before update on public.field_assignments
  for each row execute function public.update_field_assignments_updated_at();
