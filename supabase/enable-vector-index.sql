-- Run in Supabase SQL Editor after opportunity_embeddings has at least 100 rows.
-- The list count (10) is appropriate for the current ~100-row corpus; revisit it
-- as the corpus grows. IVFFlat needs ANALYZE after large ingestion batches.
CREATE INDEX IF NOT EXISTS idx_opportunity_embeddings_ivfflat
  ON public.opportunity_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

ANALYZE public.opportunity_embeddings;
