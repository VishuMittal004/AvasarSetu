-- Keep this migration aligned with supabase/schema.sql for existing projects.
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'english',
      coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(issuing_authority, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_opportunities_fts
  ON public.opportunities USING GIN (search_vector);
