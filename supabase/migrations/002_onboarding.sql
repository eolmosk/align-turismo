-- Agregar columna onboarded a users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT FALSE;

-- Los usuarios existentes que ya tienen school_id asignado
-- los marcamos como onboarded para que no vean el wizard
UPDATE users SET onboarded = TRUE WHERE school_id IS NOT NULL;
