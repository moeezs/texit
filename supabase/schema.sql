create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled Project',
  latex_content text not null default '',
  summary text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_opened_at timestamptz,
  archived_at timestamptz
);

create table if not exists public.project_revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  source text not null check (source in ('manual', 'ai', 'upload', 'system')),
  latex_content text not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Project Assistant',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  role text not null check (role in ('system', 'user', 'assistant')),
  content text not null,
  content_format text not null default 'markdown',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  thread_id uuid references public.chat_threads (id) on delete set null,
  message_id uuid references public.chat_messages (id) on delete set null,
  bucket text not null default 'project-assets',
  storage_path text not null unique,
  original_filename text not null,
  mime_type text,
  byte_size bigint,
  width integer,
  height integer,
  checksum text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists projects_owner_id_updated_at_idx
  on public.projects (owner_id, updated_at desc);

create index if not exists project_revisions_project_id_created_at_idx
  on public.project_revisions (project_id, created_at desc);

create index if not exists chat_threads_project_id_updated_at_idx
  on public.chat_threads (project_id, updated_at desc);

create index if not exists chat_messages_thread_id_created_at_idx
  on public.chat_messages (thread_id, created_at asc);

create index if not exists project_assets_project_id_created_at_idx
  on public.project_assets (project_id, created_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute procedure public.set_updated_at();

drop trigger if exists chat_threads_set_updated_at on public.chat_threads;
create trigger chat_threads_set_updated_at
before update on public.chat_threads
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_revisions enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
alter table public.project_assets enable row level security;

drop policy if exists "Users can manage their own profile" on public.profiles;
create policy "Users can manage their own profile"
on public.profiles
for all
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can manage their own projects" on public.projects;
create policy "Users can manage their own projects"
on public.projects
for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Users can manage project revisions they own" on public.project_revisions;
create policy "Users can manage project revisions they own"
on public.project_revisions
for all
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_id and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = project_id and p.owner_id = auth.uid()
  )
);

drop policy if exists "Users can manage their own chat threads" on public.chat_threads;
create policy "Users can manage their own chat threads"
on public.chat_threads
for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Users can manage their own chat messages" on public.chat_messages;
create policy "Users can manage their own chat messages"
on public.chat_messages
for all
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_id and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = project_id and p.owner_id = auth.uid()
  )
);

drop policy if exists "Users can manage their own assets" on public.project_assets;
create policy "Users can manage their own assets"
on public.project_assets
for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

insert into storage.buckets (id, name, public)
values ('project-assets', 'project-assets', false)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can read their asset objects" on storage.objects;
create policy "Authenticated users can read their asset objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'project-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Authenticated users can upload their asset objects" on storage.objects;
create policy "Authenticated users can upload their asset objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Authenticated users can update their asset objects" on storage.objects;
create policy "Authenticated users can update their asset objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'project-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'project-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Authenticated users can delete their asset objects" on storage.objects;
create policy "Authenticated users can delete their asset objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);
