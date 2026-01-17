# Supabase Setup Guide

## Quick Start

The application is currently running with placeholder Supabase credentials. To enable full functionality, follow these steps:

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up for a free account (if you don't have one)
3. Click **"New Project"**
4. Fill in:
   - **Name**: My Word (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Select closest to your users
5. Click **"Create new project"**
6. Wait 2-3 minutes for setup to complete

### 2. Get Your API Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. You'll see two important values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

### 3. Update Your .env.local File

1. Open `.env.local` in your project root
2. Replace the placeholder values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Important:** 
- Copy the **exact** values from your Supabase dashboard
- Don't add quotes around the values
- The service role key is also on the same API settings page

### 4. Run the Database Migration

You have two options:

#### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI globally
npm install -g supabase

# Link to your project (get project ref from dashboard URL)
supabase link --project-ref your-project-ref

# Push the migration
supabase db push
```

#### Option B: Manual SQL Execution

1. Go to your Supabase dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **"New query"**
4. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
5. Paste into the SQL editor
6. Click **"Run"**

### 5. Restart Your Development Server

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

### 6. Test the Application

1. Open [http://localhost:3000](http://localhost:3000)
2. Click **"Get Started"** to create an account
3. Check your email for verification link
4. Log in and start creating entries!

---

## Troubleshooting

### "Invalid Supabase URL" Error

- Make sure your URL starts with `https://`
- Verify you copied the complete URL from the dashboard
- Check there are no extra spaces

### "Invalid API Key" Error

- Ensure you copied the **anon public** key, not the service role key
- The key should be a long JWT token (starts with `eyJ...`)

### Database Tables Not Found

- Make sure you ran the migration (Step 4)
- Check the SQL Editor for any error messages
- Verify all tables were created in **Table Editor**

### Email Verification Not Working

1. Go to **Authentication** → **Settings** in Supabase
2. Scroll to **Email Templates**
3. Make sure "Confirm signup" is enabled
4. Check your spam folder

---

## Current Status

✅ **Application is running** with placeholder credentials  
⏳ **Waiting for** your Supabase setup  
📝 **Next step**: Follow the guide above to connect to a real database

Once configured, you'll have access to:
- User authentication with 2FA
- Cloud database for all posts
- Real-time updates (future feature)
- Secure data storage with RLS
