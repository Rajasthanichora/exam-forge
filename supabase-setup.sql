-- Supabase Database Setup for ExamForge AI
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/bczfxxlnhhwrbsnspeat/sql-editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- App Settings Table (stores API key and active section)
CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  api_key TEXT DEFAULT '',
  gemini_api_key TEXT DEFAULT '',
  ai_provider TEXT DEFAULT 'openrouter',
  active_section_id TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO app_settings (id, api_key, gemini_api_key, ai_provider, active_section_id)
VALUES (1, '', '', 'openrouter', NULL)
ON CONFLICT (id) DO NOTHING;

-- Sections Table
CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  pasted_notes TEXT DEFAULT ''
);

-- Saved Documents Table
CREATE TABLE IF NOT EXISTS saved_documents (
  id TEXT PRIMARY KEY,
  section_id TEXT REFERENCES sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  size INTEGER NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stored Questions Table (for deduplication)
CREATE TABLE IF NOT EXISTS stored_questions (
  id SERIAL PRIMARY KEY,
  section_id TEXT REFERENCES sections(id) ON DELETE CASCADE,
  test_id TEXT REFERENCES test_results(id) ON DELETE CASCADE,
  question_hash TEXT NOT NULL,
  question_text TEXT NOT NULL,
  topic TEXT,
  date_used TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test Results Table
CREATE TABLE IF NOT EXISTS test_results (
  id TEXT PRIMARY KEY,
  section_id TEXT REFERENCES sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  config JSONB NOT NULL,
  questions JSONB NOT NULL,
  answers JSONB NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  time_taken INTEGER
);

-- Migration helper (safe to run multiple times):
-- If stored_questions already exists, ensure test_id column + FK exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'stored_questions'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'stored_questions' AND column_name = 'test_id'
    ) THEN
      ALTER TABLE public.stored_questions ADD COLUMN test_id TEXT;
    END IF;

    -- Add FK if missing (ignore if already exists)
    BEGIN
      ALTER TABLE public.stored_questions
        ADD CONSTRAINT stored_questions_test_id_fkey
        FOREIGN KEY (test_id) REFERENCES public.test_results(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN
      -- constraint already exists
      NULL;
    END;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_saved_documents_section_id ON saved_documents(section_id);
CREATE INDEX IF NOT EXISTS idx_stored_questions_section_id ON stored_questions(section_id);
CREATE INDEX IF NOT EXISTS idx_stored_questions_test_id ON stored_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_stored_questions_hash ON stored_questions(question_hash);
CREATE INDEX IF NOT EXISTS idx_test_results_section_id ON test_results(section_id);
CREATE INDEX IF NOT EXISTS idx_test_results_date ON test_results(date);

-- Enable Row Level Security (RLS) - optional, for authenticated users only
-- For now, we allow public access for the demo

-- Ensure public (anon/authenticated) can read/write for demo apps.
-- If you later enable auth/RLS, replace this with proper policies.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_settings TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sections TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON saved_documents TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON stored_questions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON test_results TO anon, authenticated;

-- Needed for SERIAL columns (stored_questions.id) when inserting
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Add comments for documentation
COMMENT ON TABLE app_settings IS 'Stores app-wide settings like API key and active section';
COMMENT ON TABLE sections IS 'User-created sections for organizing study materials';
COMMENT ON TABLE saved_documents IS 'Documents uploaded by users within sections';
COMMENT ON TABLE stored_questions IS 'Question history for deduplication purposes';
COMMENT ON TABLE test_results IS 'Test results and answers stored per section';
