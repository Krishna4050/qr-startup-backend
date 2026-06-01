-- Add the new push_tokens array column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_tokens text[] DEFAULT '{}';

-- Optional: If you want to migrate existing users' single tokens into the array
UPDATE profiles 
SET push_tokens = ARRAY[expo_push_token] 
WHERE expo_push_token IS NOT NULL AND expo_push_token != '';

-- We can leave the old expo_push_token column for now as a backup, 
-- or you can drop it later once everything is verified working:
-- ALTER TABLE profiles DROP COLUMN expo_push_token;
