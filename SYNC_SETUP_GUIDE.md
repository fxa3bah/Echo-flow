# Echo Flow - Easy Sync Setup Guide

## Problem: Syncing Between Phone and Windows Laptop

Echo Flow already has cloud sync built-in! Here are the **easiest free options** without complicated setup:

---

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

#### On Your Phone:

**Option A: Use Browser (PWA)**
1. Open Chrome/Safari on your phone
2. Go to your Echo Flow URL (e.g., https://your-echoflow-url.com)
3. Open Settings
4. Click "Choose Sync Folder" and select the same `EchoFlow` folder
5. Click "Load Now" to download your data

**Option B: Access Files Directly (if self-hosted)**
1. Install Google Drive app on phone
2. Navigate to the EchoFlow folder
3. Open the JSON file to view/edit
4. Echo Flow will auto-sync when you open it next

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

1. **Install Google Drive app** (if not already installed)
2. **Open Echo Flow** in mobile browser
3. **Add to Home Screen** (for PWA experience):
   - Chrome Android: Menu → "Add to Home screen"
   - Safari iOS: Share → "Add to Home Screen"
4. **Open Settings** in Echo Flow
5. **Enable Cloud Sync**:
   - Toggle ON
   - Click "Choose Sync Folder"
   - Select the same `EchoFlow` folder
6. **Load your data**:
   - Click "Load Now"
   - Wait for "Loaded X entries" message
7. **Done!** Both devices now sync automatically

---

## Troubleshooting Common Issues

### Problem: "Choose Sync Folder" button doesn't work on phone

**Solution**: The File System Access API doesn't work on all mobile browsers.

**Workaround**:
1. Use the Export/Import feature instead:
   - On Windows: Settings → "Export Data" → Save JSON file to Google Drive
   - On Phone: Download the JSON file from Google Drive
   - In Echo Flow: Settings → "Import Data" → Select the JSON file

2. Or use the web version on laptop only, and access Google Drive files directly on phone

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

Coming in future versions:
- Real-time sync (no 5-minute delay)
- Conflict resolution UI
- Sync history and version control
- Offline queue for changes
- Multiple device simultaneous editing
- Native mobile apps with better sync

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
