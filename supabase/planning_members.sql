create table public.planning_members (
  tag text not null,
  clan_tag text not null,
  name text null,
  war_status text null default 'available'::text,
  cwl_status text null default 'available'::text,
  war_note text null,
  cwl_day integer null,
  updated_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint planning_members_pkey primary key (tag),
  constraint planning_members_cwl_status_check check (
    (
      cwl_status = any (array['available'::text, 'excluded'::text])
    )
  ),
  constraint planning_members_no_double_exclusion_check check (
    (
      not (
        (war_status = 'excluded'::text)
        and (cwl_status = 'excluded'::text)
      )
    )
  ),
  constraint planning_members_war_note_check check (
    (
      war_note = any (
        array[
          'la prochaine guerre'::text,
          'la semaine prochaine'::text,
          'le mois prochain'::text,
          'jamais'::text
        ]
      )
    )
  ),
  constraint planning_members_war_status_check check (
    (
      war_status = any (array['available'::text, 'excluded'::text])
    )
  )
) TABLESPACE pg_default;