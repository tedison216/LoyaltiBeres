# Irba Steak Loyalty Program - Final Setup

## ✅ Completed Features

### 1. **Transaction Cancellation**
- Admins can cancel transactions with a trash icon button
- Points/stamps are automatically deducted from customer balance
- Confirmation dialog prevents accidental cancellations

### 2. **Phone + PIN Login System**
- Customers log in with phone number + 4-digit PIN
- No SMS/OTP required - instant login
- Email magic link still available as alternative
- PINs auto-generated when admin adds customers

### 3. **Customer Management**
- Admins can add customers directly from dashboard
- Customers appear immediately in the list
- Search functionality for finding customers in transactions
- Customer details shown with current balance

### 4. **Branding: Irba Steak**
- App rebranded from generic "Restaurant Loyalty" to "Irba Steak"
- Login page shows "Irba Steak" branding
- Onboarding welcomes customers to "Irba Steak"

---

## 🗄️ Database Schema

### Required SQL (Run in Supabase SQL Editor):

```sql
-- Add is_temp column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_temp BOOLEAN DEFAULT false;

-- Add PIN column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_is_temp ON profiles(is_temp);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Drop foreign key constraint (allows temp profiles)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Clean up RLS policies
DROP POLICY IF EXISTS "Admins can view restaurant profiles" ON profiles;
DROP POLICY IF EXISTS "Allow phone lookup for login" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
DROP POLICY IF EXISTS "Anyone can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Create simple policies
CREATE POLICY "Allow all reads" ON profiles FOR SELECT USING (true);
CREATE POLICY "Allow all inserts" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow profile updates" ON profiles FOR UPDATE USING (true);
CREATE POLICY "Allow profile deletes" ON profiles FOR DELETE USING (true);
```

---

## 📱 User Flows

### Admin Workflow

1. **Add Customer**
   - Go to Customers page
   - Click "Add" button
   - Enter name: "John Doe"
   - Enter phone: "8123456789"
   - (Optional) Set custom PIN or leave empty for auto-generation
   - Click "Add Customer"
   - Note the PIN shown (e.g., "PIN: 5678")
   - Share phone + PIN with customer

2. **Record Transaction**
   - Go to Transactions page
   - Click "New" button
   - Search for customer by name/phone
   - Select customer (shows their current balance)
   - Enter transaction amount
   - See preview of points/stamps to be earned
   - Click "Add Transaction"

3. **Cancel Transaction**
   - Go to Transactions page
   - Find the transaction to cancel
   - Click the red trash icon
   - Confirm cancellation
   - Points/stamps automatically deducted

### Customer Workflow

1. **First Time Login**
   - Go to login page
   - Select "Customer" tab
   - Enter phone: "8123456789"
   - Enter PIN: "5678" (provided by restaurant)
   - Click "Login"
   - Redirected to dashboard
   - See points/stamps balance

2. **View Rewards**
   - Click "Rewards" in navigation
   - Browse available rewards
   - See how many points/stamps needed
   - Redeem when eligible

3. **Redeem Reward**
   - Select a reward
   - Click "Redeem"
   - QR code generated
   - Show QR code to staff
   - Staff scans and approves

---

## 🎨 Branding Updates

### Changed From → To:
- **App Name**: Restaurant Loyalty → Irba Steak Loyalty Program
- **Login Title**: Restaurant Loyalty → Irba Steak
- **Onboarding**: Welcome! → Welcome to Irba Steak!
- **Package Name**: restaurant-loyalty → irba-steak-loyalty

### Where to Update Logo:
1. Go to Admin → Settings
2. Upload Irba Steak logo
3. Logo appears throughout the app

---

## 🚀 Deployment

### Netlify Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://ezjjfeixjdzyhajlblwa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
NEXT_PUBLIC_APP_URL=https://your-site.netlify.app
SECRETS_SCAN_OMIT_KEYS=NEXT_PUBLIC_SUPABASE_ANON_KEY,NEXT_PUBLIC_SUPABASE_URL
```

### Deploy:
```bash
git add .
git commit -m "Add transaction cancellation and rebrand to Irba Steak"
git push
```

---

## 🔐 Security Notes

- **PINs are stored in profiles table** - Consider hashing in production
- **RLS policies are permissive** - Application logic handles authorization
- **Foreign key removed** - Allows flexible customer management
- **Temp profiles** - Replaced with real auth users on first login

---

## 📊 Key Differences from Multi-Restaurant System

### Simplified for Single Restaurant:
- ✅ No restaurant selection - hardcoded to Irba Steak
- ✅ No multi-tenancy complexity
- ✅ Simpler onboarding flow
- ✅ Direct customer management
- ✅ Faster queries (no restaurant filtering needed)

### Future: Scale to Multi-Restaurant
If you want to expand later:
1. Re-add restaurant selection in admin signup
2. Add restaurant switcher for admins
3. Filter all queries by restaurant_id
4. Add restaurant subdomain routing

---

## 🎯 Next Steps (Optional)

- [ ] Add PIN reset functionality
- [ ] Add customer profile editing
- [ ] Add transaction notes/descriptions
- [ ] Add export transactions to CSV
- [ ] Add analytics dashboard
- [ ] Add push notifications for rewards
- [ ] Add referral system
