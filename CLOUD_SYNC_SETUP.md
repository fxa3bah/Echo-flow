# Cloud Sync API Setup Guide

This guide explains how to set up Google Drive and Microsoft OneDrive API integrations for automatic cloud syncing in Echo Flow.

## Overview

Echo Flow now supports **direct API integration** with Google Drive and OneDrive, which solves the mobile browser limitation where the file picker cannot access cloud storage folders. With this integration:

- ✅ Works on **all devices** (Windows, Mac, Linux, Android, iOS)
- ✅ Works in **mobile browsers** (no folder picker needed)
- ✅ Automatic sync every 5 minutes
- ✅ Simple "Sign in with Google/Microsoft" button
- ✅ No complicated folder selection

## Option 1: Google Drive API Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: "Echo Flow" (or any name you prefer)
4. Click "Create"

### Step 2: Enable Google Drive API

1. In your project dashboard, go to "APIs & Services" → "Library"
2. Search for "Google Drive API"
3. Click on it and click "Enable"

### Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - User Type: **External**
   - App name: **Echo Flow**
   - User support email: your email
   - Developer contact: your email
   - Click "Save and Continue"
   - Scopes: Skip this (click "Save and Continue")
   - Test users: Add your email if needed
   - Click "Save and Continue"

4. Create OAuth client ID:
   - Application type: **Web application**
   - Name: **Echo Flow Web Client**
   - Authorized JavaScript origins:
     - `http://localhost:5173` (for development)
     - `https://yourdomain.com` (for production)
   - Authorized redirect URIs:
     - `http://localhost:5173` (for development)
     - `https://yourdomain.com` (for production)
   - Click "Create"

### Step 4: Copy Client ID

