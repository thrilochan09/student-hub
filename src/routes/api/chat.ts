import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";

const SYSTEM = `You are Student Hub's AI tutor for engineering students.
Answer in clear, exam-oriented language. When the user asks for a "2-mark", "5-mark", or "10-mark"
answer, scale depth accordingly: 2-mark = 2 crisp lines + key formula; 5-mark = 5-8 line explanation
with one example; 10-mark = structured answer with definition, diagram description, derivation/example,
and 3-5 bullet points of importance. Use markdown headings, bullets, and code blocks where helpful.
If a subject code or name is provided in brackets, tailor the answer to that subject.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Require an authenticated Supabase user. The /api/chat endpoint is
        // independently reachable, so we must validate the bearer token here
        // — protecting the UI route is not enough.
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
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
        if (claimsError || !claimsData?.claims?.sub) {
          return new Response("Unauthorized", { status: 401 });
        }

        const body = (await request.json()) as { messages?: unknown };
        if (!Array.isArray(body.messages)) return new Response("Messages required", { status: 400 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const messages = body.messages as UIMessage[];
        const result = streamText({
          model,
          system: SYSTEM,
          messages: await convertToModelMessages(messages),
        });
        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});