-- Asignación estructurada de acciones: a un usuario O a un contacto.
-- Mantenemos la columna `assigned_to` (texto libre) para legacy.

ALTER TABLE meeting_actions
  ADD COLUMN IF NOT EXISTS assigned_user_id    UUID REFERENCES users(id)    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_actions_assigned_user    ON meeting_actions(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_actions_assigned_contact ON meeting_actions(assigned_contact_id);
