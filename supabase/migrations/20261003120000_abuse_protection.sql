-- StatsUp — proteção contra abuso (cotas por usuário).
-- Rodar DEPOIS das migrações anteriores: SQL Editor → New query → colar → Run.
-- Pode rodar mais de uma vez (idempotente).
--
-- O RLS impede que um usuário mexa nos dados dos outros, mas não impede que ele
-- encha o banco chamando a API direto (milhões de linhas). No plano grátis isso
-- estoura o limite de espaço e derruba o app para todo mundo. Cotas:
--   - até 100 treinos NOVOS por usuário a cada 24 h (registro retroativo cabe);
--   - até 5000 treinos por usuário no total (~13 anos de treino diário);
--   - até 60 exercícios por treino.
-- Reenvios da sincronização (upsert de linhas que já existem) NÃO contam.

-- Horário de inserção definido pelo BANCO (o created_at vem do app e poderia
-- ser falsificado para driblar a cota de 24 h).
alter table public.workouts add column if not exists inserted_at timestamptz not null default now();
create index if not exists workouts_user_inserted_idx on public.workouts (user_id, inserted_at);

create or replace function public.enforce_workout_quota() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  recent int;
  total int;
begin
  -- Upsert de um treino que já existe: é atualização, não conta na cota.
  if exists (select 1 from public.workouts w where w.user_id = new.user_id and w.id = new.id) then
    return new;
  end if;

  new.inserted_at := now(); -- ignora o que o cliente mandar

  select count(*) into recent from public.workouts w
  where w.user_id = new.user_id and w.inserted_at > now() - interval '24 hours';
  if recent >= 100 then
    raise exception 'Limite de 100 treinos novos em 24 horas atingido.' using errcode = 'P0001', hint = 'quota_daily';
  end if;

  select count(*) into total from public.workouts w where w.user_id = new.user_id;
  if total >= 5000 then
    raise exception 'Limite de 5000 treinos por conta atingido.' using errcode = 'P0001', hint = 'quota_total';
  end if;

  return new;
end;
$$;

drop trigger if exists workouts_quota on public.workouts;
create trigger workouts_quota before insert on public.workouts
  for each row execute function public.enforce_workout_quota();

-- inserted_at não pode ser alterado depois (senão daria para "rejuvenescer" linhas).
create or replace function public.keep_inserted_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.inserted_at := old.inserted_at;
  return new;
end;
$$;

drop trigger if exists workouts_keep_inserted_at on public.workouts;
create trigger workouts_keep_inserted_at before update on public.workouts
  for each row execute function public.keep_inserted_at();

-- Até 60 exercícios por treino (position 0–59; a chave primária impede repetir).
alter table public.workout_entries drop constraint if exists entries_ranges;
alter table public.workout_entries add constraint entries_ranges check (
  position between 0 and 59
  and percentile between 0 and 100
  and (weight_kg is null or weight_kg between 0 and 1000)
  and (reps is null or reps between 0 and 1000)
  and (est_1rm is null or est_1rm between 0 and 2000)
  and (bodyweight_at_log is null or bodyweight_at_log between 20 and 400)
);
