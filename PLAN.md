# ChattyKathys — Project Plan

## Overview
A character chat app where you pick from three iconic fictional characters and have AI-powered conversations with them. Built on Playlab's exact tech stack as a learning project and portfolio piece.

**Working title.** Final name TBD.

---

## Tech Stack (mirrors Playlab)

| Tool | Role | Why this specifically |
|---|---|---|
| **TypeScript** | Full-stack language | Playlab is TypeScript everywhere |
| **React Router v7** (formerly Remix) | Framework | Remix merged into React Router v7 — this IS Remix now. Uses loaders, actions, nested routes. |
| **React 19** | UI library | Ships with React Router v7 |
| **PostgreSQL** | Database | Playlab uses Postgres. No Supabase wrapper — raw Postgres via Prisma. |
| **Prisma** | ORM | Type-safe database queries in TypeScript. `.server.ts` pattern keeps DB code off the client. |
| **Docker** | Containerization | Local dev: `docker compose up` runs app + Postgres. Production: Dockerfile for Fly.io. |
| **Fly.io** | Hosting | Hosts both the app and a managed Postgres instance. Remix's recommended deploy target. |
| **Anthropic Claude + OpenAI** | AI providers | Dual-provider support. Claude is default. |
| **Tailwind CSS v4** | Styling | CSS-first config (new in v4), Lightning CSS for fast builds. |
| **SSE (Server-Sent Events)** | Streaming | Streams AI responses word-by-word. Lighter than WebSockets for unidirectional data. |

### Important: Remix → React Router v7

Remix v2 has been merged into React Router v7. They are now the same framework. Key implications:
- Use `npx create-react-router@latest` (NOT `create-remix`) to initialize
- Import from `react-router` instead of `@remix-run/*`
- All Remix concepts (loaders, actions, nested routes) still work identically
- The official Fly.io + Postgres template is the **Blues Stack**: `https://github.com/remix-run/blues-stack`

We should evaluate whether to start from the Blues Stack template (which includes auth, Prisma, Fly.io config, Docker, and testing out of the box) or from scratch. **Recommendation: start from Blues Stack and customize**, since it already has the exact infrastructure we need.

---

## Characters

Three classic fictional characters with distinct personalities. Full system prompts, bios, and accent colors are pre-written in `chattyKathysCharacters.ts`.

| Character | Accent Color | Vibe |
|---|---|---|
| **Gandalf** | `#8A9BA8` (weathered silver-grey) | Wise, cryptic, poetic. Answers questions with deeper questions. Warm but thunderous when needed. |
| **Sherlock Holmes** | `#2C3E50` (foggy London blue-grey) | Analytical, dry wit. Deduces things about you from your message patterns. Slightly condescending but principled. |
| **Darth Vader** | `#B71C1C` (deep Sith red) | Commanding, philosophical, darkly funny. Haunted by his past. Vulnerability slips through the armor. |

Each character has:
- **AI-generated portrait** (to be generated — see Phase 3)
- **System prompt** (~300-400 words defining personality, speech patterns, knowledge, behavioral rules)
- **Short bio** (2-3 sentences for the landing page card)
- **Accent color** (themed chat UI)

---

## Core Features

1. **Landing page** — Three character cards with portraits, names, short bios. Click to start chatting.
2. **Auth** — Email/password signup & login. Built with React Router form actions + session cookies + bcrypt. No third-party auth library.
3. **Chat interface** — Streaming responses (word-by-word via SSE). Character avatar next to messages. Themed styling per character.
4. **Character switching** — Click a different character in a sidebar to swap who you're talking to. Each character maintains its own conversation thread.
5. **Chat persistence** — Conversations saved to PostgreSQL. Come back later and pick up where you left off.
6. **Dual AI provider** — Anthropic Claude (default) + OpenAI. Configurable via env var.

---

## Database Schema

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Characters (seeded, not user-created)
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  bio TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  image_url TEXT,
  accent_color TEXT
);

