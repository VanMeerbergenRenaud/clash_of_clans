-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.base_link (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying,
  type character varying DEFAULT 'trophy'::character varying,
  th numeric DEFAULT '18'::numeric,
  link character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  image_url character varying,
  description text,
  CONSTRAINT base_link_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cron_logs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  task_name text NOT NULL,
  status text NOT NULL,
  message text,
  items_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT cron_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.inscription_members (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  inscription_id uuid NOT NULL,
  player_tag text NOT NULL,
  player_name text,
  clan_tag text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT inscription_members_pkey PRIMARY KEY (id),
  CONSTRAINT inscription_members_inscription_id_fkey FOREIGN KEY (inscription_id) REFERENCES public.inscriptions(id),
  CONSTRAINT inscription_members_clan_tag_fkey FOREIGN KEY (clan_tag) REFERENCES public.tracked_clans(tag),
  CONSTRAINT inscription_members_player_tag_fkey FOREIGN KEY (player_tag) REFERENCES public.players(tag)
);
CREATE TABLE public.inscriptions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT inscriptions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.league_clans (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  league_history_id uuid NOT NULL,
  clan_tag text NOT NULL,
  clan_name text NOT NULL,
  clan_level integer,
  badge_url text,
  group_rank integer,
  total_stars integer DEFAULT 0,
  total_destruction numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT league_clans_pkey PRIMARY KEY (id),
  CONSTRAINT league_clans_league_history_id_fkey FOREIGN KEY (league_history_id) REFERENCES public.league_history(id)
);
CREATE TABLE public.league_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  season text NOT NULL,
  clan_tag text NOT NULL,
  clan_name text NOT NULL,
  league_name text,
  league_id integer,
  final_rank integer,
  total_stars integer DEFAULT 0,
  total_destruction numeric DEFAULT 0,
  result text CHECK (result = ANY (ARRAY['promoted'::text, 'demoted'::text, 'stayed'::text])),
  state text DEFAULT 'inProgress'::text CHECK (state = ANY (ARRAY['inProgress'::text, 'ended'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT league_history_pkey PRIMARY KEY (id),
  CONSTRAINT league_history_clan_tag_fkey FOREIGN KEY (clan_tag) REFERENCES public.tracked_clans(tag)
);
CREATE TABLE public.league_participants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  league_history_id uuid NOT NULL,
  player_tag text NOT NULL,
  player_name text NOT NULL,
  town_hall_level integer,
  total_stars integer DEFAULT 0,
  total_destruction numeric DEFAULT 0,
  attacks_used integer DEFAULT 0,
  map_position integer,
  daily_attacks jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  defense_stars integer,
  defense_destruction double precision,
  defense_attacker_tag text,
  CONSTRAINT league_participants_pkey PRIMARY KEY (id),
  CONSTRAINT league_participants_league_history_id_fkey FOREIGN KEY (league_history_id) REFERENCES public.league_history(id)
);
CREATE TABLE public.planning_members (
  tag text NOT NULL,
  clan_tag text NOT NULL,
  name text,
  war_status text DEFAULT 'available'::text CHECK (war_status = ANY (ARRAY['available'::text, 'excluded'::text])),
  cwl_status text DEFAULT 'available'::text CHECK (cwl_status = ANY (ARRAY['available'::text, 'excluded'::text])),
  war_note text CHECK (war_note = ANY (ARRAY['la prochaine guerre'::text, 'la semaine prochaine'::text, 'le mois prochain'::text, 'jamais'::text])),
  cwl_day integer,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT planning_members_pkey PRIMARY KEY (tag)
);
CREATE TABLE public.players (
  tag text NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT players_pkey PRIMARY KEY (tag)
);
CREATE TABLE public.strategies (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  army_link text,
  video_url text,
  min_town_hall integer,
  type text CHECK (type = ANY (ARRAY['ground'::text, 'air'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  image_url character varying,
  CONSTRAINT strategies_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tracked_clans (
  ordered numeric NOT NULL,
  tag text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  badge_url text,
  CONSTRAINT tracked_clans_pkey PRIMARY KEY (ordered)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  email text NOT NULL,
  username text UNIQUE,
  user_type text DEFAULT 'viewer'::text CHECK (user_type = ANY (ARRAY['super_admin'::text, 'admin'::text, 'editor'::text, 'viewer'::text])),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.war_history (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  start_date timestamp with time zone,
  end_date timestamp with time zone NOT NULL,
  team_size integer,
  clan_tag text NOT NULL,
  clan_name text,
  clan_stars integer,
  clan_destruction double precision,
  opponent_tag text NOT NULL,
  opponent_name text,
  opponent_stars integer,
  opponent_destruction double precision,
  result text,
  clan_badge_url text,
  opponent_badge_url text,
  CONSTRAINT war_history_pkey PRIMARY KEY (id),
  CONSTRAINT fk_war_history_tracked_clan FOREIGN KEY (clan_tag) REFERENCES public.tracked_clans(tag)
);
CREATE TABLE public.war_participants (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  war_id bigint NOT NULL,
  player_tag text NOT NULL,
  player_name text,
  stars integer DEFAULT 0,
  destruction double precision DEFAULT 0,
  attacks_count integer DEFAULT 0,
  town_hall_level integer,
  map_position integer,
  defense_stars integer,
  defense_destruction double precision,
  defense_attacker_tag text,
  attacks jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT war_participants_pkey PRIMARY KEY (id),
  CONSTRAINT war_participants_war_id_fkey FOREIGN KEY (war_id) REFERENCES public.war_history(id)
);