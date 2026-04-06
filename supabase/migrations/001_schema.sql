-- ============================================================
-- ESQUEMA COMPLETO — Gestor de Reuniones
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ESCUELAS ────────────────────────────────────────────────
CREATE TABLE schools (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  group_name  TEXT,                        -- nombre del grupo (ej: "Red Educativa Norte")
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── USUARIOS / DIRECTORES ───────────────────────────────────
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  avatar_url  TEXT,
  role        TEXT DEFAULT 'director',    -- 'director' | 'admin_group'
  school_id   UUID REFERENCES schools(id),
  google_refresh_token TEXT,              -- para Calendar y Drive
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── REUNIONES ───────────────────────────────────────────────
CREATE TABLE meetings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  title           TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('docentes','padres','individual','direccion')),
  meeting_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  next_date       DATE,
  next_time       TIME,
  next_duration   INT DEFAULT 60,
  participants    TEXT,
  notes           TEXT NOT NULL,
  input_method    TEXT DEFAULT 'text' CHECK (input_method IN ('text','voice','file')),
  -- IA output
  ai_questions    TEXT[],                 -- array de 3 preguntas generadas
  ai_commitments  TEXT[],                 -- array de compromisos detectados
  ai_summary      TEXT,                   -- resumen ejecutivo
  -- integraciones Google
  calendar_event_id  TEXT,               -- ID del evento en Google Calendar
  drive_doc_id       TEXT,               -- ID del doc en Google Drive
  drive_doc_url      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ACCIONES / CHECKLIST ────────────────────────────────────
CREATE TABLE meeting_actions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id  UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  done        BOOLEAN DEFAULT FALSE,
  done_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ÍNDICES ─────────────────────────────────────────────────
CREATE INDEX idx_meetings_school    ON meetings(school_id);
CREATE INDEX idx_meetings_user      ON meetings(user_id);
CREATE INDEX idx_meetings_date      ON meetings(meeting_date DESC);
CREATE INDEX idx_actions_meeting    ON meeting_actions(meeting_id);

-- ─── UPDATED_AT AUTO ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meetings_updated_at
  BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
ALTER TABLE schools       ENABLE ROW LEVEL SECURITY;
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_actions ENABLE ROW LEVEL SECURITY;

-- Directores solo ven su escuela; admin_group ve todas las de su grupo
CREATE POLICY "users_own" ON users
  FOR ALL USING (id = auth.uid()::UUID OR
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid()::UUID AND u.role = 'admin_group'));

CREATE POLICY "meetings_by_school" ON meetings
  FOR ALL USING (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()::UUID
    )
  );

CREATE POLICY "actions_by_meeting" ON meeting_actions
  FOR ALL USING (
    meeting_id IN (
      SELECT id FROM meetings WHERE school_id IN (
        SELECT school_id FROM users WHERE id = auth.uid()::UUID
      )
    )
  );

CREATE POLICY "schools_visible" ON schools
  FOR SELECT USING (
    id IN (SELECT school_id FROM users WHERE id = auth.uid()::UUID)
    OR
    group_name IN (SELECT s.group_name FROM schools s JOIN users u ON u.school_id = s.id WHERE u.id = auth.uid()::UUID AND u.role = 'admin_group')
  );

-- ─── DATOS DEMO ──────────────────────────────────────────────
INSERT INTO schools (id, name, group_name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Escuela Demo 1', 'Red Educativa Demo'),
  ('22222222-2222-2222-2222-222222222222', 'Escuela Demo 2', 'Red Educativa Demo');
