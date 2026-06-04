-- =====================================================================
-- Superadmin RLS bypass
-- ---------------------------------------------------------------------
-- O papel 'superadmin' não está nas policies existentes (que checam
-- role IN ('admin','coach','nutri','reception')). Em vez de editar cada
-- policy, adicionamos UMA policy permissiva de superadmin por tabela.
-- Policies permissivas são combinadas com OR, então isto concede acesso
-- total ao superadmin SEM alterar o acesso dos demais papéis.
--
-- is_superadmin() é SECURITY DEFINER para ler 'profiles' sem disparar a
-- própria RLS (evita recursão na policy de profiles).
-- Idempotente: pode rodar novamente sem erro.
-- =====================================================================

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'superadmin'
  );
$$;

revoke all on function public.is_superadmin() from public;
grant execute on function public.is_superadmin() to authenticated, anon, service_role;

-- Adiciona a policy "superadmin full access" em todas as tabelas do schema public
do $$
declare t record;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('drop policy if exists "superadmin full access" on public.%I;', t.tablename);
    execute format(
      'create policy "superadmin full access" on public.%I '
      || 'for all to authenticated '
      || 'using (public.is_superadmin()) with check (public.is_superadmin());',
      t.tablename
    );
  end loop;
end $$;

-- Acesso de storage (uploads de avatar, exercícios, fitflix, fitgran) para o superadmin
drop policy if exists "superadmin storage full access" on storage.objects;
create policy "superadmin storage full access" on storage.objects
  for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());
