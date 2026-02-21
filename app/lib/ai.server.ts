import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// ─── Types ───────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type AIProvider = "anthropic" | "openai";

// ─── Clients (initialized lazily) ────────────────────────

let anthropicClient: Anthropic | null = null;
let openaiClient: OpenAI | null = null;

function getAnthropicClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

function getOpenAIClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

// ─── Get current provider from env ───────────────────────

export function getProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER ?? "anthropic";
  if (provider !== "anthropic" && provider !== "openai") {
    return "anthropic";
  }
  return provider;
}

// ─── Stream Chat ─────────────────────────────────────────
// Returns an async iterator that yields text chunks.
// The caller can pipe these chunks as SSE events.

export async function* streamChat(
  systemPrompt: string,
  messages: ChatMessage[],
): AsyncGenerator<string> {
  const provider = getProvider();

  if (provider === "anthropic") {
    yield* streamAnthropic(systemPrompt, messages);
  } else {
    yield* streamOpenAI(systemPrompt, messages);
  }
}

// ─── Anthropic (Claude) ──────────────────────────────────

async function* streamAnthropic(
  systemPrompt: string,
  messages: ChatMessage[],
): AsyncGenerator<string> {
  const client = getAnthropicClient();

  const stream = client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}

// ─── OpenAI ──────────────────────────────────────────────

async function* streamOpenAI(
  systemPrompt: string,
  messages: ChatMessage[],
): AsyncGenerator<string> {
  const client = getOpenAIClient();

  const stream = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1024,
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) {
      yield text;
    }
  }
}
