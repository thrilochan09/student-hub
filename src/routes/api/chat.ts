import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const SYSTEM = `
You are Student Hub's AI Tutor.

Rules:
- Keep answers clear and short.
- For normal study questions, explain simply.
- If LIVE WEB SEARCH RESULTS are provided, use ONLY those results.
- If web results conflict with your memory, ignore your memory.
- Never call live web data a mistake or inconsistency.
- For current/latest questions, do not answer from memory.
`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";

        if (!authHeader.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }

        const token = authHeader.slice("Bearer ".length).trim();

        if (!token || token.split(".").length !== 3) {
          return new Response("Unauthorized", { status: 401 });
        }

        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Server misconfigured", { status: 500 });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          auth: {
            storage: undefined,
            persistSession: false,
            autoRefreshToken: false,
          },
        });

        const { data: claimsData, error: claimsError } =
          await supabase.auth.getClaims(token);

        if (claimsError || !claimsData?.claims?.sub) {
          return new Response("Unauthorized", { status: 401 });
        }

        const body = (await request.json()) as { messages?: unknown };

        if (!Array.isArray(body.messages)) {
          return new Response("Messages required", { status: 400 });
        }

        if (!process.env.OPENROUTER_API_KEY) {
          return new Response("Missing OPENROUTER_API_KEY", { status: 500 });
        }

        const openrouter = createOpenAICompatible({
          name: "openrouter",
          apiKey: process.env.OPENROUTER_API_KEY,
          baseURL: "https://openrouter.ai/api/v1",
        });

        const model = openrouter("openrouter/free");

        const messages = body.messages as UIMessage[];

        const lastMessageText =
          messages[messages.length - 1]?.parts
            ?.map((part: any) => part.text ?? "")
            .join(" ") ?? "";

        const needsWebSearch =
          /\b(current|latest|today|now|news|2025|2026|president|prime minister|price|weather|recent)\b/i.test(
            lastMessageText
          );

        let webContext = "";

        if (needsWebSearch && process.env.TAVILY_API_KEY) {
          const searchResponse = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
            },
            body: JSON.stringify({
              query: `official current answer: ${lastMessageText}`,
              search_depth: "basic",
              max_results: 5,
            }),
          });

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();

            webContext =
              "IMPORTANT: Use ONLY these live web search results. Ignore your old training data:\n\n" +
              searchData.results
                ?.map(
                  (r: any, i: number) =>
                    `${i + 1}. ${r.title}\n${r.content}\nURL: ${r.url}`
                )
                .join("\n\n");
          }
        }

        const result = streamText({
          model,
          temperature: 0,
          system: webContext ? `${SYSTEM}\n\n${webContext}` : SYSTEM,
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
        });
      },
    },
  },
});