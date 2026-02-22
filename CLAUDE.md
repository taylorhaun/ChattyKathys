# ChattyKathys — Claude Code Instructions

## Project Overview

ChattyKathys is a character chat app where users pick from three fictional characters (Gandalf, Sherlock Holmes, Darth Vader) and have AI-powered conversations. It's a portfolio/learning project built to mirror Playlab.ai's tech stack.

**Playlab.ai job posting:** https://jobs.ashbyhq.com/Playlab/e4042b57-4a2a-4b9f-9650-f4cfa7616824

## Tech Stack

- **Framework:** React Router v7 (formerly Remix) — uses loaders, actions, nested routes
- **Language:** TypeScript (strict mode) — full stack
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** Custom session cookies + bcrypt (no third-party auth library)
- **AI:** Anthropic Claude SDK + OpenAI SDK (dual provider, selected via `AI_PROVIDER` env var)
- **Styling:** Tailwind CSS v4
- **Streaming:** Server-Sent Events (SSE) for AI response streaming
- **Containerization:** Docker + Docker Compose (local dev), Dockerfile (production)
- **Hosting:** Fly.io (app + managed Postgres)

## Key Architecture Decisions

### React Router v7, NOT Remix v2
Remix merged into React Router v7. All imports come from `react-router`, not `@remix-run/*`. Use `npx create-react-router@latest` for initialization. The Blues Stack template (`remix-run/blues-stack`) may be used as a starting point.

### `.server.ts` Convention
Files named `*.server.ts` are automatically excluded from the client bundle. All sensitive code lives here:
- `app/lib/db.server.ts` — Prisma client singleton
- `app/lib/auth.server.ts` — session cookies, password hashing, `requireUser()` helper
- `app/lib/ai.server.ts` — AI provider abstraction (Anthropic + OpenAI)

### Prisma Client Singleton
In development, hot module reload creates multiple Prisma instances. Use the global variable pattern:
```typescript
import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

declare global {
  var __db__: PrismaClient | undefined;
}

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!global.__db__) {
    global.__db__ = new PrismaClient();
  }
  prisma = global.__db__;
}

export { prisma };
```

### Streaming Pattern
The SSE streaming endpoint is at `app/routes/api.chat.tsx`. It:
1. Receives a POST with `conversationId`, `userMessage`, `characterSlug`
2. Saves the user message to DB
3. Calls the AI provider with `stream: true`
4. Pipes streamed chunks as SSE `data:` events
5. Saves the full assistant response to DB when complete
6. Sends `data: [DONE]` as the termination signal

SSE only works with GET natively (via EventSource), so we use `fetch()` with `ReadableStream` for POST requests.

### Auth Flow
- Passwords hashed with bcrypt (10 salt rounds)
- Session stored in an HTTP-only, secure, signed cookie
- `requireUser(request)` helper called in every protected route loader — redirects to `/login` if no valid session
- Cookie config: `httpOnly: true, secure: true, sameSite: "lax", maxAge: 7 days`

## Project Structure

```
app/
├── routes/
│   ├── _index.tsx           # Landing page — character selection
│   ├── login.tsx            # Login form + action
│   ├── signup.tsx           # Signup form + action
│   ├── logout.tsx           # Logout action (POST only)
│   ├── chat.tsx             # Chat layout (sidebar + Outlet)
│   ├── chat.$slug.tsx       # Character chat (loader + action)
│   └── api.chat.tsx         # SSE streaming endpoint (resource route)
├── components/
│   ├── CharacterCard.tsx    # Landing page character card
│   ├── ChatMessage.tsx      # Single message bubble
│   ├── ChatInput.tsx        # Message input + send button
│   ├── CharacterSidebar.tsx # Character switching sidebar
│   └── StreamingText.tsx    # Client-side SSE consumer
├── lib/
│   ├── ai.server.ts         # AI provider abstraction
│   ├── auth.server.ts       # Session, cookies, bcrypt
│   └── db.server.ts         # Prisma client singleton
└── styles/
    └── app.css              # Tailwind v4 import
```

## Database