-- Conversations (one per user per character)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, character_id)
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  provider TEXT, -- 'anthropic' or 'openai'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Schema notes:**
- `UNIQUE(user_id, character_id)` on conversations = each user gets exactly ONE conversation per character. Switching to Gandalf always picks up where you left off.
- `provider` on messages tracks which AI generated that response. Useful for debugging and for later adding a provider toggle.
- `ON DELETE CASCADE` everywhere = deleting a user wipes their conversations and messages. Clean.
- UUIDs instead of serial IDs = no information leakage about user count / message count in URLs.

---

## Project Structure

```
ChattyKathys/
├── CLAUDE.md                    # instructions for Claude Code
├── PLAN.md                      # this file
├── chattyKathysCharacters.ts    # character data (will be moved to prisma/seed.ts)
├── .env.example                 # environment variable template
├── Dockerfile                   # multi-stage production build
├── docker-compose.yml           # local dev: app + postgres
├── fly.toml                     # Fly.io deployment config
├── package.json
├── tsconfig.json
├── prisma/
│   ├── schema.prisma            # DB schema (Prisma format)
│   ├── migrations/              # auto-generated migration files
│   └── seed.ts                  # seeds the 3 characters into DB
├── app/
│   ├── entry.client.tsx         # browser hydration entry point
│   ├── entry.server.tsx         # server rendering entry point
│   ├── root.tsx                 # root layout, Tailwind import, global providers
│   ├── routes/
│   │   ├── _index.tsx           # GET /         → landing page (character selection)
│   │   ├── login.tsx            # GET/POST /login    → login form + action
│   │   ├── signup.tsx           # GET/POST /signup   → signup form + action
│   │   ├── logout.tsx           # POST /logout       → destroy session
│   │   ├── chat.tsx             # GET /chat          → layout (sidebar + <Outlet/>)
│   │   ├── chat.$slug.tsx       # GET /chat/gandalf  → character chat (loader + action)
│   │   └── api.chat.tsx         # POST /api/chat     → SSE streaming endpoint
│   ├── components/
│   │   ├── CharacterCard.tsx    # landing page card (portrait, name, bio)
│   │   ├── ChatMessage.tsx      # single message bubble (user or assistant)
│   │   ├── ChatInput.tsx        # text input + send button
│   │   ├── CharacterSidebar.tsx # character list for switching
│   │   └── StreamingText.tsx    # client component that reads SSE stream
│   ├── lib/
│   │   ├── ai.server.ts         # Anthropic + OpenAI provider abstraction
│   │   ├── auth.server.ts       # session cookie, bcrypt, requireUser helper
│   │   └── db.server.ts         # Prisma client singleton
│   └── styles/
│       └── app.css              # Tailwind v4 import
└── public/
    └── characters/              # AI-generated character portraits
        ├── gandalf.png
        ├── sherlock.png
        └── vader.png
```

**Key pattern — `.server.ts` files:**
Any file with `.server` in the name is automatically excluded from the client bundle by React Router. This is where all sensitive code lives: database queries, API keys, password hashing, AI calls. The client never sees this code.

---

## Implementation Phases — Detailed

### Phase 1: Project Scaffolding & Infrastructure

**Goal:** `docker compose up` starts the app + Postgres, Prisma connects, seed data loads, and you see a "Hello World" page.

**Steps:**
1. Evaluate Blues Stack template (`npx create-react-router@latest --template remix-run/blues-stack`) — it comes with Docker, Prisma, Fly.io config, auth, and testing pre-configured. If it's a good fit, use it as the starting point and strip out what we don't need.
2. If starting fresh: `npx create-react-router@latest ChattyKathys` with TypeScript
3. Install core dependencies:
   - `prisma` + `@prisma/client` (ORM)
   - `bcryptjs` + `@types/bcryptjs` (password hashing)
   - `@anthropic-ai/sdk` (Claude API)
   - `openai` (OpenAI API)
   - Tailwind CSS v4 (follow React Router install guide)
4. Write `docker-compose.yml`:
   - `postgres:16` container with volume mount for persistence
   - App container with bind mount for hot reload (or run app locally and just containerize Postgres)
5. Write `prisma/schema.prisma` matching the SQL schema above
6. Write `prisma/seed.ts` using the character data from `chattyKathysCharacters.ts`
7. Run `npx prisma migrate dev` to create initial migration
8. Run `npx prisma db seed` to populate characters
9. Verify: app starts, connects to Postgres, seed data is queryable

