# ChattyKathys

AI-powered character chat app where you have conversations with fictional characters. Pick a character, start talking, and get responses that stay true to their personality.

**Characters:** Gandalf, Sherlock Holmes, Darth Vader

## Tech Stack

- **Runtime:** Node.js + TypeScript (full stack)
- **Framework:** React Router v7 (formerly Remix) — loaders, actions, nested routes
- **AI:** Anthropic Claude + OpenAI (dual provider, streaming via SSE)
- **Database:** PostgreSQL + Prisma ORM
- **Styling:** Tailwind CSS v4
- **Auth:** Custom session cookies + bcrypt
- **Deployment:** Docker + Fly.io

## How It Works

1. Sign up / log in
2. Pick a character from the landing page
3. Chat — messages stream in real-time via Server-Sent Events
4. Switch between characters using the sidebar — conversation history persists per character

AI responses stream token-by-token from the API to the browser. Each character has a detailed system prompt that defines their personality, knowledge, speech patterns, and behavioral rules.

## Local Development

```bash
# Clone and install
git clone https://github.com/taylorhaun/ChattyKathys.git
cd ChattyKathys
npm install

# Set up environment
cp .env.example .env
# Fill in your API keys in .env

# Start Postgres
docker compose up -d postgres

# Set up database
npx prisma generate
npx prisma migrate dev
npx prisma db seed

# Run
npm run dev
```

App runs at `http://localhost:5173`

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `SESSION_SECRET` | Random hex string for signing cookies |
| `ANTHROPIC_API_KEY` | Claude API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `AI_PROVIDER` | `"anthropic"` (default) or `"openai"` |

## Project Structure

```
app/
├── routes/
│   ├── home.tsx             # Landing page — character selection
│   ├── chat.tsx             # Chat layout (sidebar + outlet)
│   ├── chat.$slug.tsx       # Character chat view
│   ├── api.chat.tsx         # SSE streaming endpoint
│   ├── login.tsx            # Login
│   ├── signup.tsx           # Signup
│   └── logout.tsx           # Logout
├── components/
│   ├── CharacterCard.tsx    # Character selection card
│   ├── ChatMessage.tsx      # Message bubble
│   ├── ChatInput.tsx        # Message input
│   └── CharacterSidebar.tsx # Character switching sidebar
├── lib/
│   ├── ai.server.ts         # AI provider abstraction (Claude + OpenAI)
│   ├── auth.server.ts       # Sessions, cookies, bcrypt
│   └── db.server.ts         # Prisma client
└── styles/
    └── app.css              # Tailwind
```
