create table public.strategies (
  id uuid not null default extensions.uuid_generate_v4 (),
  title text not null,
  description text null,
  army_link text null,
  video_url text null,
  min_town_hall integer null,
  type text null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  image_url character varying null,
  constraint strategies_pkey primary key (id),
  constraint strategies_type_check check (
    (
      type = any (
        array['ground'::text, 'air'::text, 'hybrid'::text]
      )
    )
  )
) TABLESPACE pg_default;