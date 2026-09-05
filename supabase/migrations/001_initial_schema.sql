-- ============================================================
-- ES Machine Monitoring System — Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Enable UUID generation ──────────────────────────────────
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
create type machine_status as enum (
  'Incoming',
  'In Stock',
  'Recertified',
  'Demo',
  'Reserved',
  'Delivered',
  'Pullout Parts'
);

-- ============================================================
-- LOOKUP TABLES  (branches, AEs, brands, models)
-- These are the managed dropdown lists from the original app.
-- ============================================================
create table branches (
  id   serial primary key,
  code text not null unique
);

create table aes (
  id   serial primary key,
  code text not null unique
);

create table brands (
  id   serial primary key,
  name text not null unique
);

create table models (
  id   serial primary key,
  name text not null unique
);

-- seed default branches & AEs
insert into branches (code) values ('CAVITE'),('ISABELA'),('MLA'),('PANG');
insert into aes      (code) values ('DF'),('JVE');

-- ============================================================
-- ROLES
-- ============================================================
create table roles (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  label      text not null,
  -- permissions stored as jsonb, e.g.:
  -- {"edit":true,"reserve":true,"deliver":true,"unreserve":true,"manageUsers":true,"viewClient":true}
  perms      jsonb not null default '{}',
  created_at timestamptz default now()
);

-- seed default roles (mirrors DEFAULT_ROLES from the HTML)
insert into roles (key, label, perms) values
  ('inventory_accounting', 'Inventory Accounting',
   '{"edit":true,"reserve":true,"deliver":true,"unreserve":true,"manageUsers":true,"viewClient":true}'),
  ('sales_admin',   'Sales Admin',         '{"viewClient":false}'),
  ('asm',           'Area Sales Manager',  '{"viewClient":false}'),
  ('team_leader',   'Team Leader',         '{"viewClient":false}'),
  ('account_exec',  'Account Executive',   '{"viewClient":false}');

