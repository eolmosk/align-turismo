-- Migración 005: campos de metadata académica en threads y meetings
-- Ejecutar en Supabase SQL Editor

ALTER TABLE threads
  ADD COLUMN IF NOT EXISTS course TEXT,
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS academic_year INT,
  ADD COLUMN IF NOT EXISTS tags TEXT[];

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS course TEXT,
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS academic_year INT,
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Índices para filtros frecuentes
CREATE INDEX IF NOT EXISTS idx_meetings_course ON meetings(course);
CREATE INDEX IF NOT EXISTS idx_meetings_academic_year ON meetings(academic_year);
CREATE INDEX IF NOT EXISTS idx_threads_course ON threads(course);
CREATE INDEX IF NOT EXISTS idx_threads_academic_year ON threads(academic_year);