**Concepts you'll learn:**
- React Router v7 project structure
- Prisma schema definition and migrations
- Docker Compose for local development
- Environment variable management (.env)

**Potential gotchas:**
- Prisma client singleton pattern — in dev, hot reload creates multiple Prisma instances. The `db.server.ts` file uses a global variable to prevent this.
- Docker networking — the app container needs to reach Postgres via the Docker service name, not `localhost`.
- If using Blues Stack, it uses `remix` imports — you may need to update to `react-router` imports.

---

### Phase 2: Authentication

**Goal:** Users can sign up, log in, log out. Chat routes are protected — unauthenticated users get redirected to `/login`.

**Steps:**
1. Create `app/lib/auth.server.ts`:
   - `createUserSession(userId)` — creates a session cookie
   - `getUserSession(request)` — reads the session cookie from the request
   - `requireUser(request)` — reads session, fetches user from DB, redirects to `/login` if not found
   - `hashPassword(password)` / `verifyPassword(password, hash)` — bcrypt wrappers
2. Create `app/routes/signup.tsx`:
   - **Loader:** if already logged in, redirect to `/`
   - **Action:** validate form → check email not taken → hash password → create user → create session → redirect to `/`
   - **Component:** form with email + password + confirm password fields
3. Create `app/routes/login.tsx`:
   - **Loader:** if already logged in, redirect to `/`
   - **Action:** validate form → find user by email → verify password → create session → redirect to `/`
   - **Component:** form with email + password fields, link to signup
4. Create `app/routes/logout.tsx`:
   - **Action only** (no component) — destroy session → redirect to `/login`
5. Protect chat routes by calling `requireUser(request)` in every chat loader

**Concepts you'll learn:**
- React Router loaders (GET) and actions (POST) — this is the core Remix pattern
- Session cookies: how HTTP sessions actually work under the hood
- Password hashing with bcrypt (salt rounds, timing-safe comparison)
- Progressive enhancement: the forms work even without JavaScript enabled

**Auth cookie config:**
```typescript
{
  httpOnly: true,       // JS can't read it (XSS protection)
  secure: true,         // HTTPS only
  sameSite: "lax",      // CSRF protection
  maxAge: 60 * 60 * 24 * 7, // 7 days
  secrets: [SESSION_SECRET],  // signs the cookie
  path: "/",
}
```

---

### Phase 3: Landing Page

**Goal:** A visually polished landing page with three character cards. Click a card → go to `/chat/gandalf` (etc).

**Steps:**
1. Generate AI portraits for each character (use an image generation tool — DALL-E, Midjourney, or similar). Save to `public/characters/`.
2. Build `CharacterCard.tsx` component:
   - Portrait image (with `loading="lazy"`)
   - Character name
   - Bio text
   - Accent color border/glow on hover
   - Entire card is a link to `/chat/{slug}`
3. Build `_index.tsx` route:
   - **Loader:** fetch all characters from DB (or import from a constants file)
   - **Component:** responsive grid (1 col mobile, 3 col desktop), centered, with the cards
4. Add a header with app title and login/signup or logout button (depending on auth state)
5. If user is not logged in, cards link to `/login` with a redirect param back to the character

**Design direction:**
- Dark background (charcoal/near-black) so the character cards pop
- Cards have subtle hover animation (scale up slightly, accent color glow)
- Character portraits are circular or rounded-square
- Clean typography — system font stack or a nice Google Font
- Mobile: cards stack vertically with full-width
- Desktop: three cards in a row, centered, with breathing room

---

### Phase 4: Chat — Core (Non-Streaming)

**Goal:** Send a message to a character, get an AI response back, see it on screen, and it persists on refresh. Non-streaming first — just get the full flow working.

**Steps:**
1. Build `app/routes/chat.tsx` (layout route):
   - **Loader:** `requireUser(request)`, fetch all characters from DB, fetch user's conversations (to show which characters have active chats)
   - **Component:** sidebar with character list + `<Outlet />` for the active chat
