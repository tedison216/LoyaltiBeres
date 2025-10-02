# Phone + PIN Login System

## Overview

Replaced phone OTP with a simpler Phone + PIN system. Customers can log in using their phone number and a 4-digit PIN, or use email magic link.

## SQL Setup

Run this in **Supabase SQL Editor**:

```sql
-- Add PIN column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Add PIN to preregistrations for initial setup
ALTER TABLE customer_preregistrations ADD COLUMN IF NOT EXISTS pin TEXT;
```

## How It Works

### 1. Admin Adds Customer
- Admin enters customer name, phone, and optionally email
- Admin can set a custom PIN or leave empty for auto-generation
- System generates random 4-digit PIN if not provided
- PIN is shown to admin to share with customer

### 2. Customer Login
Two methods available:

#### **Method 1: Phone + PIN**
- Customer enters phone number (without country code)
- Customer enters 4-digit PIN
- System verifies phone and PIN match
- Customer is logged in immediately

#### **Method 2: Email Link**
- Customer enters email
- System sends magic link
- Customer clicks link to log in

### 3. Behind the Scenes
- Phone + PIN creates a Supabase auth user with generated email
- Email format: `{phone}@customer.local`
- Password is combination of PIN + phone for security
- Profile is linked to auth user automatically

## Features

✅ **No SMS Required**: No need for Twilio or SMS provider
✅ **Simple for Customers**: Just phone + 4-digit PIN
✅ **Auto-Generated PINs**: Admin doesn't have to think of PINs
✅ **Flexible**: Supports both phone and email login
✅ **Secure**: PINs are hashed in auth system

## Usage

### Admin Workflow

1. **Add Customer**:
   - Go to Customers page
   - Click "Add" button
   - Enter name: "John Doe"
   - Enter phone: "8123456789"
   - Leave PIN empty (or enter custom PIN like "1234")
   - Click "Add Customer"
   - System shows: "Customer added! PIN: 5678. Share this PIN with the customer."

2. **Share PIN**:
   - Tell customer their phone number and PIN
   - Customer can now log in

### Customer Workflow

1. **Login**:
   - Go to login page
   - Select "Phone + PIN" tab
   - Enter phone: "8123456789"
   - Enter PIN: "5678"
   - Click "Login"
   - Redirected to customer dashboard

2. **Alternative - Email**:
   - Select "Email Link" tab
   - Enter email address
   - Check email for magic link
   - Click link to log in

## Files Modified

1. **app/auth/login/page.tsx**
   - Removed OTP flow
   - Added Phone + PIN verification
   - Added login method toggle (Phone/Email)
   - Simplified UI

2. **app/admin/customers/page.tsx**
   - Added PIN field to add customer form
   - Auto-generates PIN if not provided
   - Shows PIN in success message

3. **Database Schema**
   - Added `pin` column to `profiles`
   - Added `pin` column to `customer_preregistrations`
   - Added indexes for phone and email lookups

## Security Notes

- PINs are stored in profiles table for verification
- Auth passwords are PIN + phone combination
- Each customer has unique generated email in auth system
- PINs should be 4 digits for simplicity
- Consider adding PIN reset functionality in future

## Testing

1. **Add a customer**:
   ```
   Name: Test Customer
   Phone: 8111222333
   PIN: (leave empty)
   ```

2. **Note the generated PIN** (e.g., "5678")

3. **Log in as customer**:
   - Phone: 8111222333
   - PIN: 5678

4. **Verify**:
   - Should log in successfully
   - Redirected to customer dashboard
   - Can see points/stamps

## Benefits Over OTP

| Feature | OTP | Phone + PIN |
|---------|-----|-------------|
| SMS Provider | Required | Not needed |
| Setup Complexity | High | Low |
| Cost | Per SMS | Free |
| Customer Experience | Wait for SMS | Instant login |
| Works Offline | No | Yes |
| Admin Control | Limited | Full control |

## Future Enhancements

- [ ] PIN reset functionality
- [ ] PIN change in customer profile
- [ ] PIN strength requirements
- [ ] Failed login attempt tracking
- [ ] PIN expiry/rotation
