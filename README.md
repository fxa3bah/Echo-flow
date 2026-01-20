# Echo Flow

A fast, intuitive voice-first productivity web application that combines quick voice-to-text journaling, task management, and calendar organization with AI-powered insights.

![Echo Flow](https://img.shields.io/badge/version-2.2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🎉 What's New in v2.2

### 📱 Progressive Web App (PWA) (NEW!)
- **Install on Any Device**: Add to home screen on iPhone, Android, Windows, Mac
- **Works Offline**: Full offline support with service worker caching
- **Native App Experience**: Runs in standalone mode without browser chrome
- **App Shortcuts**: Quick actions from home screen (Android long-press)
- **Beautiful Icons**: Custom gradient audio wave icon across all platforms
- **Auto-Update**: Background updates when new version available
- **Cross-Platform**: iOS 11.3+, Android 5+, Windows, Mac, Linux

### ☁️ Supabase Cloud Sync (NEW!)
- **Real-Time Sync**: Automatic sync across all your devices instantly
- **Email/Password Auth**: Simple authentication with no OAuth setup required
- **Manual Controls**: "Sync Now" and "Pull Latest" buttons for full control
- **Conflict Resolution**: Intelligent timestamp-based sync resolution
- **Background Sync**: Changes automatically synced every 5 minutes
- **Free Tier**: Uses Supabase free tier (500MB database, 1GB file storage)
- **Setup Guide**: Quick 5-minute setup with SQL schema included in code

### 🎯 Focus View Improvements
- **Refresh Button**: Manual refresh to ensure all items are displayed
- **Better Organization**: Items organized by time horizon (Do Now, This Week, Later)
- **Enhanced Visibility**: Clearer visual indicators for task priorities

### 📝 Improved Diary Layout
- **Better Spacing**: Reduced min-height for notes section (320px → 240px)
- **Enhanced Visual Design**: Rounded corners, shadows, and better padding
- **Improved Collapsible Sections**: More intuitive expand/collapse with better icons
- **Cleaner Header**: Streamlined date navigation with better button styling
- **Better Touch Targets**: Improved hover effects and interactive elements

### 🤖 Smarter AI Context
- **Focus-Aware**: AI now recognizes "Do Now" items (tasks due within 24 hours)
- **Priority Understanding**: AI knows what's urgent vs what can wait
- **Time Horizon Context**: Shows tasks organized by Do Now, This Week, and Later
- **Better Task Recognition**: More accurate responses to questions about priorities

---

## 🎉 What's New in v2.1

### ☁️ Direct Cloud API Integration
- **Google Drive API**: Direct API integration with OAuth 2.0
- **OneDrive API**: Microsoft Graph API integration
- **Mobile-Friendly**: Works on all devices including mobile browsers
- **No Folder Picker**: Simple "Sign in" button - no folder selection needed
- **Auto-Sync**: Automatic sync every 5 minutes
- **Solves Mobile Limitation**: File picker restriction is now bypassed
- Setup guide: [CLOUD_SYNC_SETUP.md](CLOUD_SYNC_SETUP.md)

---

## What's New in v2.0 (Sprint 1)

### ✅ Navigation & Mobile UX
- **Sticky Navigation**: Header stays visible while scrolling on mobile and desktop
- **Mobile-Optimized**: 44px minimum touch targets for all buttons
- **Backdrop Blur**: Modern glass morphism effect on navigation bar
- **Responsive Spacing**: Adaptive padding that adjusts for mobile/desktop

### 🤝 AI Action Confirmation
- **Inline Action Cards**: Preview AI-suggested actions before saving
- **Granular Control**: Accept, Edit, or Reject each action individually
- **Editable Fields**: Modify title, content, date, and tags before accepting
- **Accept All**: Quick approve all actions with one click
- **Visual Feedback**: Rejected actions shown as grayed out

### 📋 Daily View Polish
- **Collapsible Sections**: Expand/collapse Captured Notes, Tasks, and Daily Notes
- **Smart Counts**: Shows active vs completed tasks, total notes count
- **Task Prioritization**: Incomplete tasks shown first with bold text
- **Completed Tasks**: Shown after active tasks with reduced opacity

## ✨ Core Features

### 🎙️ Voice Recording
- **One-tap voice recording** with instant transcription
- **Dual Mode System**:
  - **Online**: Groq Whisper API (FREE tier: 14,400 seconds/day = 4 hours)
  - **Offline**: Web Speech API (privacy-friendly, no API needed)
- **Automatic Fallback**: Switches to offline mode on connection errors
- **Ultra-Fast**: 0.3s to transcribe 60s of audio with Groq
- **High Accuracy**: Whisper Large v3 model, 99+ languages
- **Privacy**: Audio deleted after transcription, offline mode never sends data

### 🤖 AI Chat & Insights
- **Natural Conversation**: Chat with AI to capture ideas, tasks, and notes
- **Automatic Extraction**: AI identifies actionable items from conversation
- **Action Preview**: Review and edit AI-suggested actions before saving
- **Voice Input**: Use voice to chat with AI
- **Context-Aware**: Uses your existing daily data for relevant suggestions
- **Groq Llama 3.3 70B**: Fast, powerful language model

### 📊 All Entries - Master Data View
- **Unified View**: See ALL your data in one place (transcriptions, todos, reminders, notes, diary entries)
- **Sortable Columns**: Click any column header to sort by date, type, or content
- **Chronological Order**: Everything in order from newest to oldest
- **Search**: Filter across all content and tags instantly
- **Quick Actions**: Mark tasks complete, delete any entry type
- **Clean & Simple**: No clutter, just your data in a clear table
- **Data Integrity**: ONE source of truth for all captured information

### 📝 LogSeq-Style Daily Notes
- **Markdown Editor**: Write notes in markdown with live preview
- **40+ Slash Commands**: Type `/` for quick formatting:
  - Basic: `[[page]]`, bold, italic, code, links
  - Headings: `#` to `######`
  - Tasks: `- [ ]`, `- [x]`, `- [>]`, `- [?]`
  - Priority: `[#A]`, `[#B]`, `[#C]`
  - Dynamic dates and time insertion
- **Unified Daily View**: See transcriptions, tasks, and notes in one place
- **Collapsible Sections**: Organize your day with expandable sections
- **Auto-Save**: Changes saved automatically after 1 second
- **Preview Mode**: Toggle between edit and formatted view

### 📅 Smart Calendar
- Interactive calendar with monthly view
- Daily view showing all content types (entries, transcriptions, notes)
- Tasks with checkboxes and completion tracking
- Visual indicators for days with content
- Quick note creation with optional titles
- Markdown rendering for diary entries

### 📊 AI-Powered Eisenhower Matrix
- **AI Categorization**: Uses Groq Llama 3.3 70B to analyze priority
- **Intelligent Analysis**: Understands urgency and importance from content
- **Four Quadrants**: Do First, Schedule, Delegate, Eliminate
- **Date Filtering**: Today, this week, next 7 days, etc.
- **Multi-Source**: Analyzes transcriptions, entries, and diary notes
- **Actionable**: Mark items as complete directly in matrix

### 💾 Smart Data Management
- **🆕 Supabase Cloud Sync** (v2.2): Real-time sync with email/password auth
  - ✅ Real-time sync across all devices
  - ✅ Manual "Sync Now" and "Pull Latest" controls
  - ✅ Automatic background sync every 5 minutes
  - ✅ Simple email/password authentication
  - ✅ Conflict resolution with timestamp comparison
  - Setup: Add Supabase credentials to `.env` file (5-minute setup)
- **Cloud API Sync**: Direct Google Drive & OneDrive integration
  - ✅ Works on mobile browsers (solves file picker limitation!)
  - ✅ Simple "Sign in with Google/Microsoft" button
  - ✅ Auto-sync every 5 minutes
  - ✅ No folder selection needed
  - See [CLOUD_SYNC_SETUP.md](CLOUD_SYNC_SETUP.md) for setup instructions
- **Local Folder Sync**: Auto-sync to local folder (desktop only)
- **File System Access API**: Choose your sync folder, works offline
- **Manual Controls**: "Save Now" and "Load Now" buttons
- **Data Export**: Export all data to JSON with timestamps
- **Import/Merge**: Import data with deduplication
- **Local-First**: All data stored in IndexedDB

### 🔄 Smart Deduplication
- **Duplicate Prevention**: Checks date, type, title, and content
- **Update Instead of Create**: Modifies existing entries when detected
- **Tag Merging**: Combines tags from new and existing entries
- **Diary Content Check**: Avoids duplicate appends to daily notes

### ⚡ Additional Features
- **Progressive Web App**: Install on any device, works offline, native app experience
- **Dark/Light Mode**: System-aware theme with manual toggle
- **Offline Support**: Service workers cache all assets, works without internet
- **Keyboard Shortcuts**: Power user navigation (Ctrl+R, Ctrl+D, Ctrl+A, etc.)
- **Responsive Design**: Mobile-first with sticky navigation
- **Accessibility**: 44px touch targets, screen reader support
- **App Shortcuts**: Quick actions from home screen (Android)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Modern browser (Chrome, Edge, Safari, or Firefox)
- **(Recommended) Groq API key** for AI features (FREE tier available)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/echo-flow.git
cd echo-flow
```

2. Install dependencies:
```bash
npm install
```

3. **(Recommended) Set up Groq API for AI features:**

   a. Get a FREE API key from [Groq Console](https://console.groq.com/keys)
      - **FREE Tier**: 14,400 seconds/day transcription + generous chat limits
      - No credit card required

   b. Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```

   c. Add your API key to `.env`:
   ```
   VITE_GROQ_API_KEY=gsk_your-actual-key-here
   ```

   **Note:** If you skip this step:
   - Transcription will use browser's Web Speech API (offline mode)
   - AI Chat will not be available

4. **(Optional) Set up Supabase for cloud sync:**

   a. Create a FREE Supabase account at [supabase.com](https://supabase.com)

   b. Create a new project

   c. Go to Project Settings → API and copy:
      - Project URL
      - `anon public` API key

   d. Add to your `.env` file:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

   e. Go to SQL Editor and run this schema (also in `src/services/supabaseSync.ts`):
   ```sql
   -- Create user_data table
   CREATE TABLE IF NOT EXISTS user_data (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     data JSONB NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(user_id)
   );

   -- Enable RLS
   ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

   -- Policy: Users can only access their own data
   CREATE POLICY "Users can CRUD their own data"
     ON user_data
     FOR ALL
     USING (auth.uid() = user_id)
     WITH CHECK (auth.uid() = user_id);

   -- Create index for faster queries
   CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON user_data(user_id);
   ```

   f. Go to Authentication → Providers → Email
      - Disable "Confirm email" for instant signup

   **Note:** If you skip this step:
   - Cloud sync will not be available
   - Local sync and other features will still work

4. Start the development server:
```bash
npm run dev
```

5. Open your browser to `http://localhost:5173`

### Installing as PWA (Progressive Web App)

Echo Flow can be installed on any device as a native app!

#### iPhone/iPad (iOS)
1. Open the app in Safari
2. Tap the Share button (box with arrow)
3. Scroll down → "Add to Home Screen"
4. Tap "Add"

#### Android
1. Open the app in Chrome
2. Tap menu (⋮) → "Install app"
3. Confirm installation

#### Windows/Mac Desktop
1. Open app in Chrome/Edge
2. Click install icon (⊕) in address bar
3. Click "Install"

**Benefits of Installing:**
- Works offline
- Faster loading (cached assets)
- No browser chrome (full screen)
- Quick access from home screen/desktop
- Background updates

See [PWA_SETUP.md](PWA_SETUP.md) for more details.

### Building for Production

```bash
npm run build
npm run preview
```

### Deploying to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. **Important:** Add your Groq API key as an environment variable:
   - Go to Project Settings → Environment Variables
   - Add: `VITE_GROQ_API_KEY` = `gsk-your-key-here`
4. Deploy!

Your app will use Groq Whisper for transcription and Llama for AI chat once deployed.

## 🎯 Usage

### Voice Recording
1. Click the large microphone button on the home screen
2. Speak your thoughts, tasks, or reminders
3. Click again to stop recording
4. Review the transcription and click "Save"

The AI will automatically:
- Categorize your entry
- Add relevant tags
- Extract mentioned dates
- Create calendar entries or tasks as needed

### AI Chat Usage
1. Navigate to the home screen (Record view)
2. Scroll down to the AI Chat box
3. Type or use voice input to describe what you need
4. Review the AI's response and action suggestions
5. Click "Accept", "Edit", or "Reject" on each action card
6. Accepted actions are automatically saved to your daily notes/tasks

Example prompts:
- "I need to buy groceries tomorrow and call mom on Friday"
- "Today was amazing! I finished my presentation"
- "Remind me to review the budget report next Monday"

### Keyboard Shortcuts
- `Ctrl + R` - Record view (home)
- `Ctrl + D` - Daily Notes
- `Ctrl + A` - AI Chat (full page)
- `Ctrl + E` - All Entries (master data)
- `Ctrl + C` - Calendar
- `Ctrl + M` - Eisenhower Matrix
- `Ctrl + ,` - Settings

## ⚠️ Troubleshooting

### Transcription Issues

**"Connection Error" or transcription fails:**

1. **Missing or Invalid Groq API Key**
   - Ensure you've created a `.env` file with `VITE_GROQ_API_KEY`
   - API key should start with `gsk_` and not be the placeholder value
   - Get a free key at [Groq Console](https://console.groq.com/keys)

2. **Automatic Fallback**
   - If Groq fails, the app automatically switches to Web Speech API
   - Look for "Offline Mode" or WiFi icon in the UI
   - No action needed - it just works!

3. **Network Issues**
   - Check your internet connection
   - Verify you can access `https://api.groq.com`
   - Check if firewalls are blocking the API

### Transcription Modes

The app intelligently manages two modes:

1. **Online Mode (Groq Whisper)**
   - FREE tier: 14,400 seconds/day (4 hours)
   - 0.3s to transcribe 60s of audio
   - High accuracy, 99+ languages
   - Better with accents and noisy environments

2. **Offline Mode (Web Speech API)**
   - Free and privacy-friendly
   - Audio never leaves your device
   - Works offline once loaded
   - Best in Chrome/Edge
   - Auto-enabled when Groq unavailable

Toggle between modes manually using the mode selector in the voice recorder.

### AI Chat Not Working

- Ensure `VITE_GROQ_API_KEY` is set in your `.env` file
- Restart the dev server after adding the key: `npm run dev`
- Check browser console for detailed error messages
- Verify you haven't exceeded the free tier limits (unlikely)

### Supabase Sync Error: "record 'new' has no field 'version'"

This error means your Supabase table schema doesn't match the expected format. To fix:

1. **Go to Supabase SQL Editor** and run this command to check your schema:
   ```sql
   \d user_data
   ```

2. **If the table has a `version` column**, drop it:
   ```sql
   ALTER TABLE user_data DROP COLUMN IF EXISTS version;
   ```

3. **Verify your table only has these columns**:
   - `id` (UUID, primary key)
   - `user_id` (UUID, foreign key to auth.users)
   - `data` (JSONB) - this stores ALL your app data
   - `created_at` (timestamp)
   - `updated_at` (timestamp)

4. **If the table structure is completely wrong**, drop and recreate it:
   ```sql
   DROP TABLE IF EXISTS user_data;

   CREATE TABLE user_data (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     data JSONB NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(user_id)
   );

   ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Users can CRUD their own data"
     ON user_data
     FOR ALL
     USING (auth.uid() = user_id)
     WITH CHECK (auth.uid() = user_id);

   CREATE INDEX idx_user_data_user_id ON user_data(user_id);
   ```

5. **Clear old data** and try syncing again

## 🏗️ Architecture

### Tech Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom theming
- **State Management**: Zustand
- **Database**: IndexedDB with Dexie.js
- **Markdown**: Marked with @tailwindcss/typography
- **Speech-to-Text**: Groq Whisper API + Web Speech API (fallback)
- **AI Chat**: Groq Llama 3.3 70B Versatile
- **Icons**: Lucide React
- **PWA**: Vite PWA Plugin

### Project Structure
```
src/
├── components/              # React components (11 files)
│   ├── VoiceRecorder.tsx    # Voice recording with dual mode
│   ├── Navigation.tsx       # Sticky navigation bar
│   ├── AIChatBox.tsx        # Embedded AI chat
│   ├── AIInsights.tsx       # Full-page AI chat view
│   ├── AIActionCard.tsx     # Action preview cards (NEW in v2.0)
│   ├── AllEntries.tsx       # Master data view - all entries unified (NEW in v2.0)
│   ├── CalendarView.tsx     # Calendar with markdown rendering
│   ├── EisenhowerMatrix.tsx # AI-powered priority matrix
│   ├── DiaryEditor.tsx      # LogSeq-style markdown editor
│   ├── SlashCommandMenu.tsx # Slash command autocomplete
│   └── SettingsModal.tsx    # Settings and sync
├── hooks/                   # Custom React hooks (4 files)
│   ├── useSpeechRecognition.ts  # Web Speech API wrapper
│   ├── useAudioRecorder.ts      # Audio recording logic
│   ├── useAIChat.ts             # AI chat state (NEW in v2.0)
│   └── useKeyboardShortcuts.ts  # Keyboard navigation
├── lib/                     # Core utilities
│   ├── db.ts                # Dexie IndexedDB setup
│   ├── utils.ts             # Helper functions
│   └── export.ts            # Export/import functionality
├── services/                # External service integrations (7 files)
│   ├── aiService.ts         # Local AI categorization (rule-based)
│   ├── aiActions.ts         # AI action processing (NEW in v2.0)
│   ├── groqService.ts       # Groq Whisper transcription
│   ├── groqChatService.ts   # Groq chat with action extraction
│   ├── matrixAI.ts          # AI-powered matrix analysis
│   ├── dataSync.ts          # Cloud sync with File System API
│   └── whisperService.ts    # Web Speech API fallback
├── stores/                  # Zustand state stores
│   ├── appStore.ts          # App-wide state
│   └── themeStore.ts        # Theme management
├── types/                   # TypeScript definitions
│   └── index.ts             # Shared types
├── App.tsx                  # Main app with sticky nav
├── main.tsx                 # Entry point
└── index.css                # Global Tailwind styles
```

## 🔒 Privacy & Security

- **Local-First**: All data stored locally in IndexedDB
- **Offline Mode**: Voice recording works completely offline with Web Speech API
- **Audio Deletion**: Voice recordings automatically deleted after transcription
- **No Data Collection**: No analytics, tracking, or data sent to third parties
- **Optional Cloud**: Groq API only used when explicitly enabled
- **Sync Control**: You choose where to sync (OneDrive/Google Drive/Dropbox)
- **Open Source**: Full transparency in code

## 🛠️ Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Browser Compatibility
- Chrome/Edge 85+
- Safari 14.1+
- Firefox 100+

**Note**: Speech recognition works best in Chrome/Edge.

## 📦 Data Management

### Export
Export your data via Settings:
- **JSON**: Complete data backup
- **Text**: Human-readable format

### Import
Currently, import is available via the browser console:
```javascript
import { importFromJSON } from './lib/export'
const jsonData = '...' // your exported JSON
await importFromJSON(jsonData)
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [React](https://react.dev/) and [TypeScript](https://www.typescriptlang.org/)
- UI styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Lucide](https://lucide.dev/)
- Markdown rendering by [Marked](https://marked.js.org/)
- AI powered by [Groq](https://groq.com/) (Whisper + Llama 3.3 70B)
- Database by [Dexie.js](https://dexie.org/)
- Inspired by [LogSeq](https://logseq.com/) for note-taking UX

## 📞 Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

Made with ❤️ for productivity enthusiasts