2. Build `app/routes/chat.$slug.tsx` (character chat route):
   - **Loader:**
     - `requireUser(request)`
     - Look up character by slug
     - Find or create conversation for this user + character
     - Fetch all messages for this conversation, ordered by `created_at`
     - Return `{ character, messages }`
   - **Action:**
     - Read the user's message from the form submission
     - Save the user message to DB
     - Build the message history array (system prompt + all previous messages + new user message)
     - Call the AI provider (Anthropic or OpenAI)
     - Save the assistant response to DB
     - Return the updated messages
   - **Component:** message list + input form
3. Build `ChatMessage.tsx`:
   - Different styling for user vs assistant messages
   - Character avatar next to assistant messages
   - Accent color for assistant message bubble
4. Build `ChatInput.tsx`:
   - `<Form method="post">` (React Router form — works without JS!)
   - Textarea with Enter-to-submit
   - Disable while submitting (using `useNavigation()` hook)
5. Build `app/lib/ai.server.ts`:
   - `generateResponse(messages, provider)` function
   - Anthropic: `new Anthropic().messages.create()`
   - OpenAI: `new OpenAI().chat.completions.create()`
   - Provider selected via `AI_PROVIDER` env var

**Concepts you'll learn:**
- React Router nested routes (layout route wrapping child routes)
- The `<Outlet />` pattern (like `{children}` but route-aware)
- Loaders for data fetching, actions for mutations — the bread and butter of Remix/React Router
- `useLoaderData()` and `useActionData()` hooks
- `useNavigation()` for pending UI states
- Prisma: create, findUnique, findMany, upsert queries
- AI SDK usage: building message arrays, system prompts, API calls

**Potential gotchas:**
- Message ordering: always `ORDER BY created_at ASC` so messages display chronologically
- The action should save both the user message AND the AI response before returning — otherwise you'd lose the AI response if the page reloads between saves
- Prisma `upsert` for conversations: find existing or create new in one query

---

### Phase 5: Streaming

**Goal:** AI responses stream in word-by-word via SSE. This is the "wow" factor.

**Steps:**
1. Build `app/routes/api.chat.tsx` (resource route — no UI, just an API):
   - This is a POST endpoint that returns a `ReadableStream` with SSE formatting
   - Receives: `conversationId`, `userMessage`, `characterSlug`
   - Saves the user message to DB
   - Builds message history from DB
   - Calls AI provider with `stream: true`
   - Pipes the streamed chunks as SSE `data:` events
   - When stream completes, saves the full assistant response to DB
   - Sends a final `data: [DONE]` event
2. Build `StreamingText.tsx` (client component):
   - Uses `EventSource` or `fetch()` with `ReadableStream` to consume the SSE endpoint
   - Accumulates text chunks and renders them as they arrive
   - Shows a blinking cursor while streaming
   - When `[DONE]` received, finalize the message
3. Update `chat.$slug.tsx`:
   - Instead of using a form action for sending messages, use the client-side `fetch()` to hit `/api/chat`
   - Optimistically add the user message to the UI immediately
   - Show the streaming response in a new assistant message bubble
   - After streaming completes, revalidate the loader to get the persisted data

**SSE format:**
```
data: {"text": "Hello"}

data: {"text": ", I"}

data: {"text": " am"}

data: {"text": " Gandalf"}

data: [DONE]
```

