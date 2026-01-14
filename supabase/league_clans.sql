create table public.league_clans (
  id uuid not null default extensions.uuid_generate_v4 (),
  league_history_id uuid not null,
  clan_tag text not null,
  clan_name text not null,
  clan_level integer null,
  badge_url text null,
  group_rank integer null,
  total_stars integer null default 0,
  total_destruction numeric(6, 2) null default 0,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint league_clans_pkey primary key (id),
  constraint league_clans_league_history_id_clan_tag_key unique (league_history_id, clan_tag),
  constraint league_clans_league_history_id_fkey foreign KEY (league_history_id) references league_history (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_league_clans_league_history on public.league_clans using btree (league_history_id) TABLESPACE pg_default;