import { Link } from "react-router";

interface CharacterCardProps {
  name: string;
  slug: string;
  bio: string;
  accentColor: string;
}

export function CharacterCard({ name, slug, bio, accentColor }: CharacterCardProps) {
  return (
    <Link
      to={`/chat/${slug}`}
      className="group block rounded-xl border border-gray-800 bg-gray-900 p-6 transition-all hover:border-gray-600 hover:shadow-lg"
      style={{ "--accent": accentColor } as React.CSSProperties}
    >
      {/* Character initial as avatar placeholder */}
      <div
        className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold text-white"
        style={{ backgroundColor: accentColor }}
      >
        {name[0]}
      </div>

      <h2 className="text-center text-xl font-semibold text-white group-hover:text-gray-100">
        {name}
      </h2>

      <p className="mt-2 text-center text-sm leading-relaxed text-gray-400">
        {bio}
      </p>

      <div className="mt-4 text-center">
        <span
          className="inline-block rounded-full px-4 py-1.5 text-sm font-medium text-white transition-opacity group-hover:opacity-90"
          style={{ backgroundColor: accentColor }}
        >
          Start Chatting
        </span>
      </div>
    </Link>
  );
}
