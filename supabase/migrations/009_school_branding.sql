-- Branding por escuela: logo y paleta de colores
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS color_primary TEXT DEFAULT '#CD4700',
  ADD COLUMN IF NOT EXISTS color_secondary TEXT DEFAULT '#7C7066',
  ADD COLUMN IF NOT EXISTS color_accent TEXT DEFAULT '#E05A00';
