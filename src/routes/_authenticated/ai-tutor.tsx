import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { z } from "zod";
import mascot from "@/assets/mascot.png";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const search = z.object({ subject: z.string().optional() });

export const Route = createFileRoute("/_authenticated/ai-tutor")({
  head: () => ({ meta: [{ title: "AI Tutor — Student Hub" }] }),
  validateSearch: search,
  component: AiTutor,
});

const SUGGESTIONS = [
  "Explain Big-O notation simply",
  "Generate 10-mark answer: normalization in DBMS",
  "List important questions for Operating Systems Mid-2",
  "Summarize Computer Networks unit 3",
];

function AiTutor() {
  const { subject } = Route.useSearch();
  const [input, setInput] = useState("");
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: async (): Promise<Record<string, string>> => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
    onError: (e) => toast.error(e.message ?? "AI request failed"),
  });

  useEffect(() => { composerRef.current?.focus(); }, []);
  useEffect(() => {
    if (status === "ready") composerRef.current?.focus();
  }, [status]);

  const loading = status === "submitted" || status === "streaming";

  async function send(text: string) {
    const value = text.trim();
    if (!value || loading) return;
    setInput("");
    await sendMessage({ text: subject ? `[Subject: ${subject}] ${value}` : value });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 pt-8 lg:pt-12 pb-32 flex flex-col min-h-[calc(100vh-2rem)]">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <img src={mascot} alt="" width={1024} height={1024} className="size-12" />
          <div>
            <h1 className="font-serif text-3xl font-medium flex items-center gap-2">AI Tutor <Sparkles className="size-5 text-accent" /></h1>
            <p className="text-sm text-muted-foreground">Ask doubts, generate answers, or get exam-ready summaries.{subject ? ` Studying ${subject}.` : ""}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-6">
        {messages.length === 0 && (
          <div className="grid sm:grid-cols-2 gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="text-left text-sm rounded-xl bg-card ring-1 ring-border p-4 hover:bg-secondary/40 transition-colors">
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m: UIMessage) => {
          const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
          if (m.role === "user") {
            return (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl bg-primary text-primary-foreground px-4 py-2.5 text-sm">{text}</div>
              </div>
            );
          }
          return (
            <div key={m.id} className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{text}</ReactMarkdown>
            </div>
          );
        })}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Thinking…
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="fixed bottom-20 lg:bottom-6 left-0 lg:left-64 right-0 px-6">
        <div className="mx-auto max-w-3xl flex gap-2 rounded-2xl bg-card ring-1 ring-border shadow-lg p-2">
          <Textarea
            ref={composerRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
            }}
            placeholder="Ask a doubt or paste a question…"
            className="flex-1 min-h-[44px] max-h-40 resize-none border-0 bg-transparent focus-visible:ring-0"
            rows={1}
          />
          <Button type="submit" disabled={loading || !input.trim()} size="icon" className="shrink-0">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}