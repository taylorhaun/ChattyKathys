import { useLoaderData } from "react-router";
import { useRef, useState, useEffect, useCallback } from "react";
import { prisma } from "../lib/db.server.js";
import { requireUser } from "../lib/auth.server.js";
import { ChatMessage } from "../components/ChatMessage.js";
import { ChatInput } from "../components/ChatInput.js";
import type { Route } from "./+types/chat.$slug";

// ─── Loader ──────────────────────────────────────────────
// Load the character + any existing conversation + messages.

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);

  const character = await prisma.character.findUnique({
    where: { slug: params.slug },
  });
  if (!character) {
    throw new Response("Character not found", { status: 404 });
  }

  // Find existing conversation (if any)
  const conversation = await prisma.conversation.findUnique({
    where: {
      userId_characterId: {
        userId: user.id,
        characterId: character.id,
      },
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return {
    character: {
      name: character.name,
      slug: character.slug,
      accentColor: character.accentColor,
    },
    conversationId: conversation?.id ?? null,
    messages: conversation?.messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
    })) ?? [],
  };
}

// ─── Types for client state ──────────────────────────────

interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// ─── Component ───────────────────────────────────────────

export default function ChatPage() {
  const { character, conversationId, messages: initialMessages } =
    useLoaderData<typeof loader>();

  const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [convId, setConvId] = useState<string | null>(conversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Send a message and stream the response
  const handleSend = useCallback(
    async (userMessage: string) => {
      // Optimistically add the user message to the UI
      const tempId = `temp-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: tempId, role: "user", content: userMessage },
      ]);
      setIsStreaming(true);
      setStreamingText("");

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: convId,
            userMessage,
            characterSlug: character.slug,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          // Parse SSE events (may contain multiple "data: ...\n\n" in one chunk)
          const lines = text.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6); // remove "data: " prefix

            if (data === "[DONE]") {
              // Streaming complete — add full message to messages array
              setMessages((prev) => [
                ...prev,
                {
                  id: `assistant-${Date.now()}`,
                  role: "assistant",
                  content: fullText,
                },
              ]);
              setStreamingText("");
              continue;
            }

            if (data === '"[ERROR]"') {
              fullText += "\n\n[An error occurred while generating the response.]";
              setStreamingText(fullText);
              continue;
            }

            try {
              const chunk = JSON.parse(data) as string;
              fullText += chunk;
              setStreamingText(fullText);
            } catch {
              // Skip malformed chunks
            }
          }
        }
      } catch (error) {
        console.error("Chat error:", error);
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: "Sorry, something went wrong. Please try again.",
          },
        ]);
      } finally {
        setIsStreaming(false);
      }
    },
    [convId, character.slug],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-gray-800 px-4 py-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: character.accentColor ?? "#666" }}
        >
          {character.name[0]}
        </div>
        <h1 className="text-lg font-semibold text-white">{character.name}</h1>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.length === 0 && !isStreaming && (
            <p className="text-center text-sm text-gray-500">
              Start a conversation with {character.name}!
            </p>
          )}

          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              content={msg.content}
              characterName={character.name}
              accentColor={character.accentColor ?? "#666"}
            />
          ))}

          {/* Streaming message (while AI is responding) */}
          {isStreaming && streamingText && (
            <ChatMessage
              role="assistant"
              content={streamingText}
              characterName={character.name}
              accentColor={character.accentColor ?? "#666"}
            />
          )}

          {/* Streaming indicator (before first chunk arrives) */}
          {isStreaming && !streamingText && (
            <div className="flex gap-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: character.accentColor ?? "#666" }}
              >
                {character.name[0]}
              </div>
              <div className="rounded-2xl bg-gray-800 px-4 py-2.5 text-sm text-gray-400">
                Thinking...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-gray-800 px-4 py-3">
        <div className="mx-auto max-w-2xl">
          <ChatInput onSend={handleSend} disabled={isStreaming} />
        </div>
      </div>
    </div>
  );
}
