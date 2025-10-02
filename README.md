# Restaurant Loyalty Web App

A configurable mobile-friendly web application that enables restaurants to run their own membership and loyalty programs. Built with Next.js, Supabase, and Tailwind CSS.

## Features

### Customer Features
- **Authentication**: Passwordless login via OTP (phone/email) or magic link
- **Points/Stamps Tracking**: View real-time balance prominently on homepage
- **Rewards Catalog**: Browse and redeem available rewards
- **Promotions**: View active promotional banners and offers
- **Redemption QR Codes**: Generate unique QR codes for staff verification
- **Transaction History**: View past redemptions and earned points/stamps

### Admin Features
- **Dashboard**: Overview of customers, pending redemptions, and activity
- **Branding Customization**: 
  - Upload restaurant logo
  - Configure theme colors (primary, secondary, accent)
  - Set restaurant name
- **Loyalty System Configuration**:
  - Choose between stamps or points mode
  - Set earning ratios (e.g., Rp.100,000 = 1 stamp)
  - Configure multiple stamps per day option
- **Rewards Management**: Create, edit, activate/deactivate rewards
- **Promotions Management**: Upload banners, set validity dates, manage offers
- **Customer Management**: View all members and their balances
- **Transaction Management**: Add customer transactions and award points/stamps
- **Redemption Verification**: Scan/verify QR codes and approve redemptions

## Tech Stack

- **Frontend**: Next.js 14 (React, TypeScript)
- **Styling**: Tailwind CSS
- **Backend/Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Hosting**: Netlify (recommended)
- **QR Codes**: qrcode library

## Project Structure

```
restaurant-loyalty/
├── app/
│   ├── admin/              # Admin dashboard pages
│   ├── auth/               # Authentication pages
│   ├── customer/           # Customer-facing pages
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home/redirect page
├── lib/
│   ├── supabase/           # Supabase client configuration
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── supabase/
│   └── schema.sql          # Database schema
└── public/                 # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier)
- A Netlify account (free tier, for deployment)

### 1. Install Dependencies

```bash
npm install
```

### 2. Supabase Setup

#### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be provisioned (2-3 minutes)
3. Note your project URL and anon key from Settings > API

#### Set Up Database

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the entire contents of `supabase/schema.sql`
3. Paste and run the SQL script
4. Verify tables were created in **Table Editor**

#### Configure Authentication

1. Go to **Authentication > Providers**
2. Enable **Email** provider
3. (Optional) Enable **Phone** provider:
   - You'll need to configure an SMS provider (Twilio, MessageBird, etc.)
   - For testing, you can use email-based OTP instead

#### Set Up Storage

1. Go to **Storage**
2. Create a new bucket called `restaurant-assets`
3. Set it to **Public** bucket
4. Add the following policies:
   - **SELECT**: Allow public read access
   - **INSERT**: Allow authenticated users to upload
   - **UPDATE**: Allow authenticated users to update
   - **DELETE**: Allow authenticated users to delete

#### Create Initial Admin User

1. Go to **Authentication > Users**
2. Click **Add User** > **Create new user**
3. Enter email and password for your admin account
4. After creating, go to **Table Editor > profiles**
5. Manually insert a profile record:
   ```sql
   INSERT INTO profiles (id, role, email, full_name)
   VALUES ('USER_ID_FROM_AUTH', 'admin', 'admin@example.com', 'Admin Name');
   ```
6. Create a restaurant record:
   ```sql
   INSERT INTO restaurants (name) VALUES ('My Restaurant') RETURNING id;
   ```
7. Update the profile with restaurant_id:
   ```sql
   UPDATE profiles SET restaurant_id = 'RESTAURANT_ID_FROM_ABOVE' WHERE id = 'USER_ID';
   ```

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important**: Never commit `.env.local` to version control!

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Test the Application

1. **Admin Login**: 
   - Go to login page
   - Switch to "Admin" tab
   - Use the admin credentials you created
   
2. **Configure Restaurant**:
   - Go to Settings
   - Upload logo, set colors, configure loyalty system
   
3. **Create Rewards**:
   - Add some rewards with point/stamp requirements
   
4. **Customer Registration**:
   - Open in incognito/private window
   - Use "Customer" login
   - Enter phone number or email to receive OTP

## Deployment to Netlify

### 1. Prepare for Deployment

Ensure your code is in a Git repository (GitHub, GitLab, or Bitbucket).

### 2. Deploy to Netlify

1. Go to [netlify.com](https://netlify.com) and sign in
2. Click **Add new site > Import an existing project**
3. Connect your Git provider and select your repository
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Framework preset**: Next.js

### 3. Add Environment Variables

In Netlify dashboard:
1. Go to **Site settings > Environment variables**
2. Add all variables from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (set to your Netlify URL)

### 4. Deploy

1. Click **Deploy site**
2. Wait for build to complete
3. Your app will be live at `https://your-site.netlify.app`

