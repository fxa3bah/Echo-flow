# Echo Flow - Easy Sync Setup Guide

## Problem: Syncing Between Phone and Windows Laptop

Echo Flow already has cloud sync built-in! However, there's an **important limitation on mobile devices**.

---

## 🚨 IMPORTANT: Mobile Browser Limitation

### The Issue
When you click "Select Sync Folder" on **Android or iPhone**, the file picker **ONLY shows local device storage** (Downloads, Documents folders). It **CANNOT access**:
- ❌ Google Drive folders
- ❌ OneDrive folders
- ❌ Dropbox folders
- ❌ iCloud folders

**Why?** This is a browser limitation with the File System Access API, not an Echo Flow bug. Mobile browsers don't expose cloud storage folders through the file picker.

### ✅ The Solution: Manual Export/Import (Works Now!)

Use this simple workflow to sync between devices:

#### **On Windows Laptop (or primary device):**
1. Open Echo Flow → Settings (Ctrl+,)
2. Click **"Download Backup"** button
3. This saves `echo-flow-backup-2026-01-18.json` to your Downloads
4. Upload this file to **Google Drive** (or OneDrive/Dropbox) using your browser or desktop app

#### **On Android Phone (or secondary device):**
1. Open **Google Drive app** on your phone
2. Find and **download** the `echo-flow-backup-YYYY-MM-DD.json` file to your device
3. Open **Echo Flow** in your mobile browser
4. Go to Settings → Click **"Import Backup"**
5. Select the downloaded JSON file from your device storage
6. ✓ Done! All your data is now synced

**Time required:** About 30-60 seconds per sync

**When to sync:**
- After making changes on one device
- Before switching to another device
- Once a day if you use both devices regularly

---

## Desktop-Only: Automatic Folder Sync

The automatic folder sync feature **only works on desktop/laptop computers** because they have real synced folders. Here's how to set it up:

## ✅ Recommended: Google Drive (Easiest)

**Why Google Drive?**
- 15GB free storage
- Works on Windows, Android, and iOS
- Simple setup on all platforms
- Automatic background sync
- No technical knowledge required

### Setup Instructions

#### On Windows Laptop:

1. **Install Google Drive for Desktop** (free)
   - Download: https://www.google.com/drive/download/
   - Sign in with your Google account
   - It creates a "Google Drive" folder on your computer

2. **In Echo Flow (in browser)**
   - Open Echo Flow in your browser
   - Go to Settings (Ctrl+,)
   - Click "Choose Sync Folder"
   - Navigate to: `G:\My Drive\EchoFlow` (or create this folder)
   - Click "Save Now" to upload your data

#### ⚠️ On Your Phone:

**DOES NOT WORK** - See the manual Export/Import method at the top of this guide instead.

The folder picker on mobile browsers cannot access cloud storage folders. Use the manual backup/restore method described above.

---

## Alternative Options

### Option 2: OneDrive (Good for Windows Users)

**Pros:**
- 5GB free storage
- Built into Windows 10/11
- Good integration with Microsoft ecosystem

**Setup:**
1. OneDrive is already on Windows (check system tray)
2. In Echo Flow settings, choose sync folder: `C:\Users\[YourName]\OneDrive\EchoFlow`
3. Install OneDrive app on your phone
4. Access the same folder

### Option 3: Dropbox

**Pros:**
- 2GB free storage (smaller but reliable)
- Excellent cross-platform support
- Simple interface

**Setup:**
1. Install Dropbox desktop app
2. Create `Dropbox\EchoFlow` folder
3. Select in Echo Flow settings
4. Use Dropbox mobile app

---

## How Echo Flow Sync Works

### Current Sync Features (v2.0)
- **Auto-sync every 5 minutes** (configurable)
- **Manual controls**: "Save Now" and "Load Now" buttons
- **Deduplication**: Automatically merges duplicate entries
- **JSON format**: Human-readable backup files
- **Conflict resolution**: Newer entries always win

### Sync File Location
- Single JSON file: `echoflow-data.json`
- Contains all your entries (voices, tasks, reminders, notes, diary)
- Can be backed up, copied, or manually edited

---

## Step-by-Step: First Time Sync Setup

### On Windows (First Device):

