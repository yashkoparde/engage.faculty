import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/**
 * Get credentials from either environment variables or local storage.
 */
export function getSupabaseCredentials(): SupabaseConfig | null {
  // Check localStorage first (user-defined in UI)
  const storedUrl = localStorage.getItem('supabase_url');
  const storedKey = localStorage.getItem('supabase_anon_key');

  if (storedUrl && storedKey) {
    return { url: storedUrl, anonKey: storedKey };
  }

  // Fallback to Vite environment variables or default configured credentials
  // @ts-ignore
  const envUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://eobueywpicipvrzuapdu.supabase.co';
  // @ts-ignore
  const envKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_bnEwwndlllwc8BriKWzl4A_RMeyNATa';

  if (envUrl && envKey) {
    return { url: envUrl, anonKey: envKey };
  }

  return null;
}

/**
 * Save user credentials to local storage so they persist across reloads.
 */
export function saveSupabaseCredentials(url: string, anonKey: string): void {
  localStorage.setItem('supabase_url', url.trim());
  localStorage.setItem('supabase_anon_key', anonKey.trim());
  supabaseInstance = null; // Reset cached client
}

/**
 * Clear stored credentials.
 */
export function clearSupabaseCredentials(): void {
  localStorage.removeItem('supabase_url');
  localStorage.removeItem('supabase_anon_key');
  supabaseInstance = null;
}

/**
 * Lazy initializer for Supabase.
 * Returns null if credentials are not configured yet, rather than throwing a crash.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const credentials = getSupabaseCredentials();
  if (!credentials || !credentials.url || !credentials.anonKey) {
    return null;
  }

  try {
    supabaseInstance = createClient(credentials.url, credentials.anonKey, {
      auth: {
        persistSession: false,
      }
    });
    return supabaseInstance;
  } catch (err) {
    console.warn('Failed to initialize Supabase Client:', err);
    return null;
  }
}

/**
 * SQL Schema script to easily bootstrap the Supabase database.
 */
export const SUPABASE_SQL_SCHEMA = `-- COPY AND RUN THIS IN YOUR SUPABASE SQL EDITOR

-- 1. Create the Core tables
CREATE TABLE IF NOT EXISTS rooms (
  room_code VARCHAR(10) PRIMARY KEY,
  teacher_name VARCHAR(100) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  current_activity_id VARCHAR(50),
  current_question_text TEXT,
  current_options TEXT[],
  current_correct_answer VARCHAR(5),
  activity_status VARCHAR(20) DEFAULT 'idle', -- 'idle', 'active', 'revealed'
  state VARCHAR(20) DEFAULT 'lobby', -- 'lobby', 'launcher', 'monitor', 'leaderboard', 'ended'
  timer_duration INT DEFAULT 30,
  timer_remaining INT DEFAULT 30,
  timer_started_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_activities (
  id VARCHAR(100) NOT NULL,
  room_code VARCHAR(10) REFERENCES rooms(room_code) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_answer VARCHAR(5) NOT NULL,
  time_limit INT DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_code, id)
);

CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code VARCHAR(10) REFERENCES rooms(room_code) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  score INT DEFAULT 0,
  streak INT DEFAULT 0,
  is_connected BOOLEAN DEFAULT true,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_student_per_room UNIQUE (room_code, name)
);

CREATE TABLE IF NOT EXISTS submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code VARCHAR(10) REFERENCES rooms(room_code) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  student_name VARCHAR(100) NOT NULL,
  activity_id VARCHAR(50) NOT NULL,
  choice VARCHAR(5) NOT NULL, -- 'A', 'B', 'C', 'D'
  speed_ms INT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS confusion_votes (
  student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  room_code VARCHAR(10) REFERENCES rooms(room_code) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL, -- 'understood', 'partial', 'confused'
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create the Auxiliary tables (Optional but recommended for full tab persistence)
CREATE TABLE IF NOT EXISTS qa_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code VARCHAR(10) REFERENCES rooms(room_code) ON DELETE CASCADE,
  student_name VARCHAR(100) NOT NULL,
  question_text TEXT NOT NULL,
  votes INT DEFAULT 1,
  is_answered BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS active_polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code VARCHAR(10) REFERENCES rooms(room_code) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT false,
  votes JSONB DEFAULT '{}'::jsonb,
  total_votes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS speedtyper_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code VARCHAR(10) REFERENCES rooms(room_code) ON DELETE CASCADE,
  student_name VARCHAR(100) NOT NULL,
  word VARCHAR(50) NOT NULL,
  time_seconds DECIMAL(5,2) NOT NULL,
  wpm INT NOT NULL,
  accuracy INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Realtime Publications
-- Make sure to enable realtime replication for these tables in the Supabase Dashboard
-- under Database -> Replication -> supabase_realtime publication:
-- ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
-- ALTER PUBLICATION supabase_realtime ADD TABLE students;
-- ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE confusion_votes;
-- ALTER PUBLICATION supabase_realtime ADD TABLE qa_questions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE active_polls;
-- ALTER PUBLICATION supabase_realtime ADD TABLE speedtyper_records;
`;
