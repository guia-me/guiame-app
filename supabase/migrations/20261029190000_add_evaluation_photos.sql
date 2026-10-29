alter table public.evaluaciones
  add column if not exists fotos text[] not null default '{}'::text[];
