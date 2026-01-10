-- Create tracked_clans table
create table if not exists public.tracked_clans (
  tag text primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Update RLS for base_link to allow everyone to insert
drop policy if exists "Admins can insert bases" on base_link;
create policy "Anyone can insert bases"
  on base_link for insert
  with check (true);

create policy "Admins can delete bases"
  on base_link for delete
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and user_type = 'admin'
    )
  );

-- Update RLS for strategies
alter table public.strategies enable row level security;

create policy "Strategies are viewable by everyone"
  on strategies for select
  using (true);

create policy "Anyone can insert strategies"
  on strategies for insert
  with check (true);

create policy "Admins can delete strategies"
  on strategies for delete
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and user_type = 'admin'
    )
  );

-- Update RLS for tracked_clans
alter table public.tracked_clans enable row level security;

create policy "Tracked clans are viewable by everyone"
  on tracked_clans for select
  using (true);

-- Update RLS for wars
alter table public.wars enable row level security;
create policy "Wars are viewable by everyone"
  on wars for select
  using (true);

-- Update RLS for war_performances
alter table public.war_performances enable row level security;
create policy "Performances are viewable by everyone"
  on war_performances for select
  using (true);

-- League History Table
create table if not exists public.league_history (
  id uuid default uuid_generate_v4() primary key,
  clan_tag text not null,
  season text not null,
  league_name text,
  rank integer,
  stars integer,
  destruction_percentage numeric(10,2),
  result text check (result in ('promoted', 'demoted', 'stayed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.league_history enable row level security;

create policy "League history is viewable by everyone"
  on league_history for select
  using (true);

create policy "Admins can manage league history"
  on league_history for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and user_type = 'admin'
    )
  );

create policy "Admins can insert tracked clans"
  on tracked_clans for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and user_type = 'admin'
    )
  );

create policy "Admins can delete tracked clans"
  on tracked_clans for delete
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and user_type = 'admin'
    )
  );
