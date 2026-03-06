# CLAUDE.md

This file provides guidance for AI assistants working in this repository.

---

## Project Overview

**팀 투두 (Team Todo)** — A real-time collaborative todo app for teams.
No login required. Share the URL, enter a nickname, and start collaborating.

**Stack:** Vite + React 18 + Tailwind CSS 3 + Firebase Firestore (v10)

---

## Project Structure

```
TEAM-TODO2/
├── src/
│   ├── main.jsx          # React entry point
│   ├── App.jsx           # Root component — nickname gate logic
│   ├── NicknameGate.jsx  # First-time nickname input screen
│   ├── TodoApp.jsx       # Main app: Firestore listener + todo UI
│   ├── firebase.js       # Firebase app + Firestore init
│   └── index.css         # Tailwind CSS imports
├── index.html            # Vite HTML entry
├── .env                  # Firebase config secrets (not committed)
├── .env.example          # Template for .env (committed)
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── CLAUDE.md             # This file
```

---

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+

### Install & Run

```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # production build → dist/
npm run preview    # preview production build
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your Firebase project values:

```bash
cp .env.example .env
```

All variables are prefixed with `VITE_` so Vite exposes them to the browser:

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firestore project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | App ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Analytics measurement ID |

---

## Architecture & Key Decisions

### Nickname persistence

- Stored in `localStorage` under the key `team-todo-nickname`
- No auth — anyone with the URL can participate
- `App.jsx` checks localStorage on mount; shows `NicknameGate` if empty

### Firestore data model

**Collection:** `todos`

Each document:
```js
{
  text: string,       // todo content
  done: boolean,      // completion status
  author: string,     // nickname of creator
  createdAt: Timestamp // server timestamp, used for ordering
}
```

### Real-time sync

`TodoApp.jsx` uses `onSnapshot` with `orderBy('createdAt', 'asc')` to keep
the list in sync across all connected clients instantly.

### Component tree

```
App
├── NicknameGate   (shown when no nickname in localStorage)
└── TodoApp        (main view)
    ├── Header (avatar + nickname + change button)
    ├── Progress bar
    ├── Input row
    ├── Filter tabs (all / active / done)
    └── Todo list (each item: checkbox, text, author avatar, delete)
```

---

## Firebase Setup (Firestore)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create or open project
3. Enable **Firestore Database** in Native mode
4. Set Firestore rules to allow public read/write (for no-auth use case):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /todos/{id} {
      allow read, write: if true;
    }
  }
}
```

> For production, tighten rules (rate-limit by IP, validate field types, etc.)

---

## Code Conventions

### File naming

- Components: `PascalCase.jsx`
- Utilities / modules: `camelCase.js`

### Styling

- Tailwind utility classes only — no separate CSS files except `index.css`
- Use `transition` and `active:scale-95` for interactive feedback
- Mobile-first; `max-w-xl mx-auto` centers content on desktop

### State

- Local UI state: `useState`
- Firestore state: `onSnapshot` → local `useState`
- No global state library needed at this scale

### Async operations

- All Firestore writes (`addDoc`, `updateDoc`, `deleteDoc`) are `await`ed
- No optimistic updates — Firestore's real-time listener handles refresh

---

## Git Workflow

### Branches

- **`main`** — stable, deployable code
- **`claude/...`** — AI assistant feature branches (per session)

### Commit message format

```
<type>: <summary>
```

Types: `feat`, `fix`, `refactor`, `docs`, `chore`

### AI assistant branches

Always develop on the branch specified at session start (e.g.
`claude/claude-md-mmeffl16t6vmwevy-O3KB5`). Never push directly to `main`.

---

## AI Assistant Instructions

### Do

- Read source files before editing them
- Keep changes minimal and scoped to the task
- Follow Tailwind-only styling (no inline styles, no new CSS files)
- Run `npm run build` to verify no build errors before committing
- Commit with clear messages; push to the designated `claude/...` branch

### Don't

- Don't add a state management library unless clearly needed
- Don't add TypeScript unless asked (project is plain JS/JSX)
- Don't change Firestore collection names without updating all references
- Don't commit `.env` (it's in `.gitignore`)
- Don't add authentication unless explicitly requested
