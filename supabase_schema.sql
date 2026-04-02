-- Tabla de categorías
create table if not exists categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  color text not null default '#6366f1',
  icon text not null default '💰',
  type text not null check (type in ('income', 'expense', 'both')),
  created_at timestamptz default now()
);

-- Insertar categorías por defecto
insert into categories (name, color, icon, type) values
  ('Salario', '#22c55e', '💼', 'income'),
  ('Freelance', '#10b981', '💻', 'income'),
  ('Inversiones', '#06b6d4', '📈', 'income'),
  ('Otros ingresos', '#84cc16', '➕', 'income'),
  ('Alimentación', '#f97316', '🛒', 'expense'),
  ('Transporte', '#3b82f6', '🚗', 'expense'),
  ('Ocio', '#a855f7', '🎮', 'expense'),
  ('Salud', '#ef4444', '💊', 'expense'),
  ('Hogar', '#f59e0b', '🏠', 'expense'),
  ('Ropa', '#ec4899', '👗', 'expense'),
  ('Restaurantes', '#fb923c', '🍽️', 'expense'),
  ('Suscripciones', '#8b5cf6', '📱', 'expense'),
  ('Educación', '#14b8a6', '📚', 'expense'),
  ('Deporte', '#f43f5e', '🏋️', 'expense'),
  ('Otros gastos', '#6b7280', '📦', 'expense');

-- Tabla de transacciones
create table if not exists transactions (
  id uuid default gen_random_uuid() primary key,
  type text not null check (type in ('income', 'expense')),
  amount numeric(10,2) not null check (amount > 0),
  description text not null,
  category_id uuid references categories(id) on delete set null,
  notes text,
  date date not null default current_date,
  created_at timestamptz default now()
);

-- Índices para consultas frecuentes
create index if not exists idx_transactions_date on transactions(date);
create index if not exists idx_transactions_type on transactions(type);
create index if not exists idx_transactions_category on transactions(category_id);

-- Habilitar Row Level Security (sin auth por ahora, acceso público con anon key)
alter table categories enable row level security;
alter table transactions enable row level security;

-- Políticas permisivas para uso personal (anon key tiene acceso total)
create policy "Allow all for anon" on categories for all using (true) with check (true);
create policy "Allow all for anon" on transactions for all using (true) with check (true);
