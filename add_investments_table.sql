-- Tabla de aportaciones a ETFs
create table if not exists investments (
  id uuid default gen_random_uuid() primary key,
  ticker text not null,          -- e.g. 'IWDA.AS'
  name text not null,            -- e.g. 'MSCI World'
  shares numeric(12,6) not null check (shares > 0),
  price_paid numeric(10,4) not null check (price_paid > 0),
  date date not null default current_date,
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_investments_ticker on investments(ticker);
create index if not exists idx_investments_date on investments(date);

alter table investments enable row level security;
create policy "Allow all for anon" on investments for all using (true) with check (true);
