-- Tabla many-to-many: usuarios con acceso a múltiples escuelas
CREATE TABLE IF NOT EXISTS user_schools (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'docente',
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, school_id)
);

CREATE INDEX idx_user_schools_user   ON user_schools(user_id);
CREATE INDEX idx_user_schools_school ON user_schools(school_id);

-- Backfill: poblar desde usuarios existentes
INSERT INTO user_schools (user_id, school_id, role)
SELECT id, school_id, role FROM users WHERE school_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Dar acceso a todas las escuelas al usuario admin
INSERT INTO user_schools (user_id, school_id, role)
SELECT '757692ca-333e-469d-a9eb-d370db452cde', id, 'owner'
FROM schools
ON CONFLICT DO NOTHING;
