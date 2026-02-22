import { Link, useParams } from "react-router";

interface SidebarCharacter {
  name: string;
  slug: string;
  accentColor: string | null;
}

interface CharacterSidebarProps {
  characters: SidebarCharacter[];
}

export function CharacterSidebar({ characters }: CharacterSidebarProps) {
  const params = useParams();
  const activeSlug = params.slug;

  return (
    <aside className="flex h-full w-64 flex-col border-r border-gray-800 bg-gray-900">
      {/* App title */}
      <div className="border-b border-gray-800 px-4 py-4">
        <Link to="/" className="text-lg font-bold text-white hover:text-gray-300">
          ChattyKathys
        </Link>
      </div>

      {/* Character list */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Characters
        </p>
        {characters.map((character) => {
          const isActive = character.slug === activeSlug;
          return (
            <Link
              key={character.slug}
              to={`/chat/${character.slug}`}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
              }`}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: character.accentColor ?? "#666" }}
              >
                {character.name[0]}
              </div>
              <span className="truncate">{character.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800 px-4 py-3">
        <form method="post" action="/logout">
          <button
            type="submit"
            className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}
