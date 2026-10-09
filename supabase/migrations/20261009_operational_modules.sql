-- Operational modules added after the production foundation.
create table if not exists public.stocks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  name text not null, category text not null,
  quantity numeric(14,3) not null default 0,
  unit text not null default 'kg',
  minimum_quantity numeric(14,3) not null default 0,
  unit_cost numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  unique(company_id,name)
);

create table if not exists public.diagnostics (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  parcel_id uuid references public.parcels(id) on delete set null,
  disease text not null, confidence numeric(5,2) not null default 0,
  recommendation text not null default '', status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  label text not null, amount numeric(14,2) not null,
  sold_at date not null, category text not null default 'Autre',
  created_at timestamptz not null default now()
);

create index if not exists idx_stocks_company on public.stocks(company_id);
create index if not exists idx_diagnostics_company_created on public.diagnostics(company_id,created_at desc);
create index if not exists idx_sales_company_date on public.sales(company_id,sold_at desc);

do $$ declare t text; begin
  foreach t in array array['stocks','diagnostics','sales'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists "read accessible %1$s" on public.%1$I',t);
    execute format('drop policy if exists "insert accessible %1$s" on public.%1$I',t);
    execute format('drop policy if exists "update accessible %1$s" on public.%1$I',t);
    execute format('drop policy if exists "delete accessible %1$s" on public.%1$I',t);
    execute format('create policy "read accessible %1$s" on public.%1$I for select using (public.has_company_access(company_id))',t);
    execute format('create policy "insert accessible %1$s" on public.%1$I for insert with check (public.has_company_access(company_id,''write''))',t);
    execute format('create policy "update accessible %1$s" on public.%1$I for update using (public.has_company_access(company_id,''write'')) with check (public.has_company_access(company_id,''write''))',t);
    execute format('create policy "delete accessible %1$s" on public.%1$I for delete using (public.has_company_access(company_id,''admin''))',t);
    execute format('drop trigger if exists audit_%1$s on public.%1$I',t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute procedure public.audit_mutation()',t);
  end loop;
end $$;
