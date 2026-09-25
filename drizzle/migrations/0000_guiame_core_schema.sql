-- GUIA·ME core schema
create type public.estado_info as enum ('verificado','comunidad','demo','pendiente');
create type public.tri_respuesta as enum ('si','no','tal_vez');

create table public.paises (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  codigo text not null unique,
  created_at timestamptz not null default now()
);
grant select on public.paises to anon, authenticated;
grant all on public.paises to service_role;
alter table public.paises enable row level security;
create policy "paises publicas" on public.paises for select to anon, authenticated using (true);

create table public.ciudades (
  id uuid primary key default gen_random_uuid(),
  pais_id uuid not null references public.paises(id) on delete cascade,
  nombre text not null,
  created_at timestamptz not null default now(),
  unique (pais_id, nombre)
);
create index ciudades_pais_idx on public.ciudades(pais_id);
grant select on public.ciudades to anon, authenticated;
grant all on public.ciudades to service_role;
alter table public.ciudades enable row level security;
create policy "ciudades publicas" on public.ciudades for select to anon, authenticated using (true);

create table public.zonas (
  id uuid primary key default gen_random_uuid(),
  ciudad_id uuid not null references public.ciudades(id) on delete cascade,
  nombre text not null,
  created_at timestamptz not null default now(),
  unique (ciudad_id, nombre)
);
create index zonas_ciudad_idx on public.zonas(ciudad_id);
grant select on public.zonas to anon, authenticated;
grant all on public.zonas to service_role;
alter table public.zonas enable row level security;
create policy "zonas publicas" on public.zonas for select to anon, authenticated using (true);

create table public.restaurantes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  pais_id uuid not null references public.paises(id),
  ciudad_id uuid not null references public.ciudades(id),
  zona_id uuid not null references public.zonas(id),
  direccion text,
  cocina text[] not null default '{}',
  precio_min integer,
  precio_max integer,
  ambiente text[] not null default '{}',
  contextos text[] not null default '{}',
  lat double precision,
  lng double precision,
  telefono text,
  web text,
  horarios text,
  capacidad_max integer,
  imagen_url text,
  fuente text,
  estado estado_info not null default 'pendiente',
  food_avg numeric(4,1),
  decor_avg numeric(4,1),
  service_avg numeric(4,1),
  num_evaluaciones integer not null default 0,
  contexto_scores jsonb not null default '{}'::jsonb,
  pct_volveria integer,
  pct_recomendaria integer,
  created_at timestamptz not null default now()
);
create index restaurantes_geo_idx on public.restaurantes(pais_id, ciudad_id, zona_id);
create index restaurantes_coords_idx on public.restaurantes(lat, lng);
grant select, insert on public.restaurantes to anon, authenticated;
grant all on public.restaurantes to service_role;
alter table public.restaurantes enable row level security;
create policy "restaurantes publicos" on public.restaurantes for select to anon, authenticated using (true);
create policy "comunidad agrega pendientes" on public.restaurantes for insert to anon, authenticated with check (estado = 'pendiente');

-- Fuerza estado pendiente y limpia metricas en inserts de comunidad
create or replace function public.force_restaurante_pendiente()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if current_setting('role', true) is distinct from 'service_role' then
    new.estado := 'pendiente';
    new.food_avg := null; new.decor_avg := null; new.service_avg := null;
    new.num_evaluaciones := 0; new.contexto_scores := '{}'::jsonb;
    new.pct_volveria := null; new.pct_recomendaria := null;
  end if;
  return new;
end;
$$;
create trigger trg_force_pendiente before insert on public.restaurantes
for each row execute function public.force_restaurante_pendiente();

create table public.evaluaciones (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  anon_id text not null,
  food smallint not null check (food between 0 and 30),
  decor smallint not null check (decor between 0 and 30),
  service smallint not null check (service between 0 and 30),
  ambiente text,
  con_quien text,
  personas text,
  presupuesto text,
  volveria tri_respuesta,
  recomendaria boolean,
  comentario text,
  plato text,
  created_at timestamptz not null default now()
);
create index evaluaciones_rest_idx on public.evaluaciones(restaurante_id);
grant select, insert on public.evaluaciones to anon, authenticated;
grant all on public.evaluaciones to service_role;
alter table public.evaluaciones enable row level security;
create policy "evaluaciones publicas" on public.evaluaciones for select to anon, authenticated using (true);
create policy "comunidad evalua" on public.evaluaciones for insert to anon, authenticated with check (true);