**Important SSE detail:** SSE only works with GET requests natively (via `EventSource`). Since we need to POST data (the user's message), we'll use `fetch()` with `ReadableStream` instead — same streaming behavior, works with POST.

**Concepts you'll learn:**
- Server-Sent Events / `ReadableStream` / `TextEncoder`
- Streaming API responses from Anthropic and OpenAI SDKs
- Client-side `fetch()` with streaming response body
- Optimistic UI updates
- Resource routes (API-only routes with no UI component)

---

### Phase 6: Polish

**Goal:** Make it portfolio-ready. This is what separates a tutorial project from something you'd actually show.

**Steps:**
1. **Character theming:**
   - Each character's accent color applied to: message bubbles, sidebar highlight, header accent
   - Transition animation when switching characters
2. **Chat UX:**
   - Auto-scroll to the latest message (with `useRef` + `scrollIntoView`)
   - Scroll lock: if user has scrolled up to read history, don't auto-scroll on new messages
   - Empty state for new conversations ("Click below to start talking to Gandalf...")
   - Message timestamps (relative: "2 min ago", "yesterday")
3. **Input UX:**
   - Enter to send, Shift+Enter for newline
   - Auto-resize textarea as user types
   - Disable send while streaming
   - Character count or token estimate (optional)
4. **Loading states:**
   - Skeleton loaders for initial page load
   - Typing indicator while AI is generating (three dots animation)
   - Graceful error handling: if AI call fails, show error message with retry button
5. **Mobile responsive:**
   - Sidebar becomes a hamburger/drawer on mobile
   - Chat takes full screen on mobile
   - Touch-friendly tap targets
6. **Accessibility:**
   - Proper ARIA labels on chat messages
   - Keyboard navigation (Tab through messages, Enter to send)
   - Focus management when new messages arrive
7. **"Clear conversation" button** — wipe a character's chat history and start fresh
8. **Landing page refinements** — add a tagline, maybe a brief "how it works" section

---

### Phase 7: Deploy to Fly.io

**Goal:** App is live on the internet at a public URL.

**Steps:**
1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. `fly auth signup` or `fly auth login`
3. `fly launch` from the project root — this auto-detects the Dockerfile and creates:
   - A Fly app
   - A `fly.toml` config
   - A managed Postgres cluster
4. Set secrets (environment variables):
   ```bash
   fly secrets set SESSION_SECRET=$(openssl rand -hex 32)
   fly secrets set ANTHROPIC_API_KEY=sk-ant-...
   fly secrets set OPENAI_API_KEY=sk-...
   fly secrets set AI_PROVIDER=anthropic
   ```
5. Deploy: `fly deploy`
6. Run Prisma migrations on production: `fly ssh console -C "npx prisma migrate deploy"`
7. Seed the production database: `fly ssh console -C "npx prisma db seed"`
8. Verify: visit the public URL, sign up, chat with a character
9. Set up health checks in `fly.toml`:
   ```toml
   [[services.http_checks]]
     interval = 10000
     timeout = 2000
     path = "/healthcheck"
   ```
10. (Optional) Custom domain: `fly certs add yourcustomdomain.com`

**Multi-stage Dockerfile (production):**
```dockerfile
# Stage 1: Dependencies
FROM node:20-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Build
FROM node:20-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 3: Production
FROM node:20-slim AS production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/public ./public
COPY package*.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chattykathys

# Auth
SESSION_SECRET=your-secret-here-generate-with-openssl-rand-hex-32

# AI Providers
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
AI_PROVIDER=anthropic  # or "openai"

# App
NODE_ENV=development
PORT=3000
```

---

## Key Learning Outcomes

By building this, you will have hands-on experience with:

| Skill | How you'll use it | Playlab relevance |
|---|---|---|
| **React Router v7 (Remix)** | Loaders, actions, nested routes, form handling | Core framework at Playlab |
| **TypeScript full-stack** | Shared types between server and client, Prisma types | Used everywhere at Playlab |
| **Auth from scratch** | bcrypt + session cookies, no third-party library | Understand auth deeply |
| **PostgreSQL + Prisma** | Schema design, migrations, queries, seeding | Playlab uses Postgres |
| **Docker** | Containerized dev + production Dockerfile | Listed in Playlab job posting |
| **SSE streaming** | Real-time AI response streaming | Core UX at Playlab |
| **AI SDK integration** | Anthropic + OpenAI, provider abstraction | Playlab integrates multiple LLMs |
| **Fly.io deployment** | Docker-based deploy with managed Postgres | Production deployment patterns |

Every single one maps directly to Playlab's stack and job requirements.

---

## Files Ready to Use

| File | Status | Description |
|---|---|---|
| `PLAN.md` | Done | This file |
| `chattyKathysCharacters.ts` | Done | Character data with full system prompts, bios, accent colors |
| `CLAUDE.md` | Done | Instructions for Claude Code when building this project |
| `.env.example` | Done | Environment variable template |
