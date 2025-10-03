# Customer Pre-Registration System

## Overview

The customer pre-registration system allows admins to add customers before they log in. When customers later log in with their phone or email, they are automatically linked to the restaurant.

## How It Works

### 1. Admin Adds Customer
- Admin goes to **Customers** page
- Clicks **Add** button
- Enters customer name, phone, and/or email
- Customer is added to `customer_preregistrations` table

### 2. Customer Logs In
- Customer logs in with their phone or email
- System checks `customer_preregistrations` table
- If match found, customer is automatically linked to the restaurant
- Profile is created with restaurant_id set

### 3. Automatic Linking
- When onboarding completes, the preregistration is marked as linked
- Customer can immediately start earning points/stamps
- Admin can see them in the customers list

## Database Schema

```sql
CREATE TABLE customer_preregistrations (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id),
  full_name TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP,
  created_by UUID REFERENCES profiles(id),
  linked_profile_id UUID REFERENCES profiles(id),
  UNIQUE(restaurant_id, phone),
  UNIQUE(restaurant_id, email)
);
```

## Benefits

✅ **No Foreign Key Violations**: Preregistrations don't require auth.users entries
✅ **Automatic Linking**: Customers are linked when they log in
✅ **Duplicate Prevention**: UNIQUE constraints prevent duplicate entries
✅ **Audit Trail**: Tracks who created the preregistration and when
✅ **Clean Separation**: Preregistrations are separate from actual profiles

## Usage

### Admin Workflow
1. Customer walks into restaurant
2. Admin asks for phone number
3. Admin adds customer in system
4. Customer can start earning rewards immediately (when they log in)

### Customer Workflow
1. Customer receives SMS/email about loyalty program
2. Customer logs in with their phone/email
3. Automatically linked to restaurant
4. Completes onboarding (enters name)
5. Starts using loyalty features

## SQL Setup

Run this in Supabase SQL Editor to create the table:

```sql
-- Create preregistrations table
CREATE TABLE IF NOT EXISTS customer_preregistrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  linked_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(restaurant_id, phone),
  UNIQUE(restaurant_id, email)
);

-- Enable RLS
ALTER TABLE customer_preregistrations ENABLE ROW LEVEL SECURITY;

-- Admins can manage preregistrations
CREATE POLICY "Admins can manage preregistrations" ON customer_preregistrations
  FOR ALL USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX idx_preregistrations_restaurant ON customer_preregistrations(restaurant_id);
CREATE INDEX idx_preregistrations_phone ON customer_preregistrations(phone);
CREATE INDEX idx_preregistrations_email ON customer_preregistrations(email);
```

## Files Modified

1. **app/admin/customers/page.tsx**
   - Changed to insert into `customer_preregistrations` instead of `profiles`
   - Added duplicate detection

2. **app/customer/onboarding/page.tsx**
   - Checks for preregistration on login
   - Links preregistration to profile
   - Sets restaurant_id automatically

## Testing

1. **Add a customer as admin**:
   - Name: "John Doe"
   - Phone: "8123456789"

2. **Log in as that customer**:
   - Use phone OTP with 8123456789
   - Complete onboarding
   - Should be automatically linked to restaurant

3. **Verify**:
   - Check customers list - John Doe should appear
   - Check preregistrations table - should have `linked_profile_id` set
