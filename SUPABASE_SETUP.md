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

### Google OAuth
1. Go to **Authentication** → **Providers** → **Google**
2. Enable Google provider
3. Follow instructions to create Google OAuth app
4. Add credentials

### GitHub OAuth
1. Go to **Authentication** → **Providers** → **GitHub**
2. Enable GitHub provider
3. Follow instructions to create GitHub OAuth app
4. Add credentials

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
