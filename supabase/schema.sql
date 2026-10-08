-- AgriPilot production foundation for Supabase PostgreSQL.
create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  siret text,
  color text not null default '#173c34',
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'operator' check (role in ('owner','manager','operator','viewer')),
  created_at timestamptz not null default now()
);

create table if not exists public.user_company_access (
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  access_level text not null default 'write' check (access_level in ('read','write','admin')),
  primary key (user_id, company_id)
);

create table if not exists public.parcels (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
  name text not null, surface_ha numeric(10,2) not null check (surface_ha > 0), culture text not null,
  status text not null default 'Bon', cost_per_ha numeric(12,2) not null default 0,
  created_at timestamptz not null default now(), unique(company_id,name)
);

create table if not exists public.animals (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
  work_number text not null, national_number text, sex text, breed text, birth_date date,
  mother_number text, father_number text, birth_weight numeric(8,2), status text not null default 'Présent',
  created_at timestamptz not null default now(), unique(company_id,work_number)
);

create table if not exists public.interventions (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
  parcel_id uuid not null references public.parcels(id) on delete cascade, performed_at date not null,
  operation_type text not null, product text, dose_kg_ha numeric(12,3), nitrogen_units numeric(12,3),
  treated_area_ha numeric(10,2), cost_per_ha numeric(12,2) not null default 0,
  weather jsonb not null default '{}'::jsonb, validated_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
  name text not null, category text not null, subcategory text, email text, phone text, siret text,
  rating numeric(2,1), annual_volume numeric(14,2) not null default 0, status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
  supplier_id uuid references public.suppliers(id), supplier_name text not null, invoice_number text not null,
  amount numeric(14,2) not null, due_date date, priority text not null default 'normal',
  status text not null default 'pending', duplicate boolean not null default false,
  created_at timestamptz not null default now(), unique(company_id,invoice_number)
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
  supplier_id uuid references public.suppliers(id), need_text text not null, quantity text,
  estimated_amount numeric(14,2), status text not null default 'draft',
  validated_by uuid references public.profiles(id), created_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
  id bigint generated always as identity primary key, company_id uuid references public.companies(id),
  actor_id uuid references public.profiles(id), event_type text not null, title text not null,
  details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create index if not exists idx_parcels_company on public.parcels(company_id);
create index if not exists idx_animals_company_status on public.animals(company_id,status);
create index if not exists idx_interventions_parcel_date on public.interventions(parcel_id,performed_at desc);
create index if not exists idx_invoices_company_status on public.invoices(company_id,status);
create index if not exists idx_journal_company_created on public.journal_entries(company_id,created_at desc);

create or replace function public.has_company_access(target uuid, required text default 'read')
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.user_company_access a where a.user_id=auth.uid() and a.company_id=target
    and case required when 'admin' then a.access_level='admin' when 'write' then a.access_level in ('write','admin') else true end);
$$;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.user_company_access enable row level security;
alter table public.parcels enable row level security;
alter table public.animals enable row level security;
alter table public.interventions enable row level security;
alter table public.suppliers enable row level security;
alter table public.invoices enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.journal_entries enable row level security;

create policy "read own profile" on public.profiles for select using (id=auth.uid());
create policy "read own access" on public.user_company_access for select using (user_id=auth.uid());
create policy "read accessible companies" on public.companies for select using (public.has_company_access(id));

do $$ declare t text; begin
  foreach t in array array['parcels','animals','interventions','suppliers','invoices','purchase_orders','journal_entries'] loop
    execute format('create policy "read accessible %1$s" on public.%1$I for select using (public.has_company_access(company_id))',t);
    execute format('create policy "insert accessible %1$s" on public.%1$I for insert with check (public.has_company_access(company_id,''write''))',t);
    execute format('create policy "update accessible %1$s" on public.%1$I for update using (public.has_company_access(company_id,''write'')) with check (public.has_company_access(company_id,''write''))',t);
    execute format('create policy "delete accessible %1$s" on public.%1$I for delete using (public.has_company_access(company_id,''admin''))',t);
  end loop;
end $$;

insert into public.companies(name,color) values
  ('EARL Artemis','#c67c4e'),
  ('SCEA Vatan et fils','#e3aa00'),
  ('SCEA des Bonnédanes','#4d7c66')
on conflict(name) do nothing;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,full_name,role)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),
    case when not exists(select 1 from public.user_company_access) then 'owner' else 'operator' end);
  if not exists(select 1 from public.user_company_access) then
    insert into public.user_company_access(user_id,company_id,access_level)
    select new.id,id,'admin' from public.companies;
  end if;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.audit_mutation() returns trigger language plpgsql security definer set search_path=public as $$
declare row_data jsonb; cid uuid;
begin row_data=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end; cid=(row_data->>'company_id')::uuid;
  insert into public.journal_entries(company_id,actor_id,event_type,title,details)
  values(cid,auth.uid(),lower(tg_op)||'_'||tg_table_name,tg_op||' '||tg_table_name,jsonb_build_object('record_id',row_data->>'id','data',row_data));
  return case when tg_op='DELETE' then old else new end;
end; $$;
do $$ declare t text; begin foreach t in array array['parcels','animals','interventions','suppliers','invoices','purchase_orders'] loop
  execute format('drop trigger if exists audit_%1$s on public.%1$I',t);
  execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute procedure public.audit_mutation()',t);
end loop; end $$;

-- Run after the first user signs up, replacing the email:
-- insert into companies(name,siret,color) values ('EARL Artemis',null,'#c67c4e'),('SCEA Vatan et fils',null,'#e3aa00'),('SCEA des Bonnédanes',null,'#4d7c66');
-- update profiles set role='owner' where id=(select id from auth.users where email='OWNER_EMAIL');
-- insert into user_company_access(user_id,company_id,access_level) select (select id from auth.users where email='OWNER_EMAIL'),id,'admin' from companies;
