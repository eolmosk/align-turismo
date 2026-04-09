-- Cambiar topic de TEXT a TEXT[] para soportar múltiples temas por reunión/hilo
-- Postgres permite ALTER TYPE directamente con USING

ALTER TABLE meetings
  ALTER COLUMN topic TYPE TEXT[]
  USING CASE WHEN topic IS NOT NULL THEN ARRAY[topic] ELSE NULL END;

ALTER TABLE threads
  ALTER COLUMN topic TYPE TEXT[]
  USING CASE WHEN topic IS NOT NULL THEN ARRAY[topic] ELSE NULL END;
