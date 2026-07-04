import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({ meta: [{ title: "Support — Student Hub" }] }),
  component: Support,
});

function Support() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ subject: "", message: "" });

  const { data: tickets = [] } = useQuery({
    queryKey: ["my-tickets"],
    queryFn: async () => (await supabase.from("support_tickets").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.subject || !form.message) throw new Error("Please fill in both fields");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("support_tickets").insert({
        user_id: u.user.id,
        subject: form.subject,
        message: form.message,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ticket submitted");
      setForm({ subject: "", message: "" });
      qc.invalidateQueries({ queryKey: ["my-tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-screen-md px-6 pt-8 lg:pt-12 pb-24">
      <h1 className="font-serif text-3xl font-medium mb-2">Support</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Report a complaint, request a feature, or ask for help. An admin will get back to you here.
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
        className="rounded-2xl bg-card ring-1 ring-border p-5 space-y-4"
      >
        <div>
          <Label>Subject</Label>
          <Input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Short summary" />
        </div>
        <div>
          <Label>Message</Label>
          <Textarea required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Describe the issue…" />
        </div>
        <Button type="submit" disabled={create.isPending} className="w-full">
          {create.isPending ? "Sending…" : "Submit ticket"}
        </Button>
      </form>

      <h2 className="font-serif text-xl mt-10 mb-3">Your tickets</h2>
      <div className="space-y-3">
        {tickets.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground rounded-2xl bg-card ring-1 ring-border">
            No tickets yet.
          </div>
        )}
        {tickets.map((t: any) => (
          <div key={t.id} className="rounded-2xl bg-card ring-1 ring-border p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">{t.subject}</div>
                <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                t.status === "resolved"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : t.status === "in_progress"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                  : "ring-1 ring-border text-muted-foreground"
              }`}>{t.status.replace("_", " ")}</span>
            </div>
            <p className="text-sm text-foreground/80 whitespace-pre-wrap">{t.message}</p>
            {t.admin_response && (
              <div className="rounded-lg bg-background/60 ring-1 ring-border p-3 text-sm">
                <div className="text-xs font-medium text-muted-foreground mb-1">Admin response</div>
                {t.admin_response}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}