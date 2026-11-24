-- =====================================================================
-- An email when a message waits unread.
--   A message that stays unread for 10 minutes sends the recipient one
--   email ("X sent you a message on Jamly") without the message text.
--   At most one email an hour per person, and anyone can turn it off in
--   Settings. Nothing is sent until an email service is connected to the
--   message-alerts server function.
--   1. profiles.email_on_message: the person's choice, on by default.
--      Only they can see it (through my_account()) and change it.
--   2. message_email_state: when a person was last emailed about a
--      conversation. Server only; nobody can read or change it from the site.
--   3. claim_message_alerts(): picks who should get an email now and marks
--      them. Only the server function can call it.
--   4. A timer (pg_cron) calls the server function every 5 minutes.
-- Nothing existing is deleted. Undo: unschedule the timer, drop the
-- function, the table and the column.
-- =====================================================================

-- 1 -------------------------------------------------------------------
alter table public.profiles add column if not exists email_on_message boolean not null default true;
grant update (email_on_message) on public.profiles to authenticated;

create or replace function public.my_account()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('is_admin', is_admin, 'is_suspended', is_suspended, 'email_on_message', email_on_message)
  from public.profiles where id = auth.uid() and public.mfa_ok()
$$;

-- 2 -------------------------------------------------------------------
create table if not exists public.message_email_state (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emailed_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists message_email_state_user on public.message_email_state (user_id, emailed_at desc);
alter table public.message_email_state enable row level security;
revoke all on public.message_email_state from anon, authenticated;
create policy mfa_required on public.message_email_state as restrictive to authenticated
  using (public.mfa_ok()) with check (public.mfa_ok());

-- 3 -------------------------------------------------------------------
create or replace function public.claim_message_alerts()
returns table (user_id uuid, email text, full_name text, senders text, message_count int, conversation_ids uuid[])
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
begin
  -- One run at a time, so nobody gets the same email twice.
  perform pg_advisory_xact_lock(hashtext('claim_message_alerts'));
  return query
  with pending as (
    -- Messages from someone else, not read yet, not emailed about yet,
    -- older than 10 minutes (time to see them on the site) and newer than 3 days.
    select cm.user_id, cm.conversation_id, m.sender_id
    from public.conversation_members cm
    join public.messages m on m.conversation_id = cm.conversation_id and m.sender_id <> cm.user_id
    left join public.message_email_state s on s.conversation_id = cm.conversation_id and s.user_id = cm.user_id
    where m.created_at > cm.last_read_at
      and m.created_at > coalesce(s.emailed_at, '-infinity'::timestamptz)
      and m.created_at <= now() - interval '10 minutes'
      and m.created_at > now() - interval '3 days'
      and not public.is_blocked_between(cm.user_id, m.sender_id)
  ),
  people as (
    -- Who agreed to emails, has a confirmed address, and wasn't emailed in the last hour.
    select distinct p.user_id
    from pending p
    join public.profiles pr on pr.id = p.user_id
    join auth.users u on u.id = p.user_id
    where pr.email_on_message and not pr.is_suspended
      and u.email is not null and u.email_confirmed_at is not null
      and not exists (select 1 from public.message_email_state s2
                      where s2.user_id = p.user_id and s2.emailed_at > now() - interval '1 hour')
  ),
  chosen as (
    select p.user_id, p.conversation_id, p.sender_id from pending p join people using (user_id)
  ),
  marked as (
    insert into public.message_email_state as st (conversation_id, user_id, emailed_at)
    select distinct c.conversation_id, c.user_id, now() from chosen c
    on conflict (conversation_id, user_id) do update set emailed_at = excluded.emailed_at
    returning st.user_id
  )
  select c.user_id, u.email::text, coalesce(nullif(pr.full_name, ''), pr.username),
         string_agg(distinct coalesce(nullif(sp.full_name, ''), sp.username), ', '),
         count(*)::int, array_agg(distinct c.conversation_id)
  from chosen c
  join auth.users u on u.id = c.user_id
  join public.profiles pr on pr.id = c.user_id
  join public.profiles sp on sp.id = c.sender_id
  group by c.user_id, u.email, pr.full_name, pr.username;
end $$;
revoke execute on function public.claim_message_alerts() from public, anon, authenticated;
grant execute on function public.claim_message_alerts() to service_role;

-- 4 -------------------------------------------------------------------
-- The timer. Only where pg_cron and pg_net exist (on Supabase), so local tests still run.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
    create extension if not exists pg_cron;
    perform cron.unschedule(jobid) from cron.job where jobname = 'message-alerts';
    perform cron.schedule('message-alerts', '*/5 * * * *', $job$
      select net.http_post(
        url := 'https://jrhzkarxjqbcqokfowbv.supabase.co/functions/v1/message-alerts',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb,
        timeout_milliseconds := 30000
      )
    $job$);
  end if;
end $$;
