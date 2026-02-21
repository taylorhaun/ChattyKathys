interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  characterName?: string;
  accentColor?: string;
}

export function ChatMessage({
  role,
  content,
  characterName,
  accentColor,
}: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
        style={{
          backgroundColor: isUser ? "#4F46E5" : accentColor ?? "#666",
        }}
      >
        {isUser ? "Y" : characterName?.[0] ?? "?"}
      </div>

      {/* Message bubble */}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-indigo-600 text-white"
            : "bg-gray-800 text-gray-200"
        }`}
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
