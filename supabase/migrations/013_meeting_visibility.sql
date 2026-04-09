-- Tabla para vincular reuniones con usuarios del sistema (para visibilidad)
-- Distinto de meeting_contacts que vincula con contactos externos (familias, etc.)
CREATE TABLE IF NOT EXISTS meeting_participants (
  meeting_id  UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (meeting_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_participants_user ON meeting_participants(user_id);

-- Backfill: el creador de cada reunión siempre es participante
INSERT INTO meeting_participants (meeting_id, user_id)
SELECT id, user_id FROM meetings WHERE user_id IS NOT NULL
ON CONFLICT DO NOTHING;
