-- StatsUp — teste de segurança do RLS.
-- Onde rodar: Supabase → SQL Editor → New query → colar tudo → Run.
-- Resultado: uma tabela com cada teste e PASSOU/FALHOU. Tudo deve PASSAR.
--
-- O que faz: cria 2 usuários de teste (A e B), entra como cada um com o RLS
-- ativo de verdade (papel `authenticated`, igual ao app) e tenta ler, alterar,
-- apagar e se passar pelo outro. Também testa o papel `anon` (sem login).
-- No fim apaga os usuários de teste (os dados deles somem junto, em cascata).

-- ------------------------------------------------------------------ preparo
delete from auth.users where id in ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b');
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-00000000000a', 'authenticated', 'authenticated',
   'rls-teste-a@statsup.local', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-00000000000b', 'authenticated', 'authenticated',
   'rls-teste-b@statsup.local', '', now(), '{}', '{}', now(), now());

drop table if exists pg_temp.rls_resultados;
create temp table rls_resultados (ordem serial, teste text, passou boolean, detalhe text);

-- -------------------------------------------------------------------- testes
do $$
declare
  a constant uuid := '00000000-0000-4000-8000-00000000000a';
  b constant uuid := '00000000-0000-4000-8000-00000000000b';
  r jsonb := '[]'::jsonb;   -- resultados (gravados depois de voltar ao papel admin)
  n int;
  rec record;
  ops text[];
