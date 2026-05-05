-- service_role wird vom Supabase-Admin-Client (SUPABASE_SERVICE_ROLE_KEY)
-- benutzt — z.B. für den Anmelde-Code-Lookup auf der /login-Seite. Ohne
-- explizite Grants wirft Postgres "permission denied for table profiles".

set search_path = public;

grant usage on schema public to service_role;
grant select, insert, update, delete, truncate on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public
  grant select, insert, update, delete, truncate on tables to service_role;
alter default privileges in schema public
  grant execute on functions to service_role;
alter default privileges in schema public
  grant usage, select on sequences to service_role;