-- ============================================================
-- USER PROFILES
-- Links to Supabase auth.users via id.
-- Stores role assignment and AE visibility.
-- ============================================================
create table user_profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null unique,          -- display login name
  display_name text,
  role_key     text not null references roles(key) on delete restrict,
  ae_code      text,                          -- own AE code (for AEs)
  approved_aes text[] default '{}',           -- additional AE codes visible to this user
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ============================================================
-- MACHINES
-- ============================================================
create table machines (
  id                uuid primary key default gen_random_uuid(),
  serial_no         text,
  po_no             text,
  brand             text,
  model             text not null,
  branch            text,
  status            machine_status not null default 'In Stock',
  client_name       text,
  client_code       text,
  location          text,
  ae                text,
  reservation_date  date,
  delivery_date     date,
  dispatch_date     date,
  notes             text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- index for common filter columns
create index machines_status_idx  on machines(status);
create index machines_brand_idx   on machines(brand);
create index machines_model_idx   on machines(model);
create index machines_branch_idx  on machines(branch);
create index machines_ae_idx      on machines(ae);

-- ============================================================
-- MACHINE HISTORY  (audit log per unit)
-- ============================================================
create table machine_history (
  id         uuid primary key default gen_random_uuid(),
  machine_id uuid not null references machines(id) on delete cascade,
  event      text not null,
  actor      text,                            -- username who made the change
  created_at timestamptz default now()
);

create index machine_history_machine_idx on machine_history(machine_id);

-- ============================================================
-- TBA LIST  (client reservations not yet allotted to a unit)
-- ============================================================
create table tba_list (
  id               uuid primary key default gen_random_uuid(),
  brand            text,
  model            text not null,
  client_name      text,
  client_code      text,
  location         text,
  ae               text,
  reservation_date date,
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index tba_brand_model_idx on tba_list(brand, model);

-- ============================================================
-- REORDER POINTS  (per brand+model combination)
-- ============================================================
create table reorder_points (
  id        serial primary key,
  brand     text not null,
  model     text not null,
  quantity  int  not null default 0,
  unique(brand, model)
);

-- ============================================================
-- UPDATED_AT auto-trigger (reusable)
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger machines_updated_at
  before update on machines
  for each row execute function set_updated_at();

create trigger tba_list_updated_at
  before update on tba_list
  for each row execute function set_updated_at();

create trigger user_profiles_updated_at
  before update on user_profiles
  for each row execute function set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- machines
alter table machines          enable row level security;
alter table machine_history   enable row level security;
alter table tba_list          enable row level security;
alter table reorder_points    enable row level security;
alter table roles             enable row level security;
alter table user_profiles     enable row level security;
alter table branches          enable row level security;
alter table aes               enable row level security;
alter table brands            enable row level security;
alter table models            enable row level security;

-- Helper: get the role key of the current user
create or replace function current_user_role()
returns text language sql security definer stable as $$
  select role_key from user_profiles where id = auth.uid();
$$;

-- Helper: check a specific permission for the current user
create or replace function has_perm(perm text)
returns boolean language sql security definer stable as $$
  select coalesce(
    (select (perms->>perm)::boolean
     from roles r
     join user_profiles up on up.role_key = r.key
     where up.id = auth.uid()),
    false
  );
$$;

-- ── Lookup tables: any authenticated user can read, only manageUsers can write ──
create policy "Authenticated users can read branches"
  on branches for select to authenticated using (true);
create policy "Managers can modify branches"
  on branches for all to authenticated using (has_perm('manageUsers'));

create policy "Authenticated users can read aes"
  on aes for select to authenticated using (true);
create policy "Managers can modify aes"
  on aes for all to authenticated using (has_perm('manageUsers'));

create policy "Authenticated users can read brands"
  on brands for select to authenticated using (true);
create policy "Managers can modify brands"
  on brands for all to authenticated using (has_perm('manageUsers'));

create policy "Authenticated users can read models"
  on models for select to authenticated using (true);
create policy "Managers can modify models"
  on models for all to authenticated using (has_perm('manageUsers'));

-- ── Roles: all authenticated can read; only manageUsers can write ──
create policy "Authenticated users can read roles"
  on roles for select to authenticated using (true);
create policy "Managers can modify roles"
  on roles for all to authenticated using (has_perm('manageUsers'));

-- ── User profiles: users see their own; admins see all ──
create policy "Users can read own profile"
  on user_profiles for select to authenticated
  using (id = auth.uid() or has_perm('manageUsers'));
create policy "Managers can modify user profiles"
  on user_profiles for all to authenticated
  using (has_perm('manageUsers'));

-- ── Machines: all authenticated can read; edit perm required for writes ──
create policy "Authenticated users can read machines"
  on machines for select to authenticated using (true);
create policy "Edit perm required for insert"
  on machines for insert to authenticated with check (has_perm('edit'));
create policy "Edit perm required for update"
  on machines for update to authenticated using (has_perm('edit') or has_perm('reserve') or has_perm('deliver') or has_perm('unreserve'));
create policy "Edit perm required for delete"
  on machines for delete to authenticated using (has_perm('edit'));

-- ── Machine history: all authenticated can read; insert via trigger / app ──
create policy "Authenticated users can read history"
  on machine_history for select to authenticated using (true);
create policy "Authenticated users can insert history"
  on machine_history for insert to authenticated with check (true);

-- ── TBA list ──
create policy "Authenticated users can read tba"
  on tba_list for select to authenticated using (true);
create policy "Reserve perm required for tba writes"
  on tba_list for all to authenticated using (has_perm('reserve'));

-- ── Reorder points ──
create policy "Authenticated users can read reorder points"
  on reorder_points for select to authenticated using (true);
create policy "Edit perm required for reorder writes"
  on reorder_points for all to authenticated using (has_perm('edit'));
