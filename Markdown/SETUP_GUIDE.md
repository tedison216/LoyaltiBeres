# Complete Setup Guide - Restaurant Loyalty App

This guide will walk you through setting up the Restaurant Loyalty app from scratch, including Supabase and Netlify configuration.

## Part 1: Supabase Setup (Backend & Database)

### Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click **Start your project** or **New Project**
3. Sign in with GitHub (recommended) or email
4. Click **New Project**
5. Fill in project details:
   - **Name**: `restaurant-loyalty` (or your choice)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your location
   - **Pricing Plan**: Free tier is sufficient
6. Click **Create new project**
7. Wait 2-3 minutes for provisioning

### Step 2: Get API Credentials

1. In your Supabase project dashboard, click **Settings** (gear icon)
2. Go to **API** section
3. Copy and save these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: Long string starting with `eyJ...`
   - **service_role key**: Another long string (keep this secret!)

### Step 3: Set Up Database Schema

1. In Supabase dashboard, click **SQL Editor** in left sidebar
2. Click **New query**
3. Open the file `supabase/schema.sql` from this project
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl/Cmd + Enter)
7. You should see "Success. No rows returned"
8. Verify tables were created:
   - Click **Table Editor** in left sidebar
   - You should see: `restaurants`, `profiles`, `rewards`, `promotions`, `transactions`, `redemptions`

### Step 4: Configure Authentication

#### Enable Email Authentication

1. Go to **Authentication** > **Providers**
2. Find **Email** provider
3. Ensure it's **Enabled**
4. Toggle **Confirm email** to OFF (for easier testing)
5. Click **Save**

#### Enable Phone Authentication (Optional)

For phone OTP, you need an SMS provider:

1. Go to **Authentication** > **Providers**
2. Find **Phone** provider
3. Click to expand settings
4. Choose an SMS provider:
   - **Twilio** (recommended, has free trial)
   - **MessageBird**
   - **Vonage**
5. Enter your provider credentials
6. Click **Save**

**Note**: For testing, you can skip phone auth and use email only.

### Step 5: Set Up Storage

1. Click **Storage** in left sidebar
2. Click **New bucket**
3. Enter bucket name: `restaurant-assets`
4. Select **Public bucket**
5. Click **Create bucket**

#### Configure Storage Policies

1. Click on the `restaurant-assets` bucket
2. Go to **Policies** tab
3. Click **New policy**
4. For **SELECT (read)** policy:
   - Name: `Public read access`
   - Policy definition: `true` (allows everyone to read)
   - Click **Review** then **Save**

5. Click **New policy** again
6. For **INSERT (upload)** policy:
   - Name: `Authenticated users can upload`
   - Policy definition: `(auth.role() = 'authenticated')`
   - Click **Review** then **Save**

7. Repeat for **UPDATE** and **DELETE** with same authenticated policy

### Step 6: Create Initial Admin User

#### Method 1: Using Supabase Dashboard

1. Go to **Authentication** > **Users**
2. Click **Add user** > **Create new user**
3. Enter:
   - **Email**: `admin@yourrestaurant.com`
   - **Password**: Create a strong password
   - **Auto Confirm User**: Enable this
