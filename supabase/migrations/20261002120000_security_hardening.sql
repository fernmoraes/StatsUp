-- StatsUp — endurecimento de segurança do banco.
-- Rodar DEPOIS de 20261001120000_init.sql: SQL Editor → New query → colar → Run.
-- Pode rodar mais de uma vez (idempotente).
--
-- 1. RLS ligado em todas as tabelas expostas (public).
-- 2. Uma política por operação (SELECT, INSERT, UPDATE, DELETE), todas presas
--    ao dono da linha. Nenhuma usa `using (true)`.
-- 3. O papel `anon` (sem login) não tem NENHUM privilégio nas tabelas.
-- 4. Validação no banco (defesa em profundidade contra dados maliciosos, mesmo
--    que alguém fale com a API sem passar pelo app).
-- 5. Função com search_path fixo (evita sequestro de função por schema).
--
-- Sobre SQL injection: o app nunca monta SQL. Tudo passa pela API do Supabase
-- (PostgREST), que envia valores como parâmetros, e não há funções RPC com SQL
-- dinâmico. As validações abaixo ainda barram valores fora do formato esperado.

-- ------------------------------------------------------------------------ RLS
alter table public.profiles        enable row level security;
alter table public.workouts        enable row level security;
alter table public.workout_entries enable row level security;

-- Sem login, nada: nem ler, nem escrever (além de o RLS já não ter política p/ anon).
revoke all on table public.profiles, public.workouts, public.workout_entries from anon;
-- Logado: só o necessário (as políticas abaixo ainda restringem a linhas próprias).
grant select, insert, update, delete on table public.profiles, public.workouts, public.workout_entries to authenticated;

-- --------------------------------------------------------------- profiles
drop policy if exists "profiles: dono" on public.profiles;
drop policy if exists "profiles: ler o próprio" on public.profiles;
drop policy if exists "profiles: criar o próprio" on public.profiles;
drop policy if exists "profiles: alterar o próprio" on public.profiles;
drop policy if exists "profiles: apagar o próprio" on public.profiles;

create policy "profiles: ler o próprio" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);
create policy "profiles: criar o próprio" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "profiles: alterar o próprio" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);       -- não deixa "trocar de dono"
create policy "profiles: apagar o próprio" on public.profiles
  for delete to authenticated
  using ((select auth.uid()) = id);

-- --------------------------------------------------------------- workouts
drop policy if exists "workouts: dono" on public.workouts;
drop policy if exists "workouts: ler os próprios" on public.workouts;
drop policy if exists "workouts: criar os próprios" on public.workouts;
drop policy if exists "workouts: alterar os próprios" on public.workouts;
drop policy if exists "workouts: apagar os próprios" on public.workouts;

create policy "workouts: ler os próprios" on public.workouts
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "workouts: criar os próprios" on public.workouts
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "workouts: alterar os próprios" on public.workouts
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "workouts: apagar os próprios" on public.workouts
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- -------------------------------------------------------- workout_entries
drop policy if exists "workout_entries: dono" on public.workout_entries;
drop policy if exists "workout_entries: ler os próprios" on public.workout_entries;
drop policy if exists "workout_entries: criar os próprios" on public.workout_entries;
drop policy if exists "workout_entries: alterar os próprios" on public.workout_entries;
drop policy if exists "workout_entries: apagar os próprios" on public.workout_entries;

create policy "workout_entries: ler os próprios" on public.workout_entries
  for select to authenticated
  using ((select auth.uid()) = user_id);
-- A FK composta (user_id, workout_id) ainda exige que o treino seja do mesmo dono.
create policy "workout_entries: criar os próprios" on public.workout_entries
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "workout_entries: alterar os próprios" on public.workout_entries
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "workout_entries: apagar os próprios" on public.workout_entries
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ------------------------------------------------------------- validações
alter table public.profiles drop constraint if exists profiles_name_len;
alter table public.profiles add constraint profiles_name_len check (char_length(name) <= 60);
alter table public.profiles drop constraint if exists profiles_goal_valid;
alter table public.profiles add constraint profiles_goal_valid
  check (goal in ('strength', 'hypertrophy', 'endurance', 'recomp', 'health'));
alter table public.profiles drop constraint if exists profiles_birth_range;
alter table public.profiles add constraint profiles_birth_range
  check (birth_date between date '1900-01-01' and date '2100-01-01');
alter table public.profiles drop constraint if exists profiles_body_range;
alter table public.profiles add constraint profiles_body_range
  check (height_cm between 50 and 260 and bodyweight_kg between 20 and 400);

alter table public.workouts drop constraint if exists workouts_id_format;
alter table public.workouts add constraint workouts_id_format check (id ~ '^[A-Za-z0-9_-]{1,64}$');
alter table public.workouts drop constraint if exists workouts_note_len;
alter table public.workouts add constraint workouts_note_len check (char_length(note) <= 500);
alter table public.workouts drop constraint if exists workouts_date_range;
alter table public.workouts add constraint workouts_date_range
  check (date between date '2000-01-01' and date '2100-01-01');

alter table public.workout_entries drop constraint if exists entries_exercise_format;
alter table public.workout_entries add constraint entries_exercise_format
  check (exercise_id ~ '^[a-z0-9_]{1,64}$');
alter table public.workout_entries drop constraint if exists entries_level_valid;
alter table public.workout_entries add constraint entries_level_valid
  check (level in ('beginner', 'novice', 'intermediate', 'advanced', 'elite'));
alter table public.workout_entries drop constraint if exists entries_ranges;
alter table public.workout_entries add constraint entries_ranges check (
  position between 0 and 99
  and percentile between 0 and 100
  and (weight_kg is null or weight_kg between 0 and 1000)
  and (reps is null or reps between 0 and 1000)
  and (est_1rm is null or est_1rm between 0 and 2000)
  and (bodyweight_at_log is null or bodyweight_at_log between 20 and 400)
);

-- --------------------------------------------------------------- funções
-- search_path vazio: a função não pode ser enganada por objetos criados em
-- outros schemas (aviso "function_search_path_mutable" do Security Advisor).
create or replace function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
