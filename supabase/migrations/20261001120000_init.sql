-- StatsUp — esquema inicial.
-- Rodar uma vez no Supabase: Dashboard → SQL Editor → New query → colar tudo → Run.
--
-- Modelo:
--   profiles         1 por usuário (dados do onboarding)
--   workouts         treinos (kind = 'workout') e marcas do cadastro (kind = 'baseline')
--   workout_entries  exercícios de cada treino, com o percentil calculado no app
--
-- Segurança (RLS): cada usuário só enxerga e altera as próprias linhas. A
-- publishable key do app sozinha não lê nada de ninguém.

-- ------------------------------------------------------------------ profiles
create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  name              text not null default '',
  sex               text not null check (sex in ('male', 'female')),
  birth_date        date not null,
  height_cm         numeric(5, 1) not null check (height_cm > 0),
  bodyweight_kg     numeric(5, 1) not null check (bodyweight_kg > 0),
  goal              text not null default 'hypertrophy',
  age_compare_mode  text not null default 'absolute' check (age_compare_mode in ('absolute', 'age_adjusted')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ------------------------------------------------------------------ workouts
-- id é gerado no app (funciona offline e evita duplicar ao reenviar). A chave é
-- (user_id, id): ids de usuários diferentes nunca colidem.
create table if not exists public.workouts (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id          text not null,
  kind        text not null default 'workout' check (kind in ('workout', 'baseline')),
  date        date not null,
  note        text not null default '',
  created_at  timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists workouts_user_date_idx on public.workouts (user_id, date desc);

-- ----------------------------------------------------------- workout_entries
-- A FK composta garante que o exercício pertence a um treino do MESMO usuário.
create table if not exists public.workout_entries (
  user_id            uuid not null default auth.uid(),
  workout_id         text not null,
  position           int not null,
  exercise_id        text not null,
  weight_kg          numeric(6, 2),
  reps               int,
  est_1rm            numeric(7, 2),
  percentile         numeric(5, 2) not null,
  confidence         text not null check (confidence in ('high', 'medium', 'low')),
  level              text not null,
  bodyweight_at_log  numeric(5, 1),
  primary key (user_id, workout_id, position),
  foreign key (user_id, workout_id) references public.workouts (user_id, id) on delete cascade
);

-- ------------------------------------------------------------------ updated_at
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------------ RLS
alter table public.profiles        enable row level security;
alter table public.workouts        enable row level security;
alter table public.workout_entries enable row level security;

drop policy if exists "profiles: dono" on public.profiles;
create policy "profiles: dono" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "workouts: dono" on public.workouts;
create policy "workouts: dono" on public.workouts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "workout_entries: dono" on public.workout_entries;
create policy "workout_entries: dono" on public.workout_entries
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
