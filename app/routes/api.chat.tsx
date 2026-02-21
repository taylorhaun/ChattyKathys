import { prisma } from "../lib/db.server.js";
import { requireUser } from "../lib/auth.server.js";
import { streamChat, getProvider } from "../lib/ai.server.js";
import type { ChatMessage } from "../lib/ai.server.js";
import type { Route } from "./+types/api.chat";

// ─── Action (POST /api/chat) ─────────────────────────────
// 1. Save the user's message to DB
// 2. Stream the AI response as SSE events
// 3. Save the full AI response to DB when done

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request);

  const body = await request.json();
  const { conversationId, userMessage, characterSlug } = body as {
    conversationId?: string;
    userMessage: string;
    characterSlug: string;
  };

  if (!userMessage?.trim() || !characterSlug) {
    return new Response("Missing required fields", { status: 400 });
  }

  // Look up the character
  const character = await prisma.character.findUnique({
    where: { slug: characterSlug },
  });
  if (!character) {
    return new Response("Character not found", { status: 404 });
  }

  // Find or create the conversation
  let conversation;
  if (conversationId) {
    conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
  }
  if (!conversation) {
    conversation = await prisma.conversation.upsert({
      where: {
        userId_characterId: {
          userId: user.id,
          characterId: character.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        characterId: character.id,
      },
    });
  }

  // Save the user message
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: userMessage.trim(),
    },
  });

  // Load message history for AI context
  const dbMessages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
  });

  const chatHistory: ChatMessage[] = dbMessages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Stream the AI response as SSE
  const provider = getProvider();
  const encoder = new TextEncoder();
  let fullResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamChat(
          character.systemPrompt,
          chatHistory,
        )) {
          fullResponse += chunk;
          // SSE format: "data: <content>\n\n"
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
          );
        }

        // Send done signal
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));

        // Save the full assistant response to DB
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: "assistant",
            content: fullResponse,
            provider,
          },
        });

        controller.close();
      } catch (error) {
        console.error("Streaming error:", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify("[ERROR]")}\n\n`,
          ),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
