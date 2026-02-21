ALTER TABLE tasks ADD COLUMN IF NOT EXISTS evidencia_url TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tipo_mision TEXT DEFAULT 'obligatoria';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS robada BOOLEAN DEFAULT false;
NOTIFY pgrst, 'reload schema';