### 5. Configure Custom Domain (Optional)

1. Go to **Domain settings**
2. Add your custom domain
3. Follow DNS configuration instructions

### 6. Update Supabase Auth Settings

1. In Supabase dashboard, go to **Authentication > URL Configuration**
2. Add your Netlify URL to **Site URL**
3. Add `https://your-site.netlify.app/auth/callback` to **Redirect URLs**

## Usage Guide

### For Restaurant Admins

1. **Initial Setup**:
   - Login with admin credentials
   - Go to Settings and configure:
     - Restaurant name and logo
     - Brand colors
     - Loyalty mode (stamps or points)
     - Earning ratios

2. **Create Rewards**:
   - Navigate to Rewards
   - Add rewards with titles, descriptions, and requirements
   - Activate/deactivate as needed

3. **Add Promotions**:
   - Go to Promotions
   - Upload banner images
   - Set validity dates
   - Toggle active status

4. **Record Transactions**:
   - Go to Transactions
   - Select customer
   - Enter purchase amount
   - System automatically calculates points/stamps

5. **Verify Redemptions**:
   - Go to Redemptions
   - View pending requests
   - Scan customer's QR code or enter code manually
   - Click "Verify" to approve

### For Customers

1. **Sign Up/Login**:
   - Enter phone number or email
   - Receive and enter OTP code

2. **Earn Points/Stamps**:
   - Make purchases at the restaurant
   - Staff will record transaction
   - Points/stamps appear automatically

3. **View Rewards**:
   - Browse available rewards
   - Check requirements vs. your balance

4. **Redeem Rewards**:
   - Select a reward you can afford
   - Click "Redeem Now"
   - Show QR code to staff
   - Wait for verification

5. **Check History**:
   - View past redemptions
   - See transaction history

## Database Schema

### Main Tables

- **restaurants**: Store restaurant configuration and branding
- **profiles**: User profiles (extends Supabase auth.users)
- **rewards**: Available rewards for redemption
- **promotions**: Promotional banners and offers
- **transactions**: Customer purchase transactions
- **redemptions**: Reward redemption requests

### Security

- Row Level Security (RLS) enabled on all tables
- Customers can only view/modify their own data
- Admins can manage data for their restaurant only
- Public can view active promotions and rewards

## Customization

### Changing Theme Colors

Admins can customize colors through the Settings page, or you can modify defaults in:
- `app/globals.css` (CSS variables)
- `supabase/schema.sql` (database defaults)

### Adding Features

The codebase is modular and easy to extend:
- Add new pages in `app/` directory
- Create new database tables in Supabase
- Add utility functions in `lib/utils/`

## Troubleshooting

### OTP Not Sending

- Check Supabase authentication provider settings
- For phone OTP, ensure SMS provider is configured
- Use email OTP as alternative

### Images Not Uploading

- Verify storage bucket is public
- Check storage policies allow authenticated uploads
- Ensure file size is under limit (default 50MB)

### Build Errors on Netlify

- Check all environment variables are set
- Verify Node.js version compatibility
- Review build logs for specific errors

### Authentication Issues

- Ensure redirect URLs are configured in Supabase
- Check that `NEXT_PUBLIC_APP_URL` matches your domain
- Clear browser cache and cookies

## Support & Contributing

For issues or questions:
1. Check existing documentation
2. Review Supabase logs for errors
3. Check browser console for client-side errors

## License

MIT License - feel free to use this project for your restaurant!

## Acknowledgments

- Built with Next.js and Supabase
- Icons by Lucide React
- Styled with Tailwind CSS