4. Click **Create user**
5. Copy the **User UID** (you'll need this)

#### Method 2: Create Profile and Restaurant

1. Go to **SQL Editor**
2. **First**, create the restaurant and get its ID:

```sql
-- Create a restaurant - this will return the restaurant ID
INSERT INTO restaurants (name, loyalty_mode) 
VALUES ('My Restaurant', 'stamps') 
RETURNING id;
```

3. **Copy the restaurant ID** from the query result (it will show in the Results panel below, something like: `550e8400-e29b-41d4-a716-446655440000`)

4. **Then**, create the admin profile using both IDs:

```sql
-- Replace YOUR_USER_ID (from step 5 above) and YOUR_RESTAURANT_ID (from step 3 above)
INSERT INTO profiles (id, restaurant_id, role, email, full_name)
VALUES (
  'YOUR_USER_ID',           -- The User UID from Authentication > Users
  'YOUR_RESTAURANT_ID',     -- The restaurant ID from the query above
  'admin', 
  'admin@yourrestaurant.com', 
  'Admin Name'
);
```

**Example with real IDs:**
```sql
-- If your User UID is: a1b2c3d4-e5f6-7890-abcd-ef1234567890
-- And your Restaurant ID is: 550e8400-e29b-41d4-a716-446655440000
INSERT INTO profiles (id, restaurant_id, role, email, full_name)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 
  '550e8400-e29b-41d4-a716-446655440000', 
  'admin', 
  'admin@yourrestaurant.com', 
  'Admin Name'
);
```

### Step 7: Configure Auth URLs (Do this after deploying)

You'll come back to this after deploying to Netlify:

1. Go to **Authentication** > **URL Configuration**
2. Add your production URL to:
   - **Site URL**: `https://your-app.netlify.app`
   - **Redirect URLs**: `https://your-app.netlify.app/auth/callback`

---

## Part 2: Local Development Setup

### Step 1: Install Dependencies

```bash
cd restaurant-loyalty
npm install
```

### Step 2: Configure Environment Variables

1. Copy the example file:
```bash
cp .env.local.example .env.local
```

2. Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 3: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Step 4: Test Admin Login

1. Click on the login page
2. Switch to **Admin** tab
3. Enter the admin email and password you created
4. You should be redirected to the admin dashboard

### Step 5: Configure Your Restaurant

1. Click **Settings**
2. Upload a logo (PNG or JPG)
3. Set your brand colors
4. Configure loyalty system:
   - Choose **Stamps** or **Points**
   - Set earning ratio (e.g., Rp.100,000 = 1 stamp)
5. Click **Save Settings**

### Step 6: Create Rewards

1. Go to **Rewards**
2. Click **New**
3. Enter:
   - Title: "Free Coffee"
   - Description: "Enjoy a complimentary coffee"
   - Required stamps/points: 10
4. Click **Create Reward**

### Step 7: Test Customer Flow

1. Open a new incognito/private browser window
2. Go to [http://localhost:3000](http://localhost:3000)
3. Click **Customer** tab
4. Enter your email
5. Check your email for the magic link
6. Click the link to log in
7. You should see the customer homepage

---

## Part 3: Netlify Deployment

### Step 1: Prepare Git Repository

1. Initialize git (if not already done):
```bash
git init
git add .
git commit -m "Initial commit"
```

2. Create a repository on GitHub:
   - Go to [github.com](https://github.com)
   - Click **New repository**
   - Name it `restaurant-loyalty`
   - Click **Create repository**

3. Push your code:
```bash
git remote add origin https://github.com/yourusername/restaurant-loyalty.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Netlify

1. Go to [netlify.com](https://netlify.com)
2. Sign up or log in
3. Click **Add new site** > **Import an existing project**
4. Choose **GitHub** (or your Git provider)
5. Authorize Netlify to access your repositories
6. Select your `restaurant-loyalty` repository
7. Configure build settings:
   - **Branch to deploy**: `main`
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Framework**: Next.js (should auto-detect)

### Step 3: Add Environment Variables

1. Before deploying, click **Show advanced**
2. Click **New variable** for each:

```
NEXT_PUBLIC_SUPABASE_URL = https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY = eyJhbGc...
NEXT_PUBLIC_APP_URL = https://your-site-name.netlify.app
```

**Note**: For `NEXT_PUBLIC_APP_URL`, use the Netlify URL shown at the top (e.g., `https://amazing-curie-123456.netlify.app`)

### Step 4: Deploy

1. Click **Deploy site**
2. Wait for build to complete (2-5 minutes)
3. Once done, click on the site URL to view your app

### Step 5: Update Supabase Auth URLs

1. Go back to your Supabase dashboard
2. Navigate to **Authentication** > **URL Configuration**
3. Update:
   - **Site URL**: `https://your-site-name.netlify.app`
   - **Redirect URLs**: Add `https://your-site-name.netlify.app/auth/callback`
4. Click **Save**

### Step 6: Test Production App

1. Visit your Netlify URL
2. Test admin login
3. Test customer registration
4. Verify all features work

### Step 7: Custom Domain (Optional)

1. In Netlify, go to **Domain settings**
2. Click **Add custom domain**
3. Enter your domain (e.g., `loyalty.yourrestaurant.com`)
4. Follow DNS configuration instructions
5. Wait for DNS propagation (can take up to 48 hours)
6. Update `NEXT_PUBLIC_APP_URL` in Netlify environment variables
7. Update Supabase auth URLs with your custom domain

---

## Part 4: Post-Deployment Configuration

### Create Test Customer Account

1. Open your deployed app
2. Use customer login
3. Enter a test email
4. Check email for magic link
5. Complete profile setup

### Add Customer to Restaurant

If customer doesn't have a restaurant assigned:

1. Go to Supabase **Table Editor**
2. Open **profiles** table
3. Find the customer profile
4. Edit and set `restaurant_id` to your restaurant's ID
5. Save

### Test Complete Flow

1. **Admin**: Create a promotion with banner
2. **Customer**: View promotion on homepage
3. **Admin**: Add a transaction for the customer
4. **Customer**: See points/stamps increase
5. **Customer**: Redeem a reward
6. **Admin**: Verify the redemption QR code

---

## Troubleshooting

### Build Fails on Netlify

**Error**: "Module not found"
- **Solution**: Ensure all dependencies are in `package.json`
- Run `npm install` locally to verify

**Error**: "Environment variable not found"
- **Solution**: Check all env vars are set in Netlify dashboard
- Redeploy after adding variables

### Authentication Not Working

**Error**: "Invalid login credentials"
- **Solution**: Check Supabase auth provider is enabled
- Verify email confirmation is disabled for testing

**Error**: "Redirect URL not allowed"
- **Solution**: Add your Netlify URL to Supabase redirect URLs
- Include `/auth/callback` path

### Images Not Uploading

**Error**: "Storage error"
- **Solution**: Check bucket is public
- Verify storage policies are set correctly
- Check file size (max 50MB by default)

### Database Errors

**Error**: "Permission denied"
- **Solution**: Check RLS policies are created
- Verify user has correct role in profiles table

---

## Next Steps

1. **Customize branding**: Upload your restaurant logo and set colors
2. **Create rewards**: Add attractive rewards for customers
3. **Add promotions**: Upload promotional banners
4. **Invite customers**: Share your app URL with customers
5. **Train staff**: Show staff how to verify redemptions
6. **Monitor usage**: Check admin dashboard regularly

## Support Resources

- **Supabase Docs**: [https://supabase.com/docs](https://supabase.com/docs)
- **Next.js Docs**: [https://nextjs.org/docs](https://nextjs.org/docs)
- **Netlify Docs**: [https://docs.netlify.com](https://docs.netlify.com)

---

## Security Checklist

- [ ] `.env.local` is in `.gitignore`
- [ ] Service role key is never exposed to client
- [ ] RLS policies are enabled on all tables
- [ ] Storage bucket has proper access policies
- [ ] Auth redirect URLs are configured
- [ ] Strong admin password is used
- [ ] Database password is saved securely

---

Congratulations! Your Restaurant Loyalty app is now live! 🎉
