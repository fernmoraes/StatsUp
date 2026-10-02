-- Monitoramento diário (rodado por .github/workflows/monitor.yml).
-- Saída: uma métrica por linha, "nome|valor". SÓ NÚMEROS AGREGADOS: o repositório
-- é público e os logs das actions também — nunca imprimir e-mail, id ou dado.

-- Contas
select 'cadastros_24h|' || count(*) from auth.users where created_at > now() - interval '24 hours';
select 'cadastros_1h|' || count(*) from auth.users where created_at > now() - interval '1 hour';
select 'contas_total|' || count(*) from auth.users;
select 'logins_24h|' || count(*) from auth.audit_log_entries
  where created_at > now() - interval '24 hours' and payload->>'action' = 'login';

-- Volume de dados (abuso = uma conta gerando muito)
select 'treinos_novos_24h|' || count(*) from public.workouts where inserted_at > now() - interval '24 hours';
select 'maior_volume_uma_conta_24h|' || coalesce(max(n), 0) from (
  select count(*) as n from public.workouts
  where inserted_at > now() - interval '24 hours' group by user_id
) t;
select 'maior_volume_uma_conta_total|' || coalesce(max(n), 0) from (
  select count(*) as n from public.workouts group by user_id
) t;
select 'exercicios_total|' || count(*) from public.workout_entries;

-- Espaço (plano grátis: 500 MB)
select 'banco_mb|' || round(pg_database_size(current_database()) / 1024.0 / 1024.0);

-- Regressões de segurança (devem ser sempre 0)
select 'tabelas_public_sem_rls|' || count(*)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity;
select 'politicas_abertas|' || count(*) from pg_policies
  where schemaname = 'public' and (qual = 'true' or with_check = 'true');
select 'anon_com_privilegio|' || count(*) from information_schema.role_table_grants
  where grantee = 'anon' and table_schema = 'public';
