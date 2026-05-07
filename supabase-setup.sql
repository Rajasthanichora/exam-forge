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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_saved_documents_section_id ON saved_documents(section_id);
CREATE INDEX IF NOT EXISTS idx_stored_questions_section_id ON stored_questions(section_id);
CREATE INDEX IF NOT EXISTS idx_stored_questions_hash ON stored_questions(question_hash);
CREATE INDEX IF NOT EXISTS idx_test_results_section_id ON test_results(section_id);
CREATE INDEX IF NOT EXISTS idx_test_results_date ON test_results(date);

-- Enable Row Level Security (RLS) - optional, for authenticated users only
-- For now, we allow public access for the demo

-- Add comments for documentation
COMMENT ON TABLE app_settings IS 'Stores app-wide settings like API key and active section';
COMMENT ON TABLE sections IS 'User-created sections for organizing study materials';
COMMENT ON TABLE saved_documents IS 'Documents uploaded by users within sections';
COMMENT ON TABLE stored_questions IS 'Question history for deduplication purposes';
COMMENT ON TABLE test_results IS 'Test results and answers stored per section';
