-- Agregar columna status a users
-- 'pending' = recién registrado, esperando aprobación
-- 'active'  = acceso completo
-- 'inactive'= desactivado por el admin

ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Marcar como active a todos los usuarios que ya tienen escuela asignada
UPDATE users SET status = 'active' WHERE school_id IS NOT NULL AND status = 'pending';
