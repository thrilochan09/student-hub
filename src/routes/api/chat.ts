import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";

const SYSTEM = `You are Student Hub's AI tutor for engineering students.
Answer clearly, naturally, and accurately.
Do not force 2-mark, 5-mark, or 10-mark format unless the user specifically asks for it.
Explain concepts step by step when needed.
Use examples, tables, bullets, and code blocks where helpful.
Be friendly but not childish.
If the question is complex, provide a clear structured explanation.
If unsure, admit it instead of guessing.`;

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

        const provider = process.env.AI_PROVIDER ?? "gemini";

        let model;

        if (provider === "gemini") {
          if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            return new Response("Missing GOOGLE_GENERATIVE_AI_API_KEY", {
              status: 500,
            });
          }

          model = google("gemini-2.5-flash");
        } else if (provider === "openai") {
          if (!process.env.OPENAI_API_KEY) {
            return new Response("Missing OPENAI_API_KEY", { status: 500 });
          }

          model = openai("gpt-4o-mini");
        } else if (provider === "grok") {
          if (!process.env.XAI_API_KEY) {
            return new Response("Missing XAI_API_KEY", { status: 500 });
          }

          model = xai("grok-2-latest");
        } else {
          return new Response("Invalid AI_PROVIDER", { status: 500 });
        }

        const messages = body.messages as UIMessage[];

        const result = streamText({
          model,
          system: SYSTEM,
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
        });
      },
    },
  },
});