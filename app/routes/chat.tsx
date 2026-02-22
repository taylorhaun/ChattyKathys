import { Outlet, useLoaderData } from "react-router";
import { prisma } from "../lib/db.server.js";
import { requireUser } from "../lib/auth.server.js";
import { CharacterSidebar } from "../components/CharacterSidebar.js";
import type { Route } from "./+types/chat";

// ─── Loader ──────────────────────────────────────────────
// Fetch all characters for the sidebar. Auth is required.

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);

  const characters = await prisma.character.findMany({
    select: {
      name: true,
      slug: true,
      accentColor: true,
    },
    orderBy: { name: "asc" },
  });

  return { characters };
}

// ─── Component ───────────────────────────────────────────

export default function ChatLayout() {
  const { characters } = useLoaderData<typeof loader>();

  return (
    <div className="flex h-screen bg-gray-950">
      <CharacterSidebar characters={characters} />
      <main className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
