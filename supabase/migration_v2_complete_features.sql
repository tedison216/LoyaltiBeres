-- ============================================================================
-- Migration V2: Complete Feature Set
-- ============================================================================
-- This migration adds:
-- 1. Activity logs for audit trail
-- 2. Max redemptions per day (fraud prevention)
-- 3. All necessary indexes and policies
-- ============================================================================

-- Add max_redemptions_per_day to restaurants table
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS max_redemptions_per_day INTEGER DEFAULT 3;

COMMENT ON COLUMN restaurants.max_redemptions_per_day IS 'Fraud prevention: maximum redemptions allowed per customer per day';

-- Create activity_logs table for audit trail
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE activity_logs IS 'Audit trail for sensitive operations';
COMMENT ON COLUMN activity_logs.action_type IS 'Type of action: points_adjustment, transaction_cancelled, customer_deleted, etc.';
COMMENT ON COLUMN activity_logs.target_type IS 'Type of target: customer, transaction, redemption';
COMMENT ON COLUMN activity_logs.details IS 'Additional context stored as JSON';

-- Create indexes for activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_restaurant ON activity_logs(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_performed_by ON activity_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- Enable RLS on activity_logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Activity Logs RLS policies
DROP POLICY IF EXISTS "Admins can view restaurant activity logs" ON activity_logs;
CREATE POLICY "Admins can view restaurant activity logs" ON activity_logs
  FOR SELECT USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can create activity logs" ON activity_logs;
CREATE POLICY "Admins can create activity logs" ON activity_logs
  FOR INSERT WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
  p_restaurant_id UUID,
  p_performed_by UUID,
  p_action_type TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO activity_logs (
    restaurant_id,
    performed_by,
    action_type,
    target_type,
    target_id,
    details
  ) VALUES (
    p_restaurant_id,
    p_performed_by,
    p_action_type,
    p_target_type,
    p_target_id,
    p_details
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_activity IS 'Helper function to create activity log entries';

-- Function to check max redemptions per day
CREATE OR REPLACE FUNCTION check_max_redemptions_per_day()
RETURNS TRIGGER AS $$
DECLARE
  v_max_redemptions INTEGER;
  v_today_redemptions INTEGER;
BEGIN
  -- Get max redemptions setting
  SELECT max_redemptions_per_day INTO v_max_redemptions
  FROM restaurants
  WHERE id = NEW.restaurant_id;
  
  -- Count today's redemptions for this customer
  SELECT COUNT(*) INTO v_today_redemptions
  FROM redemptions
  WHERE customer_id = NEW.customer_id
    AND restaurant_id = NEW.restaurant_id
    AND DATE(created_at) = CURRENT_DATE
    AND status IN ('pending', 'verified');
  
  -- Check if limit exceeded
  IF v_today_redemptions >= v_max_redemptions THEN
    RAISE EXCEPTION 'Maximum redemptions per day (%) exceeded. Customer has already redeemed % times today.', 
      v_max_redemptions, v_today_redemptions;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_max_redemptions_per_day IS 'Fraud prevention: Prevents customers from exceeding daily redemption limit';

-- Add trigger for max redemptions check
DROP TRIGGER IF EXISTS check_redemption_limit ON redemptions;
CREATE TRIGGER check_redemption_limit
  BEFORE INSERT ON redemptions
  FOR EACH ROW
  EXECUTE FUNCTION check_max_redemptions_per_day();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON activity_logs TO authenticated;
GRANT EXECUTE ON FUNCTION log_activity TO authenticated;
GRANT EXECUTE ON FUNCTION check_max_redemptions_per_day TO authenticated;

-- Verification queries
DO $$
BEGIN
  RAISE NOTICE 'Migration V2 completed successfully!';
  RAISE NOTICE 'Verify with: SELECT column_name FROM information_schema.columns WHERE table_name = ''restaurants'' AND column_name = ''max_redemptions_per_day'';';
  RAISE NOTICE 'Verify with: SELECT COUNT(*) FROM activity_logs;';
END $$;