Four tables: `users`, `characters`, `conversations`, `messages`.

- Characters are seeded (not user-created). Seed data lives in `prisma/seed.ts`, sourced from `chattyKathysCharacters.ts`.
- Each user gets one conversation per character (`UNIQUE(user_id, character_id)`).
- Messages have a `role` field (`'user'` or `'assistant'`) and a `provider` field (`'anthropic'` or `'openai'`).
- All IDs are UUIDs.

### Running Migrations
```bash
npx prisma migrate dev          # development (creates + applies)
npx prisma migrate deploy       # production (applies only)
npx prisma db seed              # seed character data
npx prisma studio               # GUI for browsing data
```

## Local Development

```bash
# Start Postgres in Docker
docker compose up -d postgres

# Install dependencies
npm install

# Set up database
npx prisma migrate dev
npx prisma db seed

# Start dev server
npm run dev
```

Or all-in-one with Docker Compose:
```bash
docker compose up
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:
- `DATABASE_URL` — Postgres connection string
- `SESSION_SECRET` — random hex string for signing cookies (`openssl rand -hex 32`)
- `ANTHROPIC_API_KEY` — Claude API key
- `OPENAI_API_KEY` — OpenAI API key
- `AI_PROVIDER` — `"anthropic"` (default) or `"openai"`

## Deployment (Fly.io)

```bash
fly launch                                        # initial setup
fly secrets set SESSION_SECRET=... ANTHROPIC_API_KEY=... OPENAI_API_KEY=...
fly deploy                                        # deploy
fly ssh console -C "npx prisma migrate deploy"    # run migrations
fly ssh console -C "npx prisma db seed"           # seed data
```

## Teaching Approach

This is Taylor's learning project. Do NOT just write everything silently. Instead:
- Explain what we're doing and why at each step
- Check Taylor's understanding regularly
- When introducing new concepts, connect them to Rust/Solidity where possible
- Let Taylor make decisions — present options and ask
- After writing code, walk through it and ask if it makes sense

## Git Conventions

- **NEVER add `Co-Authored-By` lines or any AI/Claude attribution to commits.** Taylor is the sole author.
- Do not add Claude as a contributor, author, or co-author anywhere in the project.

## Code Conventions

- Use React Router's `<Form>` component for mutations (not raw `<form>`)
- Use `useLoaderData()` for reading data in components
- Use `useNavigation()` for pending/loading states
- Use `useActionData()` for reading action results (errors, etc.)
- Keep all DB queries, AI calls, and auth logic in `.server.ts` files
- Use Tailwind utility classes for styling — no CSS modules or styled-components
- Accent colors per character: Gandalf `#8A9BA8`, Sherlock `#2C3E50`, Vader `#B71C1C`

## Character System Prompts

Full character data (names, slugs, bios, system prompts, accent colors) is in `chattyKathysCharacters.ts` at the project root. This data gets imported into `prisma/seed.ts` for database seeding.

## Session Notes

Daily session notes are stored in `session-notes/` with one Markdown file per day (e.g., `session-notes/2026-02-21.md`). These files contain:
- Things learned during the session
- Decisions made and rationale
- Summaries of work done
- Anything Taylor explicitly asks to be saved

Notes should be verbose — more information is better. Update the current day's file throughout the session as new things are learned or decided.

## Testing

Not yet set up. When added, will likely use:
- Vitest for unit/integration tests
- Playwright or Cypress for E2E tests
- MSW for mocking AI API responses in tests

## Reference Links

- [React Router v7 docs](https://reactrouter.com/)
- [Remix → React Router migration guide](https://reactrouter.com/upgrading/remix)
- [Blues Stack template](https://github.com/remix-run/blues-stack)
- [Prisma docs](https://www.prisma.io/docs)
- [Fly.io Remix deployment](https://fly.io/docs/js/frameworks/remix/)
- [Anthropic SDK docs](https://docs.anthropic.com/en/docs/sdks)
- [Tailwind CSS v4 docs](https://tailwindcss.com/docs)
- [SSE in Remix tutorial](https://sergiodxa.com/tutorials/use-server-sent-events-with-remix)
