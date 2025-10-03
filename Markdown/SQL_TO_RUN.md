# SQL Scripts to Run in Supabase

## 🚀 Quick Start - Run These in Order

### Step 1: Run Migration V1 (Transaction Status)
**File:** `supabase/migration_add_transaction_status.sql`

This adds:
- Transaction status field
- Transaction cancellation triggers
- Customer deletion policy

### Step 2: Run Migration V2 (New Features)
**File:** `supabase/migration_v2_complete_features.sql`

This adds:
- Activity logs table
- Max redemptions per day
- Fraud prevention triggers
- All necessary indexes and policies

---

## ✅ Verification Queries

After running migrations, verify everything worked:

```sql
-- 1. Check if activity_logs table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'activity_logs';

-- 2. Check if max_redemptions_per_day column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'restaurants' 
  AND column_name = 'max_redemptions_per_day';

-- 3. Check if transaction status column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'transactions' 
  AND column_name = 'status';

-- 4. Verify triggers exist
SELECT trigger_name, event_object_table
FROM information_schema.triggers 
WHERE event_object_table IN ('transactions', 'redemptions')
ORDER BY event_object_table, trigger_name;

-- 5. Check RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('activity_logs', 'transactions', 'profiles')
ORDER BY tablename, policyname;

-- 6. Verify indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('activity_logs', 'transactions')
ORDER BY tablename, indexname;
```

---

## 🔧 Optional: Update Existing Data

If you have existing data, you may want to:

```sql
-- Set all existing transactions to 'active' status
UPDATE transactions 
SET status = 'active' 
WHERE status IS NULL;

-- Set default max redemptions for existing restaurants
UPDATE restaurants 
SET max_redemptions_per_day = 3 
WHERE max_redemptions_per_day IS NULL;
```

---

## 📊 Test Queries

Test the new features:

```sql
-- 1. Test activity logging
SELECT * FROM activity_logs 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Check redemption limits
SELECT 
  r.id,
  r.name,
  r.max_redemptions_per_day,
  COUNT(rd.id) as today_redemptions
FROM restaurants r
LEFT JOIN redemptions rd ON rd.restaurant_id = r.id 
  AND DATE(rd.created_at) = CURRENT_DATE
  AND rd.status IN ('pending', 'verified')
GROUP BY r.id, r.name, r.max_redemptions_per_day;

-- 3. Check transaction statuses
SELECT 
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM transactions
GROUP BY status;

-- 4. View recent activity logs with details
SELECT 
  al.action_type,
  al.target_type,
  al.created_at,
  p.full_name as performed_by,
  al.details
FROM activity_logs al
LEFT JOIN profiles p ON p.id = al.performed_by
ORDER BY al.created_at DESC
LIMIT 20;
```

---

## 🛠️ Troubleshooting

### If migration fails:

1. **Check for existing objects:**
```sql
-- Drop existing objects if needed
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP FUNCTION IF EXISTS log_activity CASCADE;
DROP FUNCTION IF EXISTS check_max_redemptions_per_day CASCADE;
DROP TRIGGER IF EXISTS check_redemption_limit ON redemptions;
```

2. **Then re-run the migration**

### If RLS policies conflict:

```sql
-- Drop all policies for a table
DROP POLICY IF EXISTS "Admins can view restaurant activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Admins can create activity logs" ON activity_logs;

-- Then re-run the migration
```

---

## 📝 Notes

- Both migrations are **idempotent** - safe to run multiple times
- Use `IF NOT EXISTS` and `IF EXISTS` clauses prevent errors
- All changes are backwards compatible
- No data loss will occur

---

## 🎯 Expected Results

After running both migrations, you should have:

✅ 7 tables total:
- restaurants (updated)
- profiles (updated)
- rewards
- promotions
- transactions (updated)
- redemptions (updated)
- activity_logs (new)

✅ 4 new indexes on activity_logs
✅ 2 new RLS policies on activity_logs
✅ 3 new database functions
✅ 2 new triggers

---

## 🚨 Important

**BACKUP YOUR DATABASE FIRST!**

While these migrations are safe, always backup before making schema changes:

1. Go to Supabase Dashboard
2. Database → Backups
3. Create manual backup
4. Then run migrations

---

## ✨ You're Done!

After running these migrations, all database changes are complete.
The app will have full support for:
- Activity logging
- Fraud prevention
- Transaction status tracking
- CSV export/import
- Data management