create table public.favoritos (
  id uuid primary key default gen_random_uuid(),
  anon_id text not null,
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (anon_id, restaurante_id)
);
create index favoritos_anon_idx on public.favoritos(anon_id);
grant select, insert, delete on public.favoritos to anon, authenticated;
grant all on public.favoritos to service_role;
alter table public.favoritos enable row level security;
create policy "favoritos lectura" on public.favoritos for select to anon, authenticated using (true);
create policy "favoritos insert" on public.favoritos for insert to anon, authenticated with check (true);
create policy "favoritos delete" on public.favoritos for delete to anon, authenticated using (true);

create table public.aportes_ficha (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id) on delete cascade,
  anon_id text not null,
  tipo text not null,
  valor text not null,
  comentario text,
  created_at timestamptz not null default now()
);
create index aportes_ficha_rest_idx on public.aportes_ficha(restaurante_id);
grant select, insert on public.aportes_ficha to anon, authenticated;
grant all on public.aportes_ficha to service_role;
alter table public.aportes_ficha enable row level security;
create policy "aportes ficha lectura" on public.aportes_ficha for select to anon, authenticated using (true);
create policy "aportes ficha insert" on public.aportes_ficha for insert to anon, authenticated with check (true);

create table public.aportes_restaurantes (
  id uuid primary key default gen_random_uuid(),
  anon_id text not null,
  restaurante_id uuid references public.restaurantes(id) on delete set null,
  payload jsonb not null,
  estado text not null default 'pendiente',
  created_at timestamptz not null default now()
);
grant select, insert on public.aportes_restaurantes to anon, authenticated;
grant all on public.aportes_restaurantes to service_role;
alter table public.aportes_restaurantes enable row level security;
create policy "aportes rest lectura" on public.aportes_restaurantes for select to anon, authenticated using (true);
create policy "aportes rest insert" on public.aportes_restaurantes for insert to anon, authenticated with check (true);

-- Recalculo automatico de metricas de comunidad
create or replace function public.recalcular_restaurante()
returns trigger language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  rid := coalesce(new.restaurante_id, old.restaurante_id);
  update public.restaurantes r set
    food_avg = s.food_avg,
    decor_avg = s.decor_avg,
    service_avg = s.service_avg,
    num_evaluaciones = s.total,
    pct_volveria = s.pct_volveria,
    pct_recomendaria = s.pct_recomendaria,
    contexto_scores = s.ctx,
    estado = case when r.estado = 'demo' then 'demo'::estado_info
                  when s.total > 0 then 'comunidad'::estado_info else r.estado end
  from (
    select
      round(avg(food)::numeric, 1) as food_avg,
      round(avg(decor)::numeric, 1) as decor_avg,
      round(avg(service)::numeric, 1) as service_avg,
      count(*)::int as total,
      round(100.0 * count(*) filter (where volveria = 'si') / greatest(count(*), 1))::int as pct_volveria,
      round(100.0 * count(*) filter (where recomendaria) / greatest(count(*), 1))::int as pct_recomendaria,
      coalesce(jsonb_object_agg(con_quien, ctx_score) filter (where con_quien is not null), '{}'::jsonb) as ctx
    from (
      select e.*, (
        select round(avg((e2.food + e2.decor + e2.service) / 90.0 * 100))
        from public.evaluaciones e2
        where e2.restaurante_id = e.restaurante_id and e2.con_quien = e.con_quien
      ) as ctx_score
      from public.evaluaciones e where e.restaurante_id = rid
    ) q
  ) s
  where r.id = rid;
  return null;
end;
$$;
create trigger trg_recalcular after insert or update or delete on public.evaluaciones
for each row execute function public.recalcular_restaurante();