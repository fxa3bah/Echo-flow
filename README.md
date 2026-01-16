# Echo Flow

A fast, intuitive voice-first productivity web application that combines quick voice-to-text journaling, task management, and calendar organization.

![Echo Flow](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### 🎙️ Voice Recording
- **One-tap voice recording** with instant transcription
- Powered by the Web Speech API for high accuracy
- Supports multiple languages and non-native accents
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

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview
```

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
