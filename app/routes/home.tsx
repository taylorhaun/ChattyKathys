import { Form, Link, useLoaderData } from "react-router";
import { prisma } from "../lib/db.server.js";
import { getUserId } from "../lib/auth.server.js";
import { CharacterCard } from "../components/CharacterCard.js";
import type { Route } from "./+types/home";

// ─── Meta ────────────────────────────────────────────────

export function meta() {
  return [
    { title: "ChattyKathys — Talk to Your Favorite Characters" },
    { name: "description", content: "Chat with Gandalf, Sherlock Holmes, and Darth Vader." },
  ];
}

// ─── Loader ──────────────────────────────────────────────
// Fetch characters from DB + check if user is logged in.

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getUserId(request);
  const characters = await prisma.character.findMany({
    select: {
      name: true,
      slug: true,
      bio: true,
      accentColor: true,
    },
    orderBy: { name: "asc" },
  });

  return { characters, isLoggedIn: !!userId };
}

// ─── Component ───────────────────────────────────────────

export default function HomePage() {
  const { characters, isLoggedIn } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <h1 className="text-xl font-bold text-white">ChattyKathys</h1>
        <div>
          {isLoggedIn ? (
            <Form method="post" action="/logout">
              <button
                type="submit"
                className="rounded-md px-4 py-2 text-sm text-gray-400 hover:text-white"
              >
                Log out
              </button>
            </Form>
          ) : (
            <div className="flex gap-3">
              <Link
                to="/login"
                className="rounded-md px-4 py-2 text-sm text-gray-400 hover:text-white"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-4xl px-6 py-16 text-center">
        <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Chat with legendary characters
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400">
          Pick a character and start a conversation. Each one has a unique
          personality powered by AI.
        </p>

        {/* Character Grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {characters.map((character) => (
            <CharacterCard
              key={character.slug}
              name={character.name}
              slug={character.slug}
              bio={character.bio}
              accentColor={character.accentColor ?? "#666"}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
