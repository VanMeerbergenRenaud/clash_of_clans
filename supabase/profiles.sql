create table public.league_history (
  id uuid not null default extensions.uuid_generate_v4 (),
  season text not null,
  clan_tag text not null,
  clan_name text not null,
  league_name text null,
  league_id integer null,
  final_rank integer null,
  total_stars integer null default 0,
  total_destruction numeric(6, 2) null default 0,
  result text null,
  state text null default 'inProgress'::text,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint league_history_pkey primary key (id),
  constraint league_history_clan_tag_season_key unique (clan_tag, season),
  constraint league_history_clan_tag_fkey foreign KEY (clan_tag) references tracked_clans (tag) on delete CASCADE,
  constraint league_history_result_check check (
    (
      result = any (
        array['promoted'::text, 'demoted'::text, 'stayed'::text]
      )
    )
  ),
  constraint league_history_state_check check (
    (
      state = any (array['inProgress'::text, 'ended'::text])
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_league_history_clan_tag on public.league_history using btree (clan_tag) TABLESPACE pg_default;

create index IF not exists idx_league_history_season on public.league_history using btree (season) TABLESPACE pg_default;