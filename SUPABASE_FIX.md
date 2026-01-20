# Fix Supabase "record 'new' has no field 'version'" Error

## Problem
This error occurs when there's a mismatch between what the app sends and what the database expects.

## Solution

Go to your Supabase project → **SQL Editor** and run these commands:

### Step 1: Check for triggers (most likely cause)
```sql
-- List all triggers on user_data table
SELECT
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'user_data';
```

If you see any triggers, drop them:
```sql
-- Replace 'trigger_name_here' with actual trigger name from above
DROP TRIGGER IF EXISTS trigger_name_here ON user_data;
```

### Step 2: Verify table structure
```sql
-- Check current columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_data';
```

You should ONLY see:
- id (uuid)
- user_id (uuid)
- data (jsonb)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

### Step 3: If table has wrong columns, recreate it
```sql
-- BACKUP YOUR DATA FIRST!
-- Export data before running this
SELECT * FROM user_data;

-- Drop and recreate table with correct schema
DROP TABLE IF EXISTS user_data CASCADE;

CREATE TABLE user_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can CRUD their own data"
  ON user_data
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index
CREATE INDEX idx_user_data_user_id ON user_data(user_id);
```

### Step 4: Test the fix
After running the above, try syncing again in the app.

## Alternative: Add version column (if you want to keep existing setup)
If recreating the table is not an option, you can add the version column:

```sql
ALTER TABLE user_data ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1.0';
```

But this is NOT recommended - it's better to fix the schema properly.
