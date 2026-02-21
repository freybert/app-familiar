ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_daily BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_reset_date TEXT;
NOTIFY pgrst, 'reload schema';
