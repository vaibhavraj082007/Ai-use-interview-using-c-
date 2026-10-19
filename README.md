# Interviewly

AI-powered technical interview practice platform. Candidates upload a CV, get
role-tailored questions, complete a timed interview session with live webcam,
and receive a competency breakdown.

> **Status: Full-stack prototype.** The UI, interview flow, device checks, and
> behaviour monitoring are fully implemented, and a Node/Express backend
> provides real authentication (hashed passwords + JWT in an httpOnly cookie)
> backed by SQLite via Prisma, CV parsing, and AI/mock question generation.
> Answer grading is not yet built — see [Roadmap](#roadmap).

## Features

- **Candidate flow** — landing, register/login, CV upload, setup, device
  pre-check, timed interview, and results.
- **CV parsing** — drag-and-drop upload of PDF or DOCX files, with text
  extracted server-side and a live word-count preview before you continue.
- **Authentication & roles** — a real Express API with candidate/admin roles,
  bcrypt-hashed passwords, JWT sessions in an httpOnly cookie, validated
  register/login forms, and protected routes. A demo admin account
  (`admin@interviewly.ai` / `admin1234`) is seeded into the database.
- **Interview runner** — fullscreen session with per-question countdowns,
  progress tracking, starter code blocks, live webcam picture-in-picture, and
  text/voice answer input.
- **Behaviour monitoring (flag-only proctoring)** — on-device MediaPipe face
  tracking plus tab-switch detection that flags a lost face, multiple people,
  looking/turning away, or leaving the tab. Each flag freezes the screen with a
  warning and is logged to the session record, but never fails or scores the
  candidate.
- **Device pre-check** — real camera and microphone permission checks plus an
  internet latency test before the interview begins.
- **Question engine** — a role/skill/difficulty based generator with a provider
  pattern (Claude or mock) running on the server.
- **AI answer grading** — AI evaluates answers with per-question feedback, skill/type breakdowns,
  weighted overall score, and a downloadable report.
- **Admin dashboard** — candidate table, reports, and settings.
- **Design system** — a Tailwind v4 token-based theme with full light/dark
  mode and reusable shadcn-style primitives (Button, Input, Card, Badge,
  Dialog, Toast).

## Tech Stack

**Frontend**

- [React 19](https://react.dev)
- [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vite.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [React Router](https://reactrouter.com)
- [Radix UI](https://www.radix-ui.com) + [Lucide](https://lucide.dev) icons
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) for coding answers
- [MediaPipe Tasks for Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker) for on-device face tracking
- [Oxlint](https://oxc.rs) for linting

**Backend** (`server/`)

- [Express 5](https://expressjs.com)
- [Prisma ORM 6](https://www.prisma.io) + SQLite
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) for password hashing
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) + httpOnly cookies
- [pdf-parse](https://github.com/nicolo-ribaudo/pdf-parse) + [mammoth](https://github.com/mwilliamson/mammoth.js) for CV text extraction

## Getting Started

Requires Node.js 20+.

### 1. Frontend

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

### 2. Backend

The frontend proxies `/api` to the backend on `http://localhost:4000`.

```bash
npm run server:install      # install server dependencies
cp server/.env.example server/.env   # then set a strong JWT_SECRET
npm run db:generate         # generate the Prisma client
npm run db:migrate          # create the SQLite database + apply migrations
npm run server:seed         # seed the demo admin account
npm run server              # start the API on http://localhost:4000
```

Run the frontend (`npm run dev`) and backend (`npm run server`) in two separate
terminals. With both running, register/login/logout work end-to-end.

The demo admin credentials are `admin@interviewly.ai` / `admin1234`.

### AI question generation

Interview questions are generated server-side so the Anthropic API key is never
exposed to the browser. The backend picks a provider per request:

| `AI_PROVIDER` | Behaviour |
| --- | --- |
| `auto` (default) | Use Claude if `ANTHROPIC_API_KEY` is set, otherwise the mock provider |
| `claude` | Always Claude (falls back to mock if the key is missing) |
| `mock` | Always the mock provider — no API key required |

To enable real AI generation, set these in `server/.env`:

```bash
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_MODEL="claude-sonnet-4-5"   # optional, this is the default
```

Without a key the app runs fully in **mock mode**: questions are still tailored
to the CV (skills are detected from the resume text) and always mix coding and
oral questions. The active mode is reported in each response (`mode`:
`ai` | `mock`) and shown as a badge during the interview.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the frontend dev server with HMR |
| `npm run build` | Type-check and build the frontend for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run Oxlint |
| `npm run server` | Start the backend API (watch mode) |
| `npm run server:install` | Install backend dependencies |
| `npm run db:migrate` | Create/apply Prisma migrations (SQLite) |
| `npm run db:generate` | Generate the Prisma client |
| `npm run server:seed` | Seed the demo admin account |

### API

All routes are prefixed with `/api`. Auth uses a JWT stored in an httpOnly
cookie (`interviewly_token`).

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create an account (candidate role) |
| `POST` | `/api/auth/login` | Sign in, sets the auth cookie |
| `POST` | `/api/auth/logout` | Clear the auth cookie |
| `GET` | `/api/auth/me` | Current user (requires auth) |
| `POST` | `/api/cv/parse` | Extract text from an uploaded PDF/DOCX (requires auth) |
| `POST` | `/api/interview/generate` | Generate interview questions from a CV + role (requires auth) |
| `GET` | `/api/health` | Health check |

## Project Structure

```
src/
├── App.tsx                 # Route definitions
├── main.tsx                # App entry point
├── index.css               # Tailwind theme tokens & utilities
├── assets/                 # Static images
├── components/
│   ├── layouts/            # Candidate and admin shell layouts
│   └── ui/                 # Reusable UI primitives
├── features/
│   ├── auth/               # Auth context, guards, errors
│   └── interview/
│       └── questionEngine.ts   # Client types + server-backed generation
├── lib/
│   ├── api.ts              # Fetch wrapper for the backend API
│   └── utils.ts            # Shared helpers (cn)
└── pages/
    ├── candidate/          # Landing, auth, CV, setup, interview, result
    └── admin/              # Dashboard, candidates, reports, settings

server/
├── prisma/
│   ├── schema.prisma       # User model
│   ├── seed.ts             # Demo admin seed
│   └── migrations/         # SQLite migrations
└── src/
    ├── index.ts            # Entrypoint (starts the server)
    ├── app.ts              # Express app + middleware + error handling
    ├── env.ts              # Validated environment variables
    ├── db.ts               # Prisma client singleton
    ├── auth/               # password hashing, JWT, requireAuth middleware
    ├── interview/          # question providers (Claude + mock) & question bank
    ├── routes/             # auth, CV upload, interview routes
    └── lib/                # HttpError helpers, CV text extraction
```

## Roadmap

Planned work to turn the prototype into a full product:

- [x] LLM question generation (Claude provider + mock fallback, via backend)
- [x] CV parsing and real skill detection
- [x] AI answer grading and feedback
- [x] Backend API, database, and real (server-side) authentication
- [x] Voice input via the Web Speech API
- [x] Proctoring flags (face presence, gaze/turn, tab-switch — warnings only)
- [ ] Interview resumption (continue a saved/incomplete session)

## License

Not specified.
