# ExamForge AI - Supabase Setup Guide

## Step 1: Create Environment File

Create a file named `.env.local` in the project root with these contents:

```env
NEXT_PUBLIC_SUPABASE_URL=https://bczfxxlnhhwrbsnspeat.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_IyyvUs9B45EJ_dTdtTvdiQ_n3xuj-A5
```

## Step 2: Setup Database Tables

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/bczfxxlnhhwrbsnspeat
2. Navigate to **SQL Editor** from the left sidebar
3. Click **New Query**
4. Copy and paste the entire contents of `supabase-setup.sql` file
5. Click **Run** to create all tables

## Step 3: Restart Development Server

After creating the `.env.local` file, restart your Next.js dev server:

```bash
npm run dev
```

## Data Migration (Optional)

If you have existing data in localStorage that you want to migrate to Supabase:

1. Open the app in browser
2. Open Developer Console (F12)
3. The app will automatically sync data to Supabase once connected

## Troubleshooting

### Error: "Your project's URL and API key are required"
- Make sure `.env.local` file exists in the project root
- Verify the environment variables are spelled correctly
- Restart the dev server after creating the file

### Error: "relation does not exist"
- Run the SQL setup script in Supabase SQL Editor
- Make sure all 5 tables are created: `app_settings`, `sections`, `saved_documents`, `stored_questions`, `test_results`

### Data not syncing
- Check browser console for errors
- Verify Supabase connection status in the UI
- Ensure your network allows connections to Supabase

## Database Schema

### Tables Created:

1. **app_settings** - Stores API key and active section ID
2. **sections** - User-created sections for organizing content
3. **saved_documents** - Uploaded documents within sections
4. **stored_questions** - Question history for similarity detection
5. **test_results** - Complete test results with answers

All data is now persisted in Supabase cloud and will survive page reloads!
