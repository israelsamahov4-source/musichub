-- =====================================================================
-- The timer shows a key when it calls message-alerts.
--   Supabase lets a call into a server function only if it carries a key.
--   Instead of turning that check off, the timer now sends the project's
--   public key (the "anon" key: the same one the website already uses, not
--   a secret). It reads the key from Supabase Vault, under the name
--   'anon_key', so the key is never written in the code.
--   Until 'anon_key' is in Vault the timer calls without a key, the call is
--   refused, and nothing happens (as before).
-- Nothing else changes. Undo: run part 4 of migration 14 again.
-- =====================================================================

-- Only where the timer, web calls and Vault exist (on Supabase), so local tests still run.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron')
     and exists (select 1 from pg_extension where extname = 'pg_net')
     and exists (select 1 from pg_extension where extname = 'supabase_vault') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'message-alerts';
    perform cron.schedule('message-alerts', '*/5 * * * *', $job$
      select net.http_post(
        url := 'https://jrhzkarxjqbcqokfowbv.supabase.co/functions/v1/message-alerts',
        headers := jsonb_strip_nulls(jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', (select 'Bearer ' || decrypted_secret from vault.decrypted_secrets where name = 'anon_key' limit 1)
        )),
        body := '{}'::jsonb,
        timeout_milliseconds := 30000
      )
    $job$);
  end if;
end $$;
