-- Agregar campo assigned_to a meeting_actions
ALTER TABLE meeting_actions ADD COLUMN IF NOT EXISTS assigned_to TEXT;
