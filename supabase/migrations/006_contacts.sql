-- ─── Contactos ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contacts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  email        TEXT,
  phone        TEXT,
  role         TEXT,            -- libre: 'docente', 'padre', 'tutor', 'alumno', etc.
  external_id  TEXT,            -- ID en sistema externo (Handing, etc.)
  source       TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'csv' | 'handing'
  metadata     JSONB,           -- campos extra del CSV sin columna propia
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, email),
  UNIQUE (school_id, external_id)
);

CREATE INDEX IF NOT EXISTS contacts_school_id_idx ON contacts(school_id);
CREATE INDEX IF NOT EXISTS contacts_name_idx ON contacts USING gin(to_tsvector('spanish', name));

-- ─── Meeting ↔ Contactos ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meeting_contacts (
  meeting_id  UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  contact_id  UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  PRIMARY KEY (meeting_id, contact_id)
);

CREATE INDEX IF NOT EXISTS meeting_contacts_contact_id_idx ON meeting_contacts(contact_id);

-- ─── Thread ↔ Contactos ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS thread_contacts (
  thread_id   UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  contact_id  UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  PRIMARY KEY (thread_id, contact_id)
);

CREATE INDEX IF NOT EXISTS thread_contacts_contact_id_idx ON thread_contacts(contact_id);

-- ─── Topic en meetings y threads ──────────────────────────────────────────────
-- Vocabulario controlado: pedagógico | disciplinario | familiar |
--                         institucional | curricular | administrativo

ALTER TABLE meetings ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE threads  ADD COLUMN IF NOT EXISTS topic TEXT;

-- ─── Trigger updated_at en contacts ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contacts_updated_at ON contacts;
CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
