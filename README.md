# Sky — Agentic AI & Autonomous Schedule Assistant

**Sky** is a modern, reactive Android and cross-platform mobile application built with **React Native Expo (SDK 58)**, **Expo Router**, **Supabase**, and **Google Gemini AI**.

---

## 🌟 Key Highlights & Architecture

### 1. Visual Branding & Edge-to-Edge Navigation
- **Orbital Aesthetics**: Futuristic deep space background (`#070A12`) with vibrant blue and neon cyan accents (`#00F0FF`, `#0284C7`, `#2563EB`).
- **Vector Adaptive Launcher Icon**: `assets/sky_logo.xml` with orbital gradient discs and stylized AI cores.
- **Top Skyline Header (`SKYLINE`)**:
  - Sky logo with an "AI" badge.
  - Real-time **Supabase Cloud Synchronization Status Indicator** ("Supabase Active" / "Syncing..." / "Local Mode").
  - **Top-Right Person Icon**: Opens the Personal Assistant & Knowledge Hub with a dynamic badge indicating stored knowledge count.
- **Bottom Navigation Bar (`SKY`) with Elevated Center Action**:
  - **Tab 1: Schedule**: Actionable timetable blocks, task completion checkboxes, priority badges (High, Medium, Low), source citations, and category tags.
  - **Tab 2: Automated**: Agentic scheduler, precise hour/minute time picker, contacts integration, autonomous AI phone calling, and in-app WhatsApp unread hub.
  - **Center Floating Logo Action**: Elevated glowing Sky logo button that triggers the Personal Knowledge Hub modal.
  - **Tab 3: Replies**: Stored transcripts and responses received from contacts for WhatsApp messages and AI voice calls with sentiment badges and duration.
  - **Tab 4: Sky AI**: Grounded conversational assistant powered by Gemini with full Text-to-Speech (TTS) audio playback.

---

### 2. Personal Assistant & Knowledge Hub (Supabase Backend)
- **Clean Slate Initial State**: Starts without fake/pre-populated placeholder tasks so you begin with a clean slate.
- **Upload Capabilities**:
  - **Photos/Images**: System image picker (`expo-image-picker`) with image preview and compression.
  - **Documents/PDFs**: Document picker (`expo-document-picker` & `expo-file-system`) reading text from syllabus, project specs, or itineraries.
  - **Daily Routine & Habit Notes**: Modal form allowing users to enter custom daily habits, wake-up times, study hours, or meeting blocks.
- **Persistent Cloud Storage**: Stored in Supabase (`user_knowledge` table) with offline-first local persistence.
- **AI Plan Generation**: Analyzes exclusively the user's uploaded documents, photos, and routine notes to generate structured timetable schedule items and priority tasks.

---

### 3. Agentic AI & Automated Communication Engine
- **Mode Toggle**: Switch seamlessly between **Agentic AI** (autonomous execution, negotiation, and logging) and **Manual Mode** (user-confirmed action).
- **Precise Timing Scheduler**:
  - Full Hour (1–12) and Minute (00–59) digital clock picker.
  - AM / PM segmented buttons.
  - Quick interval chips (+5m, +15m, +30m, 9 AM, 2:30 PM).
  - Fine +/- 1 min and +/- 5 min steppers.
  - Background scheduler loop monitoring system time to automatically trigger tasks at the exact scheduled minute.
- **Phone Contacts Integration**:
  - Integrated `READ_CONTACTS` and `CALL_PHONE` permissions with real-time status badges.
  - System contact picker to search and select contacts directly from device address book.
- **Autonomous AI Phone Calling (`VoiceCallModal`)**:
  - Animated calling interface with live call timer, pulsing avatar, and live two-way transcript.
  - Sky AI articulates the user's specific context and work goal using native `TextToSpeech` (`expo-speech`), records contact responses, and saves duration and transcript.
  - Fallback button to launch the native system dialer directly (`tel:...`).
- **In-App WhatsApp Unread Messages Hub**:
  - Displays incoming WhatsApp messages.
  - **1-Tap Agentic Auto-Reply**: Sky AI drafts context-aware suggested reply that opens WhatsApp with pre-filled response in one tap (`whatsapp://send`).
  - Simulation tool to test receiving incoming messages in prototype environments.

---

### 4. Sky AI Chat Assistant with Text-to-Speech (TTS)
- Conversational chat interface grounded in uploaded documents and timetable.
- Native Text-to-Speech (`expo-speech`):
  - Audio playback button on every AI bubble ("Listen").
  - Visual "Speaking Response..." status bar with instant "Stop" button.
  - Auto-Speak toggle chip for hands-free voice readouts.
- Quick prompt chips for fast schedule queries.

---

## 🚀 Running the App

### Prerequisites
- Node.js (v18+)
- Android Studio or Expo Go app on an Android device

### Running the App

```bash
# Run on Web (Desktop / Laptop / Tablet browser)
npm run web
# or: npx expo start --web

# Run on Android emulator / connected device
npx expo start --android

# Start the interactive development server (press 'w' for web, 'a' for android)
npx expo start
```

### Type Checking & Build Verification
```bash
npx tsc --noEmit
```
All routes and components compile with **0 TypeScript errors** and bundle cleanly with Metro.

