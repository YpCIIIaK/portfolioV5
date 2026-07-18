-- Personal Workspace schema for Supabase.
-- Run this in the Supabase SQL editor (Dashboard -> SQL -> New query).
--
-- Single-owner app: the server talks to these tables with the SERVICE ROLE key,
-- which bypasses RLS. All access is gated in the API by the GitHub session
-- (OWNER_GITHUB_ID), so we keep RLS ON with no public policies — meaning the
-- anon/public key can read or write nothing. Only the server (service role) can.

create extension if not exists "pgcrypto";

-- Priority scale shared by notes/tasks/events: none|low|medium|high.
-- Stored as text; validated by the API (zod). `color` is a palette key
-- ('', 'red', 'blue', …) resolved to a hex on the client (see wsStyle).

-- Notes -------------------------------------------------------------
create table if not exists public.ws_notes (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default 'Без названия',
  body       text not null default '',
  priority   text not null default 'none',
  color      text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Tasks -------------------------------------------------------------
create table if not exists public.ws_tasks (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  done       boolean not null default false,
  due        date,
  priority   text not null default 'none',
  color      text not null default '',
  created_at timestamptz not null default now()
);

-- Calendar events ---------------------------------------------------
create table if not exists public.ws_events (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  date       date not null,
  time       text,
  note       text,
  priority   text not null default 'none',
  color      text not null default '',
  -- Set once a reminder has been sent, so the cron never notifies twice.
  -- Reset to null by the API when an event's date/time changes.
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

-- Showcase projects -------------------------------------------------
-- Public ones are served to everyone (guests included); private ones
-- only to the owner. Access is still gated in the API, not via RLS.
create table if not exists public.ws_projects (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null default '',
  repo_url    text,
  tags        text not null default '',
  is_public   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Subscriptions -----------------------------------------------------
-- Manual tracker of recurring paid services (what / how much / tier).
create table if not exists public.ws_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  price       numeric not null default 0,
  currency    text not null default '₽',
  period      text not null default 'monthly', -- monthly | yearly
  tier        text not null default '',
  description text not null default '',
  next_date   date,
  created_at  timestamptz not null default now()
);

-- Guestbook -----------------------------------------------------------
-- Public read, write for any logged-in GitHub user (identity comes from
-- the signed session on the server, never from the client body).
create table if not exists public.ws_guestbook (
  id         uuid primary key default gen_random_uuid(),
  github_id  bigint not null,
  login      text not null,
  name       text not null default '',
  avatar     text not null default '',
  message    text not null,
  created_at timestamptz not null default now()
);

-- Diagrams (block/flow boards) ----------------------------------------
-- Each row is one board; `data` holds { nodes, edges } produced by the
-- in-app diagram editor. Owner-only (gated in the API, like the rest).
create table if not exists public.ws_diagrams (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default 'Новая диаграмма',
  data       jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.ws_diagrams enable row level security;

-- Integrations (OAuth tokens for third-party services) ----------------
-- One row per provider ('notion', …). Holds the owner's OAuth access token
-- and a free-form `config` (e.g. which Notion database backs "tasks").
-- Written only by the server (service role) after the owner completes OAuth.
create table if not exists public.ws_integrations (
  provider       text primary key,      -- 'notion'
  access_token   text not null,
  workspace_id   text,
  workspace_name text,
  workspace_icon text,
  bot_id         text,
  config         jsonb not null default '{}'::jsonb,
  updated_at     timestamptz not null default now(),
  created_at     timestamptz not null default now()
);
alter table public.ws_integrations enable row level security;

-- Visit analytics -----------------------------------------------------
-- One row per visit beacon; aggregated by the owner-only /api/stats.
create table if not exists public.ws_visits (
  id          uuid primary key default gen_random_uuid(),
  duration_ms integer not null default 0,
  referrer    text not null default '',
  tz          text not null default '',
  screen      text not null default '',
  ua          text not null default '',
  geo         text not null default '',
  files       jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists ws_visits_created_at_idx on public.ws_visits (created_at desc);

-- Lock everything down to the service role (server-side) only.
alter table public.ws_notes    enable row level security;
alter table public.ws_tasks    enable row level security;
alter table public.ws_events   enable row level security;
alter table public.ws_projects enable row level security;
alter table public.ws_subscriptions enable row level security;
alter table public.ws_guestbook enable row level security;
alter table public.ws_visits   enable row level security;
-- (No policies created on purpose: anon/public key gets zero access.)

-- Migration for existing databases (safe to re-run) -----------------
-- Adds the priority/color columns to tables created before this change.
alter table public.ws_notes  add column if not exists priority text not null default 'none';
alter table public.ws_notes  add column if not exists color    text not null default '';
alter table public.ws_tasks  add column if not exists priority text not null default 'none';
alter table public.ws_tasks  add column if not exists color    text not null default '';
alter table public.ws_events add column if not exists priority text not null default 'none';
alter table public.ws_events add column if not exists color    text not null default '';
alter table public.ws_events add column if not exists notified_at timestamptz;
-- Kanban status for tasks: todo | doing | done (kept in sync with `done`).
alter table public.ws_tasks  add column if not exists status text not null default 'todo';
update public.ws_tasks set status = 'done' where done = true and status <> 'done';
-- Recurring events: none | daily | weekly | monthly | yearly.
alter table public.ws_events add column if not exists repeat text not null default 'none';

-- Calendar reminders via pg_cron + pg_net -------------------------------------
-- Runs a scheduled HTTP POST to the app, which finds events whose reminder
-- window has arrived and sends Telegram/email. Requires the pg_cron and pg_net
-- extensions (enable under Database -> Extensions in the Supabase dashboard).
--
--   create extension if not exists pg_cron;
--   create extension if not exists pg_net;
--
-- Then schedule (replace the URL host and CRON_SECRET with your own):
--
--   select cron.schedule(
--     'ws-event-reminders',
--     '*/5 * * * *',                       -- every 5 minutes
--     $$
--       select net.http_post(
--         url    := 'https://your-domain/api/workspace/cron',
--         headers:= '{"x-cron-secret":"YOUR_CRON_SECRET"}'::jsonb
--       );
--     $$
--   );
--
-- To change the schedule later: select cron.unschedule('ws-event-reminders');
-- then re-run cron.schedule(...). Inspect runs: select * from cron.job_run_details;
