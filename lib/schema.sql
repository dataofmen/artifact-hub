-- Artifact Hub schema.
-- Apply with: pnpm db:push

create extension if not exists pg_trgm;

create table if not exists artifacts (
  id             uuid primary key default gen_random_uuid(),
  slug           text        not null unique,
  title          text        not null,
  description    text,
  -- Free-form so a new kind never needs a migration.
  kind           text        not null default 'html',
  tags           text[]      not null default '{}',
  -- 'private' is only reachable through an authenticated route; 'public'
  -- artifacts are additionally served at /p/<slug> without a session.
  visibility     text        not null default 'private',
  blob_pathname  text        not null,
  size_bytes     integer     not null default 0,
  version        integer     not null default 1,
  -- Where it came from: a project name, conversation, "downloads", ...
  source         text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint artifacts_visibility_check check (visibility in ('private', 'public'))
);

-- Re-uploading the same slug keeps the old file addressable.
create table if not exists artifact_versions (
  id             uuid primary key default gen_random_uuid(),
  artifact_id    uuid        not null references artifacts (id) on delete cascade,
  version        integer     not null,
  blob_pathname  text        not null,
  size_bytes     integer     not null default 0,
  created_at     timestamptz not null default now(),
  unique (artifact_id, version)
);

create index if not exists artifacts_created_idx on artifacts (created_at desc);
create index if not exists artifacts_tags_idx    on artifacts using gin (tags);
create index if not exists artifacts_title_trgm  on artifacts using gin (title gin_trgm_ops);
