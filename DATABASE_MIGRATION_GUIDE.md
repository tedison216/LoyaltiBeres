# Database Migration Guide

## Apply Transaction Status Update

You need to run the migration SQL to update your Supabase database with the new transaction status feature.

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `supabase/migration_add_transaction_status.sql`
5. Click **Run** to execute the migration
6. Verify success message appears

### Option 2: Supabase CLI

If you have Supabase CLI installed:

```bash
# From project root
supabase db push

# Or apply migration directly
psql -h <your-db-host> -U postgres -d postgres -f supabase/migration_add_transaction_status.sql
```

### Option 3: Manual Steps

If you prefer to apply changes manually:

```sql
-- 1. Add status column
ALTER TABLE transactions 
ADD COLUMN status TEXT CHECK (status IN ('active', 'cancelled')) DEFAULT 'active';

-- 2. Update existing records
UPDATE transactions SET status = 'active' WHERE status IS NULL;

-- 3. Create index
CREATE INDEX idx_transactions_status ON transactions(status);

-- 4. Add RLS policies (see migration file for complete policies)

-- 5. Update trigger functions (see migration file for complete functions)
```

## Verification

After running the migration, verify it worked:

```sql
-- Check if status column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'transactions' AND column_name = 'status';

-- Check if all transactions have status
SELECT COUNT(*) as total, status 
FROM transactions 
GROUP BY status;

-- Verify triggers exist
SELECT trigger_name 
FROM information_schema.triggers 
WHERE event_object_table = 'transactions';
```

Expected results:
- Status column should exist with type TEXT and default 'active'
- All transactions should have status = 'active'
- Two triggers should exist: `after_transaction_insert` and `after_transaction_cancel`

## Rollback (if needed)

If you need to rollback the changes:

```sql
-- Remove triggers
DROP TRIGGER IF EXISTS after_transaction_cancel ON transactions;
DROP FUNCTION IF EXISTS handle_transaction_cancellation();

-- Remove policies
DROP POLICY IF EXISTS "Admins can update transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can delete cancelled transactions" ON transactions;

-- Remove column
ALTER TABLE transactions DROP COLUMN IF EXISTS status;

-- Remove index
DROP INDEX IF EXISTS idx_transactions_status;
```

## Important Notes

⚠️ **Before Migration:**
- Backup your database
- Test in a development environment first
- Ensure no active transactions are being processed

✅ **After Migration:**
- All existing transactions will have status = 'active'
- The frontend code expects this field, so migration is required
- Test transaction cancellation and deletion features

## Troubleshooting

### Error: "column already exists"
The migration is idempotent and safe to run multiple times. This error means the column already exists.

### Error: "permission denied"
Ensure you're running the migration as a user with sufficient privileges (postgres superuser or database owner).

### Trigger not working
Verify triggers are enabled:
```sql
SELECT * FROM pg_trigger WHERE tgname LIKE '%transaction%';
```

## Support

If you encounter issues:
1. Check Supabase logs in the dashboard
2. Verify your database version is compatible (PostgreSQL 12+)
3. Ensure RLS is enabled on the transactions table
