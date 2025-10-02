-- Migration: Add status field to transactions table
-- This migration adds transaction status tracking and proper deletion handling

-- Add status column to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('active', 'cancelled')) DEFAULT 'active';

-- Update existing transactions to have 'active' status
UPDATE transactions 
SET status = 'active' 
WHERE status IS NULL;

-- Create index for status field
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Update RLS policies for transactions
DROP POLICY IF EXISTS "Admins can update transactions" ON transactions;
CREATE POLICY "Admins can update transactions" ON transactions
  FOR UPDATE USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete cancelled transactions" ON transactions;
CREATE POLICY "Admins can delete cancelled transactions" ON transactions
  FOR DELETE USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
    AND status = 'cancelled'
  );

-- Update trigger function to only add points/stamps for active transactions
CREATE OR REPLACE FUNCTION update_customer_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add points/stamps for active transactions
  IF NEW.status = 'active' THEN
    UPDATE profiles
    SET 
      points = points + NEW.points_earned,
      stamps = stamps + NEW.stamps_earned
    WHERE id = NEW.customer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to handle transaction cancellation
DROP TRIGGER IF EXISTS after_transaction_cancel ON transactions;
DROP FUNCTION IF EXISTS handle_transaction_cancellation();

CREATE OR REPLACE FUNCTION handle_transaction_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  -- If transaction is being cancelled, deduct the points/stamps
  IF NEW.status = 'cancelled' AND OLD.status = 'active' THEN
    UPDATE profiles
    SET 
      points = GREATEST(0, points - OLD.points_earned),
      stamps = GREATEST(0, stamps - OLD.stamps_earned)
    WHERE id = OLD.customer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_transaction_cancel
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION handle_transaction_cancellation();

-- Add policy for admins to delete customer profiles
DROP POLICY IF EXISTS "Admins can delete customer profiles" ON profiles;
CREATE POLICY "Admins can delete customer profiles" ON profiles
  FOR DELETE USING (
    role = 'customer' AND restaurant_id IN (
      SELECT restaurant_id FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
