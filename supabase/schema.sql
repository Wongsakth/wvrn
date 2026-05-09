-- ═══════════════════════════════════════════════════════════════
-- WVRN — Supabase Database Schema
-- Run this in Supabase > SQL Editor > New Query
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── ARTISTS ────────────────────────────────────────────────────
create table if not exists artists (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  name_en       text,
  bio           text,
  image_url     text,
  genres        text[] default '{}',
  facebook_url  text,
  instagram_url text,
  created_at    timestamptz default now()
);

-- ─── VENUES ─────────────────────────────────────────────────────
create table if not exists venues (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  address    text,
  province   text not null,
  lat        float,
  lng        float,
  capacity   int,
  maps_url   text,
  created_at timestamptz default now()
);

-- ─── EVENTS ─────────────────────────────────────────────────────
create table if not exists events (
  id                uuid primary key default uuid_generate_v4(),
  title             text not null,
  description       text,
  event_type        text default 'concert',
  status            text default 'confirmed',
  start_date        date not null,
  end_date          date,
  start_time        time,
  end_time          time,
  venue_id          uuid references venues(id) on delete set null,
  genres            text[] default '{}',
  ticket_price_min  int,
  ticket_price_max  int,
  ticket_url        text,
  poster_url        text,
  is_free           boolean default false,
  province          text not null,
  submitted_by      uuid references auth.users(id) on delete set null,
  approved_by       uuid references auth.users(id) on delete set null,
  approved_at       timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ─── EVENT ↔ ARTIST (many-to-many) ──────────────────────────────
create table if not exists event_artists (
  event_id   uuid references events(id) on delete cascade,
  artist_id  uuid references artists(id) on delete cascade,
  is_headliner boolean default true,
  primary key (event_id, artist_id)
);

-- ─── FOLLOWS ────────────────────────────────────────────────────
create table if not exists follows (
  user_id    uuid references auth.users(id) on delete cascade,
  artist_id  uuid references artists(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, artist_id)
);

-- ─── BOOKMARKS ──────────────────────────────────────────────────
create table if not exists bookmarks (
  user_id    uuid references auth.users(id) on delete cascade,
  event_id   uuid references events(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, event_id)
);

-- ─── EVENT SUBMISSIONS (user-submitted, await admin approval) ───
create table if not exists event_submissions (
  id             uuid primary key default uuid_generate_v4(),
  title          text not null,
  artist_name    text not null,
  venue_name     text not null,
  province       text not null,
  event_date     date not null,
  start_time     time,
  ticket_price   text,
  ticket_url     text,
  description    text,
  poster_url     text,
  status         text default 'pending',  -- pending | approved | rejected
  submitted_by   uuid references auth.users(id) on delete set null,
  reviewer_note  text,
  created_at     timestamptz default now()
);

-- ─── USER PROFILES ───────────────────────────────────────────────
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  role         text default 'user',   -- user | admin
  theme        text default 'festival',
  line_user_id text,
  notify_line  boolean default false,
  created_at   timestamptz default now()
);

-- ─── AUTO-CREATE PROFILE ON SIGNUP ──────────────────────────────
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── UPDATED_AT TRIGGER ──────────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger events_updated_at
  before update on events
  for each row execute function set_updated_at();

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────
alter table events           enable row level security;
alter table artists          enable row level security;
alter table venues           enable row level security;
alter table follows          enable row level security;
alter table bookmarks        enable row level security;
alter table event_submissions enable row level security;
alter table profiles         enable row level security;

-- Events: public read, admin write
create policy "events_public_read"  on events for select using (true);
create policy "events_admin_insert" on events for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "events_admin_update" on events for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Artists & Venues: public read, admin write
create policy "artists_public_read" on artists for select using (true);
create policy "artists_admin_write" on artists for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "venues_public_read"  on venues  for select using (true);
create policy "venues_admin_write"  on venues  for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Follows: user owns their follows
create policy "follows_own" on follows for all using (auth.uid() = user_id);

-- Bookmarks: user owns their bookmarks
create policy "bookmarks_own" on bookmarks for all using (auth.uid() = user_id);

-- Submissions: user can insert/read own; admin can read/update all
create policy "submissions_user_insert" on event_submissions for insert
  with check (auth.uid() = submitted_by);
create policy "submissions_user_read"   on event_submissions for select
  using (auth.uid() = submitted_by);
create policy "submissions_admin_all"   on event_submissions for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Profiles: user reads/updates own
create policy "profiles_own"        on profiles for all using (auth.uid() = id);
create policy "profiles_public_read" on profiles for select using (true);

-- ─── SEED DATA ────────────────────────────────────────────────────
insert into artists (name, name_en, genres) values
  ('PAUSE',          'PAUSE',           '{pop}'),
  ('บิลลี่ แบล็ก', 'Billy Black',     '{pop,indie}'),
  ('Bedroom Audio',  'Bedroom Audio',   '{indie}'),
  ('MILLI',          'MILLI',           '{hiphop}'),
  ('Slot Machine',   'Slot Machine',    '{rock}'),
  ('Bodyslam',       'Bodyslam',        '{rock}'),
  ('Scrubb',         'Scrubb',          '{indie,folk}');

insert into venues (name, province, address) values
  ('Thunder Dome',    'กรุงเทพมหานคร', '99/9 ถ.ป๊อปปูล่า ตำบลบ้านใหม่ อ.ปากเกร็ด นนทบุรี'),
  ('Lido Connect',    'กรุงเทพมหานคร', '215 ถ.สีลม แขวงสุริยวงศ์ เขตบางรัก'),
  ('Impact Arena',    'กรุงเทพมหานคร', '99 ถ.ป๊อปปูล่า ตำบลบ้านใหม่ อ.ปากเกร็ด นนทบุรี'),
  ('Mustache Bar',    'กรุงเทพมหานคร', '1/F ถ.สุขุมวิท 26'),
  ('ICONSIAM',        'กรุงเทพมหานคร', '299 ถ.เจริญนคร แขวงคลองต้นไทร เขตคลองสาน');
