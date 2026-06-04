-- =====================================================================
-- Regras ON DELETE nos FKs que apontam para profiles / auth.users
-- ---------------------------------------------------------------------
-- Sem isto, excluir uma conta que tenha dados relacionados falha por
-- violação de chave estrangeira (a Edge Function admin-users retorna 400
-- ao chamar auth.admin.deleteUserById).
--
-- Política:
--   created_by / coach_id        -> SET NULL  (preserva o conteúdo autorado,
--                                               só desvincula o autor)
--   demais (user_id, assigned_to) -> CASCADE   (remove o conteúdo do próprio
--                                               usuário ao excluí-lo)
--
-- Bloco dinâmico: descobre todos os FKs que referenciam public.profiles ou
-- auth.users, derruba e recria cada um com a regra correta. Idempotente.
-- =====================================================================

do $$
declare
  r record;
  desired text;
begin
  for r in
    select
      con.conname,
      ns.nspname   as tbl_schema,
      cl.relname   as tbl_name,
      att.attname  as col_name,
      fns.nspname  as ref_schema,
      fcl.relname  as ref_table,
      fatt.attname as ref_col
    from pg_constraint con
    join pg_class cl        on cl.oid  = con.conrelid
    join pg_namespace ns    on ns.oid  = cl.relnamespace
    join pg_class fcl       on fcl.oid = con.confrelid
    join pg_namespace fns   on fns.oid = fcl.relnamespace
    join lateral unnest(con.conkey)  with ordinality as k(attnum, ord)  on true
    join lateral unnest(con.confkey) with ordinality as fk(attnum, ord) on fk.ord = k.ord
    join pg_attribute att   on att.attrelid  = con.conrelid  and att.attnum  = k.attnum
    join pg_attribute fatt  on fatt.attrelid = con.confrelid and fatt.attnum = fk.attnum
    where con.contype = 'f'
      and (
        (fns.nspname = 'public' and fcl.relname = 'profiles') or
        (fns.nspname = 'auth'   and fcl.relname = 'users')
      )
  loop
    if r.col_name in ('created_by', 'coach_id') then
      desired := 'SET NULL';
      -- SET NULL exige que a coluna seja nullable
      execute format('alter table %I.%I alter column %I drop not null',
                     r.tbl_schema, r.tbl_name, r.col_name);
    else
      desired := 'CASCADE';
    end if;

    execute format('alter table %I.%I drop constraint %I',
                   r.tbl_schema, r.tbl_name, r.conname);
    execute format(
      'alter table %I.%I add constraint %I foreign key (%I) references %I.%I(%I) on delete %s',
      r.tbl_schema, r.tbl_name, r.conname, r.col_name,
      r.ref_schema, r.ref_table, r.ref_col, desired
    );

    raise notice 'FK %.%(%) -> ON DELETE %', r.tbl_schema, r.tbl_name, r.col_name, desired;
  end loop;
end $$;
