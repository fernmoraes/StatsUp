-- StatsUp — exclusão de conta pelo próprio usuário (direito de eliminação, LGPD art. 18).
-- Rodar DEPOIS das migrações anteriores: SQL Editor → New query → colar → Run.
-- Pode rodar mais de uma vez (idempotente).
--
-- Apagar uma conta exige mexer em auth.users, que o app (papel authenticated) não
-- acessa. Esta função roda com os privilégios do dono (security definer), mas só
-- apaga a conta de QUEM CHAMOU (auth.uid()): não recebe parâmetro nenhum, então
-- não há como apontar para a conta de outra pessoa.
-- Perfil, treinos e exercícios saem junto (on delete cascade).

create or replace function public.delete_my_account() returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'É preciso estar logado para excluir a conta.' using errcode = '42501';
  end if;
  delete from auth.users where id = me;
end;
$$;

-- Só quem está logado pode chamar (e só afeta a própria conta).
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
