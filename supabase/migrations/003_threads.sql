-- ============================================================
-- MIGRACIÓN 003 — Hilos de conversación (threads)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Tabla de hilos
CREATE TABLE threads (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id),
  name             TEXT NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('docentes','padres','individual','direccion')),
  participants     TEXT,
  description      TEXT,
  archived         BOOLEAN DEFAULT FALSE,
  last_meeting_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar thread_id a meetings (opcional para no romper reuniones existentes)
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES threads(id) ON DELETE SET NULL;

-- Índices
CREATE INDEX idx_threads_school   ON threads(school_id);
CREATE INDEX idx_threads_user     ON threads(user_id);
CREATE INDEX idx_meetings_thread  ON meetings(thread_id);

-- RLS
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "threads_by_school" ON threads
  FOR ALL USING (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()::UUID
    )
  );