begin
  -- 1. Estrutura -------------------------------------------------------------
  for rec in
    select c.relname, c.relrowsecurity
    from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
    where ns.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    r := r || jsonb_build_object('t', 'RLS ligado em public.' || rec.relname, 'ok', rec.relrowsecurity, 'd', '');
  end loop;

  select count(*) into n from pg_policies
  where schemaname = 'public' and (qual = 'true' or with_check = 'true');
  r := r || jsonb_build_object('t', 'Nenhuma política com using/with check (true)', 'ok', n = 0, 'd', n || ' encontradas');

  for rec in select unnest(array['profiles', 'workouts', 'workout_entries']) as tbl loop
    select array_agg(distinct cmd) into ops from pg_policies where schemaname = 'public' and tablename = rec.tbl;
    r := r || jsonb_build_object('t', 'Políticas SELECT/INSERT/UPDATE/DELETE em ' || rec.tbl,
      'ok', ops @> array['SELECT', 'INSERT', 'UPDATE', 'DELETE'], 'd', coalesce(array_to_string(ops, ','), 'nenhuma'));
    r := r || jsonb_build_object('t', 'anon sem privilégio em ' || rec.tbl,
      'ok', not (has_table_privilege('anon', 'public.' || rec.tbl, 'SELECT')
              or has_table_privilege('anon', 'public.' || rec.tbl, 'INSERT')
              or has_table_privilege('anon', 'public.' || rec.tbl, 'UPDATE')
              or has_table_privilege('anon', 'public.' || rec.tbl, 'DELETE')), 'd', '');
  end loop;

  begin
    -- 2. Usuário A cria os próprios dados ----------------------------------
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', a::text, true);
    execute 'set local role authenticated';

    begin
      insert into public.profiles (id, name, sex, birth_date, height_cm, bodyweight_kg)
        values (a, 'Usuário A', 'male', '1999-05-14', 178, 82);
      insert into public.workouts (user_id, id, kind, date) values (a, 'teste_a', 'workout', '2026-10-01');
      insert into public.workout_entries (user_id, workout_id, position, exercise_id, weight_kg, reps,
                                          est_1rm, percentile, confidence, level, bodyweight_at_log)
        values (a, 'teste_a', 0, 'bench_press', 100, 5, 117, 67, 'high', 'intermediate', 82);
      r := r || jsonb_build_object('t', 'A cria e lê os próprios dados', 'ok',
        (select count(*) from public.workout_entries where user_id = a) = 1, 'd', '');
    exception when others then
      r := r || jsonb_build_object('t', 'A cria e lê os próprios dados', 'ok', false, 'd', sqlerrm);
    end;

    -- 3. Usuário B tenta mexer nos dados de A ------------------------------
    perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', b::text, true);

    select count(*) into n from public.profiles where id = a;
    r := r || jsonb_build_object('t', 'B NÃO lê o perfil de A', 'ok', n = 0, 'd', n || ' linhas');
    select count(*) into n from public.workouts where user_id = a;
    r := r || jsonb_build_object('t', 'B NÃO lê os treinos de A', 'ok', n = 0, 'd', n || ' linhas');
    select count(*) into n from public.workout_entries where user_id = a;
    r := r || jsonb_build_object('t', 'B NÃO lê os exercícios de A', 'ok', n = 0, 'd', n || ' linhas');
    select count(*) into n from public.workout_entries;
    r := r || jsonb_build_object('t', 'B NÃO lê nada sem filtro (só as próprias linhas)', 'ok', n = 0, 'd', n || ' linhas');

    update public.profiles set name = 'invadido' where id = a;
    get diagnostics n = row_count;
    r := r || jsonb_build_object('t', 'B NÃO altera o perfil de A', 'ok', n = 0, 'd', n || ' linhas');
    update public.workout_entries set percentile = 100 where user_id = a;
    get diagnostics n = row_count;
    r := r || jsonb_build_object('t', 'B NÃO altera os exercícios de A', 'ok', n = 0, 'd', n || ' linhas');
    delete from public.workouts where user_id = a;
    get diagnostics n = row_count;
    r := r || jsonb_build_object('t', 'B NÃO apaga os treinos de A', 'ok', n = 0, 'd', n || ' linhas');

    begin
      insert into public.workouts (user_id, id, kind, date) values (a, 'falso_de_b', 'workout', '2026-10-01');
      r := r || jsonb_build_object('t', 'B NÃO cria treino em nome de A', 'ok', false, 'd', 'inseriu!');
    exception when others then
      r := r || jsonb_build_object('t', 'B NÃO cria treino em nome de A', 'ok', true, 'd', sqlerrm);
    end;

    -- B cria os próprios dados (bloco separado: se um teste abaixo falhar como
    -- esperado, o rollback dele não apaga estes dados).
    begin
      insert into public.profiles (id, name, sex, birth_date, height_cm, bodyweight_kg)
        values (b, 'Usuário B', 'female', '2000-01-01', 165, 60);
      insert into public.workouts (user_id, id, kind, date) values (b, 'teste_b', 'workout', '2026-10-01');
      r := r || jsonb_build_object('t', 'B cria os próprios dados', 'ok', true, 'd', '');
    exception when others then
      r := r || jsonb_build_object('t', 'B cria os próprios dados', 'ok', false, 'd', sqlerrm);
    end;

    begin
      update public.workouts set user_id = a where user_id = b;
      r := r || jsonb_build_object('t', 'B NÃO transfere o próprio treino para A', 'ok', false, 'd', 'transferiu!');
    exception when others then
      r := r || jsonb_build_object('t', 'B NÃO transfere o próprio treino para A', 'ok', true, 'd', sqlerrm);
    end;

    begin
      insert into public.workout_entries (user_id, workout_id, position, exercise_id, percentile, confidence, level)
        values (b, 'teste_a', 5, 'bench_press', 99, 'high', 'elite');
      r := r || jsonb_build_object('t', 'B NÃO pendura exercício no treino de A', 'ok', false, 'd', 'inseriu!');
    exception when others then
      r := r || jsonb_build_object('t', 'B NÃO pendura exercício no treino de A', 'ok', true, 'd', sqlerrm);
    end;

    -- 4. Validações (dados maliciosos/fora do formato) ---------------------
    begin
      insert into public.workouts (user_id, id, kind, date) values (b, 'x''); drop table public.profiles; --', 'workout', '2026-10-01');
      r := r || jsonb_build_object('t', 'Recusa id fora do formato (tentativa de SQL injection)', 'ok', false, 'd', 'inseriu!');
    exception when others then
      r := r || jsonb_build_object('t', 'Recusa id fora do formato (tentativa de SQL injection)', 'ok', true, 'd', sqlerrm);
    end;
    select count(*) into n from public.workouts where user_id = b and id = 'teste_b';
    r := r || jsonb_build_object('t', 'Tabela continua íntegra após a tentativa', 'ok', n = 1, 'd', '');
    begin
      insert into public.workout_entries (user_id, workout_id, position, exercise_id, percentile, confidence, level)
        values (b, 'teste_b', 0, 'bench_press', 150, 'high', 'elite');
      r := r || jsonb_build_object('t', 'Recusa percentil fora de 0–100', 'ok', false, 'd', 'inseriu!');
    exception when others then
      r := r || jsonb_build_object('t', 'Recusa percentil fora de 0–100', 'ok', true, 'd', sqlerrm);
    end;

    -- 5. Sem login (anon) ---------------------------------------------------
    execute 'reset role';
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    perform set_config('request.jwt.claim.sub', '', true);
    execute 'set local role anon';
    begin
      select count(*) into n from public.profiles;
      r := r || jsonb_build_object('t', 'anon NÃO lê perfis', 'ok', n = 0, 'd', n || ' linhas');
    exception when others then
      r := r || jsonb_build_object('t', 'anon NÃO lê perfis', 'ok', true, 'd', sqlerrm);
    end;
    begin
      insert into public.workouts (user_id, id, kind, date) values (a, 'anon_x', 'workout', '2026-10-01');
      r := r || jsonb_build_object('t', 'anon NÃO cria treinos', 'ok', false, 'd', 'inseriu!');
    exception when others then
      r := r || jsonb_build_object('t', 'anon NÃO cria treinos', 'ok', true, 'd', sqlerrm);
    end;
    execute 'reset role';
  exception when others then
    execute 'reset role';
    r := r || jsonb_build_object('t', 'Execução dos testes', 'ok', false, 'd', 'erro inesperado: ' || sqlerrm);
  end;

  -- 6. Conferência como admin: os dados de A continuam intactos -------------
  select count(*) into n from public.profiles where id = a and name = 'Usuário A';
  r := r || jsonb_build_object('t', 'Perfil de A intacto após os ataques', 'ok', n = 1, 'd', '');
  select count(*) into n from public.workouts where user_id = a and id = 'teste_a';
  r := r || jsonb_build_object('t', 'Treino de A intacto após os ataques', 'ok', n = 1, 'd', '');

  insert into rls_resultados (teste, passou, detalhe)
  select x->>'t', (x->>'ok')::boolean, x->>'d' from jsonb_array_elements(r) as x;
end $$;

-- -------------------------------------------------------------------- limpeza
delete from auth.users where id in ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b');

-- ------------------------------------------------------------------ resultado
select ordem as "#", case when passou then '✅ PASSOU' else '❌ FALHOU' end as resultado, teste, detalhe
from rls_resultados order by ordem;