1. **Install cloud storage** (Google Drive recommended)
2. **Wait for sync to complete** (initial setup)
3. **Open Echo Flow** in your browser
4. **Go to Settings** (click gear icon or press Ctrl+,)
5. **Enable Cloud Sync**:
   - Toggle "Enable Cloud Sync" ON
   - Click "Choose Sync Folder"
   - Select: `Google Drive\EchoFlow` (create folder if needed)
6. **Save your data**:
   - Click "Save Now"
   - Wait for "Sync successful" message
7. **Verify**:
   - Open Google Drive folder
   - You should see `echoflow-data.json`

### On Phone (Second Device):

**⚠️ MOBILE LIMITATION**: The automatic folder sync does not work on mobile browsers. Use the **Manual Export/Import** method described at the top of this guide instead.

If you still want to add Echo Flow to your home screen:
1. Open Echo Flow in Chrome/Safari
2. Chrome Android: Menu → "Add to Home screen"
3. Safari iOS: Share → "Add to Home Screen"

Then use the manual backup/restore workflow for syncing data.

---

## Troubleshooting Common Issues

### 🚨 Problem: "Choose Sync Folder" only shows phone storage, not Google Drive

**This is NORMAL on mobile devices!** Mobile browsers cannot access cloud storage folders through the file picker.

**Solution**: Use the manual Export/Import workflow described at the top of this guide:
1. **On Windows**: Settings → "Download Backup" → Upload to Google Drive
2. **On Phone**: Download from Google Drive app → Settings → "Import Backup"

**Future Fix**: Google Drive API integration is planned (see Roadmap), which will allow automatic sync on mobile devices without needing the folder picker

### Problem: Data not syncing between devices

**Check:**
- Both devices using the same Google account?
- Same folder selected on both devices?
- Internet connection active?
- Cloud storage app running?
- Try manual "Save Now" and "Load Now"

### Problem: Duplicate entries appearing

**Solution**: This is normal if you edited on both devices while offline. Echo Flow's deduplication will merge them on next sync.

### Problem: Lost data after sync

**Don't panic!** Your data is in the JSON file:
1. Open Google Drive folder
2. Find `echoflow-data.json`
3. Make a backup copy
4. In Echo Flow: Settings → Import Data → Select the file

---

## Best Practices

1. **Manual Sync Before Important Changes**
   - Click "Save Now" before closing browser
   - Click "Load Now" when opening on new device

2. **Regular Backups**
   - Export data weekly: Settings → "Export Data"
   - Keep backup JSON files in separate folder
   - Name them with dates: `echoflow-backup-2026-01-18.json`

3. **One Device at a Time** (for now)
   - Close Echo Flow on laptop before using on phone
   - Prevents sync conflicts
   - Future versions will handle concurrent editing better

4. **Check Sync Status**
   - Green icon = synced successfully
   - Yellow = syncing in progress
   - Red = sync error (check connection)

---

## Future Sync Improvements (Roadmap)

### Priority #1: Google Drive API Integration
**Solves the mobile sync problem!**
- Direct Google Drive API integration (no folder picker needed)
- "Sign in with Google" button
- Works on ALL devices (Windows, Android, iOS, Mac)
- Automatic sync without manual export/import
- Status: Can be implemented - let me know if you want this!

### Other Planned Improvements:
- Real-time sync (no 5-minute delay)
- Conflict resolution UI for simultaneous edits
- Sync history and version control
- Offline queue for changes made without internet
- Multiple device simultaneous editing
- Native mobile apps with better sync
- OneDrive API integration
- Dropbox API integration

---

## Quick Reference: Free Storage Limits

| Provider       | Free Storage | Best For           |
|----------------|--------------|-------------------|
| Google Drive   | 15GB         | Most users        |
| OneDrive       | 5GB          | Windows users     |
| Dropbox        | 2GB          | Simple setup      |
| iCloud         | 5GB          | Apple users       |

**Echo Flow data size**: Approximately 1-10MB per year of usage (very small!)

---

## Need Help?

- Check GitHub Issues: https://github.com/fxa3bah/Echo-flow/issues
- File a bug report if sync isn't working
- Feature requests welcome!

---

**Last Updated**: January 2026
