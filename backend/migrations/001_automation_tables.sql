-- Phase 3: Automation system tables
-- Run this in Supabase SQL Editor

-- automation_jobs: one row per user, tracks automation state
create table if not exists public.automation_jobs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  status        text not null default 'paused'
                  check (status in ('active','paused','error')),
  started_at    timestamptz,
  last_run_at   timestamptz,
  actions_count int not null default 0,
  progress_score numeric not null default 0,   -- 0..100
  error_message text,
  created_at    timestamptz not null default now(),
  unique (user_id)
);

-- activity_log: append-only record of every action (Rule #5)
create table if not exists public.activity_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  action_type  text not null,        -- 'like' | 'follow' | 'search' | 'system' | 'tracked'
  topic        text,
  result       text not null         -- 'success' | 'failed' | 'skipped'
                 check (result in ('success','failed','skipped')),
  performed_at timestamptz not null default now()
);

create index if not exists activity_log_user_time
  on public.activity_log (user_id, performed_at desc);

-- RLS: users can SELECT their own rows; writes come from service-role (backend)
alter table public.automation_jobs enable row level security;
alter table public.activity_log    enable row level security;

create policy "own jobs" on public.automation_jobs
  for select using (auth.uid() = user_id);
create policy "own activity" on public.activity_log
  for select using (auth.uid() = user_id);

-- Realtime publication (so Dashboard updates live, reusing Phase 2 proven path)
alter publication supabase_realtime add table public.automation_jobs;
alter publication supabase_realtime add table public.activity_log;
