# 🎓 Engage Faculty — Real-Time Classroom Orchestration Platform

A powerful, high-performance instructor dashboard designed to drive real-time classroom engagement, live gamified competitions, synchronized learning activities, and instant student comprehension tracking.

---

## 🚀 Overview

**Engage Faculty** empowers educators to transform standard lectures into interactive, dynamic sessions. Acting as the central orchestration cockpit, the teacher dashboard controls and synchronizes connected student devices across multiple activity modes in real time.

```
+-----------------------------------------------------------------------------+
|                          ENGAGE FACULTY DASHBOARD                           |
|                                                                             |
|  +-----------------------------------------------------------------------+  |
|  | [Lobby]     [Polls]     [Speed Typer]     [Flashcards]     [Live Q&A] |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
|  +-------------------------------------+  +------------------------------+  |
|  |         Active Arena View           |  |     Live Class Analytics     |  |
|  |  - Synchronized Activity Broadcast  |  |  - Real-time Pace Meter      |  |
|  |  - Instant Question Launcher        |  |  - Confusion Index           |  |
|  |  - Timer & Response Locking         |  |  - Connected Students Roster |  |
|  +-------------------------------------+  +------------------------------+  |
+-----------------------------------------------------------------------------+
```

---

## ✨ Key Features

### 🎛️ 1. Centralized Circular Navigation Cockpit
- **Radial Control Hub**: Seamlessly switch between active lecture states (Lobby, Polls, Flashcards, Speed Typer, Q&A, and Wrap-up).
- **Synchronized State Routing**: Updating the active module on the instructor dashboard instantly routes all connected student screens.

### 🗳️ 2. Live Polls & Survey Manager
- **Dynamic Question Launcher**: Broadcast single-choice, multiple-choice, and open-ended questions.
- **Real-Time Distribution Analytics**: Live animated bar charts updating instantly as student responses are submitted.
- **Timer & Submissions Control**: Automatic or manual timer countdowns with instant submission locking and answer reveals.

### ⌨️ 3. Speed Typer Multiplayer Arena
- **Real-Time Code & Text Racing**: Launch competitive typing exercises using code snippets or lecture-specific terminology.
- **Live Classroom Leaderboard**: Real-time tracking of words-per-minute (WPM), accuracy percentages, and completion times.
- **Celebration Ceremony**: Animated victory podium with dynamic canvas-confetti celebration effects.

### 📇 4. Interactive 3D Flashcards Arena
- **Hardware-Accelerated 3D Flip**: Smooth 3D flip card animations for rapid concept review and formula testing.
- **Audience Confidence Breakdown**: Aggregates student self-assessment ratings (*Mastered*, *Reviewing*, *Confused*) in real time.
- **Speaker Promotion**: Seamlessly designate any active student as the live speaker to share notes and lead the discussion.

### ❓ 5. Crowd-Sourced Live Q&A Forum
- **Upvote-Driven Prioritization**: Student questions automatically sorted in real time by upvote count (`votes DESC`).
- **Instructor Moderation**: Pin top inquiries, mark questions as answered, or filter by topic tags.
- **Visual Alert Badges**: Live counters and unread question indicators.

### 📈 6. Real-Time Student Comprehension & Pace Check
- **Continuous Pace Meter**: Live feedback gauge tracking student understanding (*Understood*, *Getting Lost*, *Confused*).
- **Instant Lecture Tuning**: Immediate insight into lecture pacing without interrupting the flow of teaching.

---

## 🛠️ Technology Stack

- **Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Build Tool**: [Vite 5](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + Custom Glassmorphism System
- **Real-Time Pub/Sub**: [Supabase Realtime](https://supabase.com/realtime) (WebSockets)
- **Icons & Visuals**: [Lucide React](https://lucide.dev/) + [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)

---

## 📁 Project Structure

```
engage-faculty/
├── src/
│   ├── components/
│   │   ├── ActivityManager.tsx   # Central orchestrator & session manager
│   │   ├── CircularMenu.tsx      # Radial navigation cockpit
│   │   ├── FlashcardsArena.tsx   # 3D interactive flashcards
│   │   ├── PollsManager.tsx      # Live polling & vote aggregation
│   │   ├── QAArena.tsx           # Crowd-sourced Q&A forum
│   │   └── SpeedTyper.tsx        # Multiplayer typing arena & podium
│   ├── lib/
│   │   └── supabase.ts           # Supabase client & fallback broadcast engine
│   ├── types.ts                  # Shared TypeScript data contracts
│   ├── index.css                 # Design tokens, Tailwind utilities & animations
│   ├── App.tsx                   # Root state orchestration
│   └── main.tsx                  # React 18 entrypoint
├── features.md                   # Detailed feature guide & classroom manual
├── metadata.json                 # Project descriptors
├── index.html                    # Responsive HTML5 entry template
├── vite.config.ts                # Vite build configuration
├── tsconfig.json                 # TypeScript compiler configurations
└── package.json                  # Dependencies and scripts
```

---

## ⚡ Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm** / **yarn**

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/yashkoparde/engage.faculty.git
cd engage.faculty

# Install dependencies
npm install
```

### 3. Environment Setup
Create a `.env` or `.env.local` file based on `.env.example`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```
> **Note**: If Supabase credentials are not provided, the application runs with an intelligent in-memory mock engine for offline demonstrations and testing.

### 4. Running Locally
```bash
# Start the development server
npm run dev

# Open http://localhost:5173 in your browser
```

### 5. Production Build
```bash
# Create optimized production build
npm run build

# Preview production build
npm run preview
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
