# Echo Flow

A fast, intuitive voice-first productivity web application that combines quick voice-to-text journaling, task management, and calendar organization.

![Echo Flow](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### 🎙️ Voice Recording
- **One-tap voice recording** with instant transcription
- **Dual Mode**: OpenAI Whisper (preferred) or Web Speech API (fallback)
- **Whisper Mode**: Industry-leading accuracy, 99+ languages, better accent support
- **Cost**: Only $0.006 per minute with Whisper ($0.60 for 100 minutes)
- Audio automatically deleted after transcription for privacy

### 🤖 AI-Powered Categorization
- Automatic analysis and categorization of transcriptions
- Categories: Journal, Todo, Reminder, or Note
- Smart date detection (e.g., "meeting next Friday")
- Automatic tagging with relevant keywords
- Works with local LLM (Ollama) or intelligent fallback rules

### 📝 Transcription Management
- View all transcriptions in a clean, organized list
- Edit, delete, or recategorize any transcription
- Filter by category and tags
- Timestamps for easy reference

### 📅 Smart Calendar & Daily View
- Interactive calendar with monthly view
- Daily view showing all entries for selected date
- Tasks with checkboxes and completion tracking
- Visual indicators for days with entries

### 📊 Eisenhower Matrix
- Organize tasks by urgency and importance
- Four quadrants: Do First, Schedule, Delegate, Eliminate
- Drag-and-drop between quadrants
- Quick priority updates

### 📖 Rich Text Daily Diary
- TipTap-powered rich text editor
- Markdown support
- Bold, italic, lists, and headers
- Auto-save functionality
- Navigate between days easily

### ⚡ Additional Features
- **Dark/Light Mode**: System-aware theme with manual toggle
- **Offline Support**: PWA with service workers
- **Keyboard Shortcuts**: Power user navigation
- **Data Export**: Export to JSON or plain text
- **Responsive Design**: Mobile-first, works on all devices
- **Accessibility**: Screen reader support and high contrast mode

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Modern browser (Chrome, Edge, Safari, or Firefox)
- (Optional but Recommended) OpenAI API key for Whisper transcription
- (Optional) Ollama with llama3.2 model for enhanced AI features

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

3. **(Recommended) Set up OpenAI Whisper for high-accuracy transcription:**

   a. Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)

   b. Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```

   c. Add your API key to `.env`:
   ```
   VITE_OPENAI_API_KEY=sk-your-actual-key-here
   ```

   **Note:** If you skip this step, the app will automatically use the browser's Web Speech API as a fallback.

4. Start the development server:
```bash
npm run dev
```

5. Open your browser to `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview
```

### Deploying to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. **Important:** Add your OpenAI API key as an environment variable:
   - Go to Project Settings → Environment Variables
   - Add: `VITE_OPENAI_API_KEY` = `sk-your-key-here`
4. Deploy!

Your app will automatically use Whisper for transcription once deployed with the API key.

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

### Keyboard Shortcuts
- `Ctrl + R` - Record view
- `Ctrl + T` - Transcriptions
- `Ctrl + C` - Calendar
- `Ctrl + M` - Eisenhower Matrix
- `Ctrl + D` - Diary
- `Ctrl + ,` - Settings

### Using with Ollama (Optional)

For enhanced AI categorization, install Ollama:

1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Pull the llama3.2 model:
```bash
ollama pull llama3.2
```
3. Ensure Ollama is running (it runs on `localhost:11434` by default)
4. Echo Flow will automatically detect and use it

Without Ollama, the app uses intelligent rule-based categorization.

## ⚠️ Troubleshooting Transcription Issues

### "Connection Error" with OpenAI Whisper

If you see a "Transcription Failed: Connection error" message, this is likely due to one of the following:

**1. Missing or Invalid API Key**
- Ensure you've created a `.env` file with `VITE_OPENAI_API_KEY`
- API key should start with `sk-` and not be the placeholder value
- Verify the key is valid at [OpenAI Platform](https://platform.openai.com/api-keys)

**2. CORS Restrictions (Common Issue)**

OpenAI's API has limited support for direct browser calls, which can cause CORS (Cross-Origin Resource Sharing) errors. When this happens, the app will:
- Show a connection error message
- Automatically switch to browser-based Web Speech API
- Display a warning explaining the limitation

**Solutions:**
- **Recommended**: Use the Web Speech API (works in Chrome, Edge, Safari)
  - The app automatically falls back to this
  - Click "Switch to Browser Speech Recognition" in the UI
  - No API key or costs required
  - Good accuracy for English and major languages

- **For Production**: Set up a backend proxy
  - Deploy a simple API endpoint that forwards requests to OpenAI
  - Update the `whisperService.ts` to call your proxy instead
  - This avoids CORS issues and keeps your API key secure

**3. Network Connectivity**
- Check your internet connection
- Verify you can access `https://api.openai.com`
- Check if corporate firewalls are blocking the API

### Switching Between Transcription Modes

The app supports two transcription methods:

1. **OpenAI Whisper** (High Accuracy)
   - Requires API key and costs $0.006/minute
   - 99+ language support
   - Better with accents and noisy environments
   - May fail due to CORS in browser

2. **Web Speech API** (Browser-Based)
   - Free and built into modern browsers
   - Works offline once loaded
   - Good accuracy for clear speech
   - Best supported in Chrome/Edge
   - No CORS issues

You can manually switch between modes using the toggle button in the voice recorder interface.

## 🏗️ Architecture

### Tech Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Database**: IndexedDB with Dexie.js
- **Rich Text Editor**: TipTap
- **Speech-to-Text**: Web Speech API
- **AI Integration**: Ollama (optional) with fallback logic
- **PWA**: Vite PWA Plugin

### Project Structure
```
src/
├── components/       # React components
│   ├── VoiceRecorder.tsx
│   ├── Navigation.tsx
│   ├── TranscriptionsList.tsx
│   ├── CalendarView.tsx
│   ├── EisenhowerMatrix.tsx
│   ├── DiaryEditor.tsx
│   └── SettingsModal.tsx
├── hooks/           # Custom React hooks
│   ├── useSpeechRecognition.ts
│   └── useKeyboardShortcuts.ts
├── lib/             # Utilities and core logic
│   ├── db.ts        # Dexie database
│   ├── utils.ts     # Helper functions
│   └── export.ts    # Export functionality
├── services/        # External services
│   └── aiService.ts # AI categorization
├── stores/          # Zustand stores
│   ├── appStore.ts
│   └── themeStore.ts
├── types/           # TypeScript types
│   └── index.ts
├── App.tsx          # Main app component
├── main.tsx         # Entry point
└── index.css        # Global styles
```

## 🔒 Privacy & Security

- **Local-First**: All data stored locally in IndexedDB
- **No Server**: No data sent to external servers (except Ollama if configured locally)
- **Audio Deletion**: Voice recordings automatically deleted after transcription
- **Offline Support**: Fully functional without internet connection

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

- Built with [React](https://react.dev/)
- UI styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Lucide](https://lucide.dev/)
- Rich text editing by [TipTap](https://tiptap.dev/)
- AI powered by [Ollama](https://ollama.ai/)

## 📞 Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

Made with ❤️ for productivity enthusiasts
