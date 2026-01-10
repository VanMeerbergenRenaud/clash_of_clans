-- Profiles Table (extends auth.users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  role text default 'member' check (role in ('admin', 'co_leader', 'elder', 'member')),
  avatar_url text,
  player_tag text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Wars Table
create table public.wars (
  id uuid default uuid_generate_v4() primary key,
  opponent_name text not null,
  opponent_tag text,
  war_date timestamp with time zone not null,
  status text default 'preparation' check (status in ('preparation', 'active', 'ended')),
  result text check (result in ('victory', 'defeat', 'draw')),
  stars_us integer default 0,
  stars_them integer default 0,
  percentage_us numeric(5,2) default 0,
  percentage_them numeric(5,2) default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- War Performances Table (Who attacked whom)
create table public.war_performances (
  id uuid default uuid_generate_v4() primary key,
  war_id uuid references public.wars not null,
  profile_id uuid references public.profiles, -- can be null if member left but we keep stats?
  member_name text not null, -- snapshot of name
  stars integer default 0 check (stars >= 0 and stars <= 3),
  destruction numeric(5,2) default 0,
  town_hall_level integer,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Base Layouts Table
create table public.base_layouts (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  town_hall_level integer not null,
  link_url text not null,
  image_url text, -- screenshot of base
  category text check (category in ('war', 'farming', 'trophy', 'builder')),
  stars_defense_avg numeric(3,2), -- average stars conceded using this base
  created_by uuid references public.profiles,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Attack Strategies Table
create table public.strategies (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  army_link text,
  video_url text,
  min_town_hall integer,
  type text check (type in ('ground', 'air', 'hybrid')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
