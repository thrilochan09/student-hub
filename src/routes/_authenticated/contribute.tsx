import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { EXAM_TYPES, NOTE_CATEGORIES } from "@/lib/branches";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/contribute")({
  head: () => ({ meta: [{ title: "Contribute — Student Hub" }] }),
  component: Contribute,
});

type Kind = "note" | "paper";

function Contribute() {
  const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>("note");
  const [form, setForm] = useState({
    subject_id: "",
    title: "",
    pdf_url: "",
    note_category: "unit",
    exam_type: "sem",
    year: new Date().getFullYear(),
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects-lite"],
    queryFn: async () => (await supabase.from("subjects").select("id,code,name,branch,semester").order("code")).data ?? [],
  });

  const { data: mine = [] } = useQuery({
    queryKey: ["my-submissions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("upload_submissions")
        .select("*, subject:subjects(code,name)")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!form.subject_id) throw new Error("Please pick a subject");
      if (!form.title || !form.pdf_url) throw new Error("Title and PDF link are required");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const payload: any = {
        submitter_id: u.user.id,
        kind,
        subject_id: form.subject_id,
        title: form.title,
        pdf_url: form.pdf_url,
      };
      if (kind === "note") payload.note_category = form.note_category;
      else {
        payload.exam_type = form.exam_type;
        payload.year = Number(form.year);
      }
      const { error } = await supabase.from("upload_submissions").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Submitted for admin review");
      setForm({ subject_id: "", title: "", pdf_url: "", note_category: "unit", exam_type: "sem", year: new Date().getFullYear() });
      qc.invalidateQueries({ queryKey: ["my-submissions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-screen-md px-6 pt-8 lg:pt-12 pb-24">
      <h1 className="font-serif text-3xl font-medium mb-2">Contribute</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Share notes or previous year papers with your peers. Admins review every submission before it appears in the library.
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}
        className="rounded-2xl bg-card ring-1 ring-border p-5 space-y-4"
      >
        <div className="flex gap-2">
          {(["note", "paper"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`px-3 py-1.5 text-xs rounded-full ring-1 capitalize ${
                kind === k ? "bg-foreground text-background ring-foreground" : "ring-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {k === "note" ? "Note / Study material" : "Previous year paper"}
            </button>
          ))}
        </div>

        <div>
          <Label>Subject</Label>
          <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
            <SelectTrigger><SelectValue placeholder="Choose subject" /></SelectTrigger>
            <SelectContent>
              {subjects.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.code} — {s.name} · {s.branch} Sem {s.semester}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {kind === "note" ? (
          <div>
            <Label>Category</Label>
            <Select value={form.note_category} onValueChange={(v) => setForm({ ...form, note_category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {NOTE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Year</Label>
              <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Exam type</Label>
              <Select value={form.exam_type} onValueChange={(v) => setForm({ ...form, exam_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXAM_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div>
          <Label>Title</Label>
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Unit 3 — Complete notes" />
        </div>
        <div>
          <Label>PDF link</Label>
          <Input required type="url" value={form.pdf_url} onChange={(e) => setForm({ ...form, pdf_url: e.target.value })} placeholder="https://…" />
          <p className="mt-1 text-xs text-muted-foreground">
            Host the file on Drive/Dropbox/etc. and paste the public link.
          </p>
        </div>

        <Button type="submit" disabled={submit.isPending} className="w-full">
          {submit.isPending ? "Submitting…" : "Send for review"}
        </Button>
      </form>

      <h2 className="font-serif text-xl mt-10 mb-3">Your submissions</h2>
      <div className="rounded-2xl bg-card ring-1 ring-border divide-y divide-border">
        {mine.length === 0 && <div className="p-6 text-sm text-muted-foreground">Nothing submitted yet.</div>}
        {mine.map((s: any) => (
          <div key={s.id} className="p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{s.title}</div>
              <div className="text-xs text-muted-foreground truncate">
                {s.subject?.code} · {s.kind} · {new Date(s.created_at).toLocaleDateString()}
              </div>
              {s.review_note && <div className="text-xs text-destructive mt-1">Admin: {s.review_note}</div>}
            </div>
            <StatusPill status={s.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "approved")
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"><CheckCircle2 className="size-3" /> Approved</span>;
  if (status === "rejected")
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"><XCircle className="size-3" /> Rejected</span>;
  return <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ring-1 ring-border text-muted-foreground"><Clock className="size-3" /> Pending</span>;
}