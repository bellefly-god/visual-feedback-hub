-- FeedbackMark MVP schema
-- Run this in Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  owner_id text not null,
  asset_type text not null check (asset_type in ('image','pdf','screenshot')),
  asset_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  page int,
  x double precision not null,
  y double precision not null,
  width double precision,
  height double precision,
  color text not null default '#2563eb',
  shape_type text not null check (shape_type in ('pin','arrow','rectangle','highlight')),
  content text not null,
  voice_note_url text,
  status text not null check (status in ('pending','fixed','approved')),
  author_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.replies (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  author_name text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  token text not null unique,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists idx_comments_project_id on public.comments(project_id);
create index if not exists idx_comments_status on public.comments(status);
create index if not exists idx_replies_comment_id on public.replies(comment_id);
create index if not exists idx_share_links_project_id on public.share_links(project_id);
create index if not exists idx_share_links_token on public.share_links(token);

alter table public.comments
  add column if not exists color text not null default '#2563eb';

-- MVP mode: keep public access simple.
alter table public.projects disable row level security;
alter table public.comments disable row level security;
alter table public.replies disable row level security;
alter table public.share_links disable row level security;

-- Storage bucket for uploaded assets.
insert into storage.buckets (id, name, public)
values ('feedback-assets', 'feedback-assets', true)
on conflict (id) do nothing;

-- Storage policies for MVP public uploads/reads.
drop policy if exists "public read feedback assets" on storage.objects;
create policy "public read feedback assets"
on storage.objects
for select
to public
using (bucket_id = 'feedback-assets');

drop policy if exists "public upload feedback assets" on storage.objects;
create policy "public upload feedback assets"
on storage.objects
for insert
to public
with check (bucket_id = 'feedback-assets');
