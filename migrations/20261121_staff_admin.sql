-- Isolated from Included Drinks. No finance/customer data is stored here.
create schema if not exists jkos_admin_private;
revoke all on schema jkos_admin_private from public, anon, authenticated;
create table jkos_admin_private.config (
  singleton boolean primary key default true check(singleton),
  secret_hash text not null,
  attempts integer not null default 0,
  window_start timestamptz not null default now()
);
create table jkos_admin_private.sessions (
  token_hash text primary key,
  revision text not null,
  created_at timestamptz not null default now(),
  seen_at timestamptz not null default now()
);
alter table jkos_admin_private.config enable row level security;
alter table jkos_admin_private.sessions enable row level security;
revoke all on all tables in schema jkos_admin_private from public, anon, authenticated;

create or replace function public.jkos_admin_auth(secret text, action text, token_hash text, revision text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare config jkos_admin_private.config%rowtype; affected integer;
begin
  select * into config from jkos_admin_private.config where singleton for update;
  if config.secret_hash is null or secret is null or length(secret) <> 64
     or encode(extensions.digest(secret, 'sha256'), 'hex') <> config.secret_hash then
    return false;
  end if;
  delete from jkos_admin_private.sessions where seen_at <= now() - interval '15 minutes'
    or created_at <= now() - interval '8 hours';
  if action = 'attempt' then
    if config.window_start <= now() - interval '15 minutes' then
      update jkos_admin_private.config set attempts = 1, window_start = now() where singleton;
      return true;
    end if;
    if config.attempts >= 5 then return false; end if;
    update jkos_admin_private.config set attempts = attempts + 1 where singleton;
    return true;
  end if;
  if token_hash is null or token_hash !~ '^[a-f0-9]{64}$'
    or revision is null or revision !~ '^[a-f0-9]{64}$' then return false; end if;
  if action = 'create' then
    insert into jkos_admin_private.sessions(token_hash, revision) values(token_hash, revision);
    update jkos_admin_private.config set attempts = 0, window_start = now() where singleton;
    return true;
  elsif action = 'check' then
    update jkos_admin_private.sessions s set seen_at = now()
      where s.token_hash = jkos_admin_auth.token_hash and s.revision = jkos_admin_auth.revision;
    get diagnostics affected = row_count;
    return affected = 1;
  elsif action = 'revoke' then
    delete from jkos_admin_private.sessions s where s.token_hash = jkos_admin_auth.token_hash;
    return true;
  end if;
  return false;
end;
$$;
revoke all on function public.jkos_admin_auth(text,text,text,text) from public;
grant execute on function public.jkos_admin_auth(text,text,text,text) to anon;
