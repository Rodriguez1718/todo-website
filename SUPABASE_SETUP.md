# Supabase Setup Guide

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up / Sign in
3. Click "New Project"
4. Fill in:
   - Project name: `todolist-app`
   - Database password: (generate strong password)
   - Region: (choose closest to you)
5. Wait for project to be created (~2 minutes)

## 2. Get API Keys

1. In your project dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** → `PUBLIC_SUPABASE_URL`
   - **anon public** key → `PUBLIC_SUPABASE_ANON_KEY`

## 3. Configure Environment Variables

1. Create `.env` file in project root:
```bash
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

2. Add `.env` to `.gitignore` (already done)

## 4. Create Database Tables

Go to **SQL Editor** in Supabase dashboard and run:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'none' CHECK (priority IN ('none', 'low', 'medium', 'high')),
  category TEXT DEFAULT '',
  date TEXT DEFAULT 'today' CHECK (date IN ('today', 'tomorrow')),
  "order" INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes table
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX tasks_user_id_idx ON tasks(user_id);
CREATE INDEX tasks_date_idx ON tasks(date);
CREATE INDEX tasks_order_idx ON tasks("order");
CREATE INDEX notes_user_id_idx ON notes(user_id);

-- Row Level Security (RLS)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Tasks policies
CREATE POLICY "Users can view their own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Notes policies
CREATE POLICY "Users can view their own notes"
  ON notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON notes FOR DELETE
  USING (auth.uid() = user_id);
```

## 5. Enable OAuth Providers (Optional)

### Google OAuth Setup

#### Step 1: Get Supabase Callback URL
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers** → **Google**
3. Copy the **Callback URL (for OAuth)** - looks like: `https://[your-project-ref].supabase.co/auth/v1/callback`

#### Step 2: Create Google OAuth App
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. If prompted, configure OAuth consent screen first:
   - Click **Configure Consent Screen**
   - Choose **External** (for public app)
   - Fill in:
     - App name: "TodoList App" (or your app name)
     - User support email: your email
     - Developer contact: your email
   - Click **Save and Continue**
   - Skip Scopes (click **Save and Continue**)
   - Skip Test users (click **Save and Continue**)
   - Click **Back to Dashboard**

#### Step 3: Create OAuth Client ID
1. Back in **Credentials**, click **Create Credentials** → **OAuth client ID**
2. Application type: **Web application**
3. Name: "TodoList Web Client"
4. **Authorized JavaScript origins**: Add your domains
   - `http://localhost:4321` (for local dev)
   - `https://your-vercel-domain.vercel.app` (for production)
5. **Authorized redirect URIs**: Add Supabase callback URL from Step 1
   - `https://[your-project-ref].supabase.co/auth/v1/callback`
6. Click **Create**
7. Copy **Client ID** and **Client Secret**

#### Step 4: Configure Supabase
1. Back in Supabase: **Authentication** → **Providers** → **Google**
2. Toggle **Enable Sign in with Google**
3. Paste **Client ID** (from Google)
4. Paste **Client Secret** (from Google)
5. Click **Save**

---

### GitHub OAuth Setup

#### Step 1: Get Supabase Callback URL
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers** → **GitHub**
3. Copy the **Callback URL (for OAuth)** - looks like: `https://[your-project-ref].supabase.co/auth/v1/callback`

#### Step 2: Create GitHub OAuth App
1. Go to [GitHub Settings](https://github.com/settings/developers)
2. Click **OAuth Apps** → **New OAuth App**
3. Fill in the form:
   - **Application name**: "TodoList App"
   - **Homepage URL**: 
     - Local: `http://localhost:4321`
     - Production: `https://your-vercel-domain.vercel.app`
   - **Application description**: "A todo list application with task management"
   - **Authorization callback URL**: Paste Supabase callback URL from Step 1
     - `https://[your-project-ref].supabase.co/auth/v1/callback`
4. Click **Register application**

#### Step 3: Get Client Credentials
1. After registration, you'll see your **Client ID** - copy it
2. Click **Generate a new client secret**
3. Copy the **Client Secret** (you won't see it again!)

#### Step 4: Configure Supabase
1. Back in Supabase: **Authentication** → **Providers** → **GitHub**
2. Toggle **Enable Sign in with GitHub**
3. Paste **Client ID** (from GitHub)
4. Paste **Client Secret** (from GitHub)
5. Click **Save**

---

### Testing OAuth

1. Go to your login page: `http://localhost:4321/login`
2. Click **Continue with Google** or **Continue with GitHub**
3. Authorize the app
4. You should be redirected back and logged in

### Troubleshooting

**"Redirect URI mismatch" error:**
- Verify callback URL in Google/GitHub matches Supabase exactly
- Check for trailing slashes
- Ensure HTTPS in production

**"OAuth app not found":**
- Verify Client ID and Secret are correct
- Check if OAuth app is active in Google/GitHub

**"Access denied":**
- Check OAuth consent screen is published (Google)
- Verify email is added to test users if app is in testing mode (Google)

## 6. Configure Email Templates (Optional)

Go to **Authentication** → **Email Templates** to customize:
- Confirmation email
- Password reset email
- Magic link email

## 7. Test Connection

Run the dev server:
```bash
npm run dev
```

Visit `/login` and try creating an account!

## Migration from localStorage

To migrate existing tasks from localStorage to Supabase:

1. User signs up/logs in
2. Check if localStorage has tasks
3. If yes, bulk upload to Supabase
4. Clear localStorage after successful upload

This will be implemented in the auth flow.
