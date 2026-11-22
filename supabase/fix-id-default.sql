-- Run this in Supabase SQL Editor to fix the id column auto-generation
-- The issue: id column was created as uuid NOT NULL but without a default

-- Check current column definition
SELECT column_name, column_default, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'opportunities' AND column_name = 'id';

-- Fix: set the default to gen_random_uuid()
ALTER TABLE opportunities ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Verify fix
SELECT column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'opportunities' AND column_name = 'id';

