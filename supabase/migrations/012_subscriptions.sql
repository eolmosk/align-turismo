-- Subscriptions / billing manual (Fase 0)
-- Permite trackear trials y pagos sin integración con Stripe/MP todavía.

CREATE TABLE IF NOT EXISTS subscriptions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
  plan             TEXT NOT NULL DEFAULT 'trial',
  status           TEXT NOT NULL DEFAULT 'trialing',
  trial_ends_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  active_until     TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- plan: 'trial' | 'solo' | 'institucional' | 'grupo_5' | 'grupo_10'
-- status: 'trialing' | 'active' | 'expired' | 'canceled'

CREATE INDEX IF NOT EXISTS idx_subscriptions_school_id ON subscriptions(school_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Backfill: todas las escuelas existentes quedan como 'active'
-- con 30 días de gracia para no bloquearlas.
INSERT INTO subscriptions (school_id, plan, status, active_until, notes)
SELECT
  s.id,
  'institucional',
  'active',
  NOW() + INTERVAL '30 days',
  'Grandfathered — escuela preexistente al sistema de billing'
FROM schools s
WHERE NOT EXISTS (SELECT 1 FROM subscriptions sub WHERE sub.school_id = s.id)
ON CONFLICT (school_id) DO NOTHING;
