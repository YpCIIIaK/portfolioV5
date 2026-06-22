-- Personal Workspace schema for Supabase.
-- Run this in the Supabase SQL editor (Dashboard -> SQL -> New query).
--
-- Single-owner app: the server talks to these tables with the SERVICE ROLE key,
-- which bypasses RLS. All access is gated in the API by the GitHub session
-- (OWNER_GITHUB_ID), so we keep RLS ON with no public policies — meaning the
-- anon/public key can read or write nothing. Only the server (service role) can.

create extension if not exists "pgcrypto";

-- Notes -------------------------------------------------------------
create table if not exists public.ws_notes (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default 'Без названия',
  body       text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Tasks -------------------------------------------------------------
create table if not exists public.ws_tasks (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  done       boolean not null default false,
  due        date,
  created_at timestamptz not null default now()
);

-- Calendar events ---------------------------------------------------
create table if not exists public.ws_events (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  date       date not null,
  time       text,
  note       text,
  created_at timestamptz not null default now()
);

-- Lock everything down to the service role (server-side) only.
alter table public.ws_notes  enable row level security;
alter table public.ws_tasks  enable row level security;
alter table public.ws_events enable row level security;
-- (No policies created on purpose: anon/public key gets zero access.)
