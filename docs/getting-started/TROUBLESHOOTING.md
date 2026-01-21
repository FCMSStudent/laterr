# Troubleshooting Guide

This guide helps you diagnose and fix common issues in the Laterr application.

## Failed to Add Item Error

If you see "Failed to Add Item - Unable to add this item to your collection. Please try again." when trying to add bookmarks, URLs, notes, or files, follow these steps:

### 1. Check Environment Variables

The application requires three critical environment variables. Verify they are all set in your `.env` file:

```bash
# Required Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key

# Required for AI features (for local development; in production set in Supabase Edge Functions)
LOVABLE_API_KEY=your_openai_api_key
```

**How to verify:**
1. Check that `.env` file exists in the project root
2. Open `.env` and confirm all three variables are present and have values
3. Compare with `.env.example` to ensure you haven't missed any variables

**How to fix:**
1. Copy `.env.example` to `.env` if it doesn't exist: `cp .env.example .env`
2. Get your Supabase credentials from: https://supabase.com/dashboard/project/_/settings/api
3. Get your OpenAI API key from: https://platform.openai.com/api-keys
4. Fill in all values in `.env`
5. Restart your development server: `npm run dev`

### 2. Check Browser Console

Open your browser's Developer Tools (F12) and check the Console tab for detailed error messages.

**Common error messages and solutions:**

- **"❌ Supabase configuration error"**
  - Missing environment variables
  - Solution: Follow step 1 above

- **"Authentication Required"**
  - Not signed in
  - Solution: Sign in or create an account

- **"Configuration Error - API configuration is missing"**
  - Missing or invalid API keys
  - Solution: Verify environment variables are set correctly

- **"Permission Error"**
  - Database access denied
  - Solution: Verify you're signed in with the correct account

- **"Service Error - The required service is unavailable"**
  - Edge function not deployed or not found
  - Solution: Verify Supabase project setup and edge function deployment

### 3. Check Authentication Status

1. Verify you are signed in to the application
2. Try signing out and signing back in
3. Clear browser cache and cookies if issues persist

### 4. Network Issues

If you see network-related errors:

1. Check your internet connection
2. Verify Supabase project is active and not paused
3. Check Supabase status page: https://status.supabase.com/
4. Verify no browser extensions are blocking requests

### 5. Rate Limiting

If you see "Too Many Requests" or "Rate limit exceeded":

- **AI Rate Limit**: You've made too many AI analysis requests
  - Solution: Wait a few minutes before trying again
  
- **API Credits Exhausted**: You've run out of AI credits
  - Solution: Add credits to your OpenAI account or wait for quota reset

## Additional Issues

### Items Not Showing Up

1. Check that you're viewing the correct filter/category
2. Verify items were actually saved (check Supabase database)
3. Try refreshing the page

### Images/Files Not Loading

1. Check that Supabase storage bucket is configured correctly
2. Verify storage policies allow access
3. Check browser console for signed URL errors

### Search Not Working

1. Verify embeddings are being generated (check console logs)
2. Ensure `LOVABLE_API_KEY` is configured in edge functions
3. Check that pgvector extension is enabled in Supabase

## Getting Help

If you've tried all troubleshooting steps and still have issues:

1. Check the browser console for detailed error messages
2. Include error messages when reporting issues
3. Verify your environment setup matches the requirements in README.md
4. Open an issue on GitHub with:
   - Error message
   - Steps to reproduce
   - Browser console logs
   - Environment (OS, browser, Node.js version)

## Prevention

To avoid common issues:

1. Always keep `.env` file up to date with `.env.example`
2. Don't commit `.env` file to version control (it's in `.gitignore`)
3. Restart development server after changing environment variables
4. Keep dependencies up to date with `npm install`
5. Monitor Supabase project quotas and limits