1. After creation, you'll see your **Client ID**
2. Copy the Client ID (looks like: `123456789-abc123xyz.apps.googleusercontent.com`)
3. Create a `.env` file in your project root (if it doesn't exist)
4. Add:
   ```
   VITE_GOOGLE_CLIENT_ID=your-client-id-here
   ```

### Step 5: Test

1. Restart your development server: `npm run dev`
2. Open Echo Flow in browser
3. Go to Settings
4. You should see "Google Drive Sync" section
5. Click "Sign in with Google"
6. Authorize the app
7. You should be redirected back and see "Signed in as: your@email.com"

---

## Option 2: Microsoft OneDrive API Setup

### Step 1: Register Azure Application

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" (or search for it)
3. Click "App registrations" in the left menu
4. Click "New registration"

### Step 2: Configure App Registration

1. **Name**: Echo Flow
2. **Supported account types**:
   - Select "Accounts in any organizational directory and personal Microsoft accounts"
3. **Redirect URI**:
   - Platform: **Web**
   - URI: `http://localhost:5173` (add production URL later)
4. Click "Register"

### Step 3: Configure Authentication

1. After registration, go to "Authentication" in the left menu
2. Under "Implicit grant and hybrid flows", enable:
   - ✅ **Access tokens**
   - ✅ **ID tokens**
3. Click "Save"

### Step 4: Add API Permissions

1. Go to "API permissions" in the left menu
2. Click "Add a permission"
3. Select "Microsoft Graph"
4. Select "Delegated permissions"
5. Search for and add: **Files.ReadWrite**
6. Click "Add permissions"
7. (Optional) Click "Grant admin consent" if you're an admin

### Step 5: Add Redirect URIs

1. Go back to "Authentication"
2. Under "Web" platform, add your production URL:
   - `https://yourdomain.com`
3. Click "Save"

### Step 6: Copy Application (Client) ID

1. Go to "Overview" in the left menu
2. Copy the **Application (client) ID** (looks like: `12345678-1234-1234-1234-123456789abc`)
3. Add to your `.env` file:
   ```
   VITE_MICROSOFT_CLIENT_ID=your-client-id-here
   ```

### Step 7: Test

1. Restart your development server: `npm run dev`
2. Open Echo Flow in browser
3. Go to Settings
4. You should see "OneDrive Sync" section
5. Click "Sign in with Microsoft"
6. Authorize the app
7. You should be redirected back and see "Signed in as: your@email.com"

---

## Complete .env File Example

```bash
# Groq API Key for Online transcription (recommended)
VITE_GROQ_API_KEY=gsk_your-api-key-here

# Google Drive API (Optional - for automatic cloud sync)
VITE_GOOGLE_CLIENT_ID=123456789-abc123xyz.apps.googleusercontent.com

# Microsoft OneDrive API (Optional - for automatic cloud sync)
VITE_MICROSOFT_CLIENT_ID=12345678-1234-1234-1234-123456789abc
```

---

## Using Cloud Sync

### First Time Setup

1. **Sign In**: Click "Sign in with Google" or "Sign in with Microsoft"
2. **Authorize**: Grant permissions when prompted
3. **Upload**: Click "Upload Now" to upload your current data
4. **Auto-sync**: Automatic sync starts immediately (every 5 minutes)

### On Other Devices

1. **Sign In**: Use the same Google or Microsoft account
2. **Download**: Click "Download Now" to get your data
3. **Auto-sync**: Both devices now stay in sync automatically

### Important Notes

- You can use **both** Google Drive and OneDrive simultaneously
- Choose one as your primary sync provider
- Data is stored as `echo-flow-data.json` in:
  - Google Drive: Root directory
  - OneDrive: `/EchoFlow/` folder
- Auto-sync runs every 5 minutes when you're signed in
- Sign out will stop auto-sync but won't delete your cloud data

---

## Troubleshooting

### "Google Drive is not configured" error

**Solution**: Make sure you've added `VITE_GOOGLE_CLIENT_ID` to your `.env` file and restarted the dev server.

### "OneDrive is not configured" error

**Solution**: Make sure you've added `VITE_MICROSOFT_CLIENT_ID` to your `.env` file and restarted the dev server.

### "Invalid OAuth state" error

**Solution**: This is a security error. Clear your browser cache and try signing in again.

### Sign in redirects but doesn't work

**Solution**:
1. Check that your redirect URI is exactly the same as what's configured in Google Cloud Console or Azure Portal
2. Make sure you're using `http://` for localhost and `https://` for production
3. No trailing slashes in redirect URIs

### "Access denied" error

**Solution**:
1. For Google: Make sure Google Drive API is enabled in your project
2. For Microsoft: Make sure you've added the Files.ReadWrite permission and granted consent

### Sync not working on mobile

**Solution**:
- This API integration specifically solves the mobile problem!
- If it's still not working, check browser console for errors
- Try signing out and signing in again
- Make sure you're using a modern mobile browser (Chrome, Safari, Edge)

---

## Security & Privacy

- **OAuth 2.0**: Industry-standard secure authentication
- **Limited scope**: Apps only access files they create (Google Drive: `drive.file` scope, OneDrive: `Files.ReadWrite`)
- **No password storage**: OAuth tokens are stored locally, never on a server
- **Token expiry**: Tokens automatically expire after 1 hour (you'll need to sign in again)
- **Revoke access**: You can revoke Echo Flow's access anytime through your Google/Microsoft account settings

---

## Production Deployment

When deploying to production:

1. **Add production URLs** to OAuth configurations:
   - Google Cloud Console: Add your domain to "Authorized JavaScript origins" and "Authorized redirect URIs"
   - Azure Portal: Add your domain to "Redirect URIs" in Authentication

2. **Update .env**: Create `.env.production` with production values

3. **Build**: Run `npm run build` to create production build with environment variables

4. **Verify**: Test OAuth flow on production domain

---

## FAQ

**Q: Can I use both Google Drive and OneDrive?**
A: Yes! You can sign into both and use whichever you prefer.

**Q: What happens if I use both?**
A: They work independently. You can sync to both if you want redundancy.

**Q: How much storage does it use?**
A: Typically 1-10MB per year of usage. Your free tier storage (15GB Google, 5GB OneDrive) is more than enough.

**Q: Will this replace the manual export/import?**
A: No, manual export/import is still available as a backup option.

**Q: Do I need to configure this if I only use desktop?**
A: No, the local folder sync still works fine on desktop. This is primarily for mobile users.

**Q: Is my data encrypted?**
A: Data is transmitted over HTTPS (encrypted in transit). The JSON file itself is not encrypted at rest. For sensitive data, consider adding encryption.

---

## Need Help?

- Check GitHub Issues: https://github.com/fxa3bah/Echo-flow/issues
- Create a new issue if you encounter problems
- Provide error messages and browser console logs for faster help

---

**Last Updated**: January 2026
**Version**: 2.1
