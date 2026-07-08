import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Check, X, Shield, ShieldOff, BadgeCheck, Ban, UserCog, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BRANCHES, SEMESTERS, EXAM_TYPES, NOTE_CATEGORIES } from "@/lib/branches";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!data) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Admin — Student Hub" }] }),
  component: Admin,
});

function Admin() {
  return (
    <div className="mx-auto max-w-screen-xl px-6 pt-8 lg:pt-12 pb-20">
      <h1 className="font-serif text-3xl font-medium mb-2">Admin</h1>
      <p className="text-sm text-muted-foreground mb-8">Manage users, review student submissions, respond to support tickets, and curate resources.</p>

      <Tabs defaultValue="submissions">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="tickets">Support</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="papers">Papers</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>
        <TabsContent value="submissions" className="pt-6"><SubmissionsAdmin /></TabsContent>
        <TabsContent value="users" className="pt-6"><UsersAdmin /></TabsContent>
        <TabsContent value="tickets" className="pt-6"><TicketsAdmin /></TabsContent>
        <TabsContent value="subjects" className="pt-6"><SubjectsAdmin /></TabsContent>
        <TabsContent value="papers" className="pt-6"><PapersAdmin /></TabsContent>
        <TabsContent value="notes" className="pt-6"><NotesAdmin /></TabsContent>
      </Tabs>
    </div>
  );
}

// ============ Submissions ============

async function callAdmin(body: unknown) {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

function SubmissionsAdmin() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const { data = [], isLoading } = useQuery({
    queryKey: ["submissions", tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("upload_submissions")
        .select("*, subject:subjects(code,name)")
        .eq("status", tab)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const ids = Array.from(new Set(rows.map((r) => r.submitter_id).filter(Boolean)));
      if (ids.length === 0) return rows;
      const { data: profs } = await supabase.from("profiles").select("id,name,email").in("id", ids);
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      return rows.map((r) => ({ ...r, submitter: map.get(r.submitter_id) }));
    },
  });

  const approve = useMutation({
    mutationFn: async (s: any) => {
      if (s.kind === "note") {
        const { error } = await supabase.from("notes").insert({
          subject_id: s.subject_id,
          title: s.title,
          pdf_url: s.pdf_url,
          category: s.note_category ?? "unit",
        } as any);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("previous_papers").insert({
          subject_id: s.subject_id,
          title: s.title,
          pdf_url: s.pdf_url,
          exam_type: s.exam_type ?? "sem",
          year: s.year ?? new Date().getFullYear(),
        } as any);
        if (error) throw error;
      }
      const { data: u } = await supabase.auth.getUser();
      const { error: upErr } = await supabase
        .from("upload_submissions")
        .update({ status: "approved", reviewed_by: u.user?.id, reviewed_at: new Date().toISOString() })
        .eq("id", s.id);
      if (upErr) throw upErr;
    },
    onSuccess: () => {
      toast.success("Submission approved and published");
      qc.invalidateQueries({ queryKey: ["submissions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("upload_submissions")
        .update({ status: "rejected", review_note: note, reviewed_by: u.user?.id, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Submission rejected");
      qc.invalidateQueries({ queryKey: ["submissions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("upload_submissions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["submissions"] });
    },
  });

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`px-3 py-1.5 text-xs rounded-full ring-1 capitalize ${
              tab === s ? "bg-foreground text-background ring-foreground" : "ring-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="rounded-2xl bg-card ring-1 ring-border divide-y divide-border">
        {isLoading && <div className="p-6 text-sm text-muted-foreground">Loading…</div>}
        {!isLoading && data.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">No {tab} submissions.</div>
        )}
        {data.map((s: any) => (
          <div key={s.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {s.title}
                <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">{s.kind}</span>
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {s.subject?.code} · {s.kind === "note" ? s.note_category : `${s.exam_type} ${s.year ?? ""}`} · by{" "}
                {s.submitter?.name || s.submitter?.email || "unknown"}
              </div>
              {s.review_note && (
                <div className="text-xs text-destructive mt-1">Note: {s.review_note}</div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a href={s.pdf_url} target="_blank" rel="noreferrer" className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                <ExternalLink className="size-3" /> PDF
              </a>
              {tab === "pending" && (
                <>
                  <Button size="sm" onClick={() => approve.mutate(s)} disabled={approve.isPending}>
                    <Check className="size-3.5 mr-1" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const note = window.prompt("Reason for rejection (optional):") ?? "";
                      reject.mutate({ id: s.id, note });
                    }}
                  >
                    <X className="size-3.5 mr-1" /> Reject
                  </Button>
                </>
              )}
              <Button variant="ghost" size="icon" onClick={() => remove.mutate(s.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Users ============

function UsersAdmin() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => (await callAdmin({ action: "list_users" })) as { users: any[] },
  });

  const toggleAdmin = useMutation({
    mutationFn: async ({ user_id, make_admin }: { user_id: string; make_admin: boolean }) =>
      callAdmin({ action: "toggle_admin", user_id, make_admin }),
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteUser = useMutation({
    mutationFn: async (user_id: string) => callAdmin({ action: "delete_user", user_id }),
    onSuccess: () => {
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setFlag = useMutation({
    mutationFn: async ({ user_id, field, value }: { user_id: string; field: "is_verified" | "is_disabled"; value: boolean }) => {
      const { error } = await supabase.from("profiles").update({ [field]: value } as any).eq("id", user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const users = (data?.users ?? []).filter((u) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (u.email || "").toLowerCase().includes(s) || (u.name || "").toLowerCase().includes(s);
  });

  return (
    <div className="space-y-4">
      <Input placeholder="Search users by name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="rounded-2xl bg-card ring-1 ring-border divide-y divide-border">
        {isLoading && <div className="p-6 text-sm text-muted-foreground">Loading…</div>}
        {!isLoading && users.length === 0 && <div className="p-6 text-sm text-muted-foreground">No users found.</div>}
        {users.map((u) => (
          <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium flex flex-wrap items-center gap-2">
                {u.name || "Unnamed"}
                {u.is_admin && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-foreground text-background">ADMIN</span>
                )}
                {u.is_verified && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full ring-1 ring-border text-muted-foreground">VERIFIED</span>
                )}
                {u.is_disabled && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground">DISABLED</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate">{u.email}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setFlag.mutate({ user_id: u.id, field: "is_verified", value: !u.is_verified })}
              >
                <BadgeCheck className="size-3.5 mr-1" />
                {u.is_verified ? "Unverify" : "Verify"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setFlag.mutate({ user_id: u.id, field: "is_disabled", value: !u.is_disabled })}
              >
                <Ban className="size-3.5 mr-1" />
                {u.is_disabled ? "Enable" : "Disable"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleAdmin.mutate({ user_id: u.id, make_admin: !u.is_admin })}
              >
                {u.is_admin ? <ShieldOff className="size-3.5 mr-1" /> : <Shield className="size-3.5 mr-1" />}
                {u.is_admin ? "Revoke admin" : "Make admin"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (window.confirm(`Delete ${u.email}? This cannot be undone.`)) deleteUser.mutate(u.id);
                }}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <UserCog className="size-3" /> Admin role changes and deletions use the secure server endpoint.
      </p>
    </div>
  );
}

// ============ Tickets ============

function TicketsAdmin() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"open" | "in_progress" | "resolved">("open");
  const { data = [] } = useQuery({
    queryKey: ["tickets", filter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("status", filter)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const ids = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
      if (ids.length === 0) return rows;
      const { data: profs } = await supabase.from("profiles").select("id,name,email").in("id", ids);
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      return rows.map((r) => ({ ...r, user: map.get(r.user_id) }));
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { data: u } = await supabase.auth.getUser();
      const withMeta = patch.admin_response
        ? { ...patch, responded_by: u.user?.id, responded_at: new Date().toISOString() }
        : patch;
      const { error } = await supabase.from("support_tickets").update(withMeta).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ticket updated");
      qc.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(["open", "in_progress", "resolved"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs rounded-full ring-1 capitalize ${
              filter === s ? "bg-foreground text-background ring-foreground" : "ring-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {data.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground rounded-2xl bg-card ring-1 ring-border">
            No {filter.replace("_", " ")} tickets.
          </div>
        )}
        {data.map((t: any) => (
          <TicketCard key={t.id} ticket={t} onUpdate={(patch) => update.mutate({ id: t.id, patch })} />
        ))}
      </div>
    </div>
  );
}

function TicketCard({ ticket, onUpdate }: { ticket: any; onUpdate: (patch: any) => void }) {
  const [response, setResponse] = useState(ticket.admin_response ?? "");
  return (
    <div className="rounded-2xl bg-card ring-1 ring-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">{ticket.subject}</div>
          <div className="text-xs text-muted-foreground">
            From {ticket.user?.name || ticket.user?.email || "unknown"} · {new Date(ticket.created_at).toLocaleString()}
          </div>
        </div>
        <Select value={ticket.status} onValueChange={(v) => onUpdate({ status: v })}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="text-sm text-foreground/80 whitespace-pre-wrap">{ticket.message}</p>
      <div>
        <Label className="text-xs">Admin response</Label>
        <Textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          rows={2}
          placeholder="Write a reply visible to the student…"
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={() => onUpdate({ admin_response: response })}>
            Save response
          </Button>
        </div>
      </div>
    </div>
  );
}

function SubjectsAdmin() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", code: "", branch: "CSE", semester: 1, description: "" });
  const { data = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*").order("code")).data ?? [],
  });
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("subjects").insert({ ...form, semester: Number(form.semester) } as any);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Subject added"); setForm({ name: "", code: "", branch: "CSE", semester: 1, description: "" }); qc.invalidateQueries({ queryKey: ["subjects"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("subjects").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["subjects"] }); },
  });
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="space-y-3 rounded-2xl bg-card ring-1 ring-border p-5">
        <h3 className="font-serif text-lg">Add subject</h3>
        <div><Label>Code</Label><Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
        <div><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Branch</Label>
            <Select value={form.branch} onValueChange={(v) => setForm({ ...form, branch: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Semester</Label>
            <Select value={String(form.semester)} onValueChange={(v) => setForm({ ...form, semester: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SEMESTERS.map((s) => <SelectItem key={s} value={String(s)}>Sem {s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <Button type="submit" disabled={add.isPending} className="w-full">Add subject</Button>
      </form>
      <div className="lg:col-span-2 rounded-2xl bg-card ring-1 ring-border divide-y divide-border max-h-[600px] overflow-auto">
        {data.map((s) => (
          <div key={s.id} className="flex items-center justify-between p-4">
            <div><div className="text-sm font-medium">{s.code} — {s.name}</div><div className="text-xs text-muted-foreground">{s.branch} · Sem {s.semester}</div></div>
            <Button variant="ghost" size="icon" onClick={() => remove.mutate(s.id)}><Trash2 className="size-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubjectPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data = [] } = useQuery({ queryKey: ["subjects"], queryFn: async () => (await supabase.from("subjects").select("id,code,name").order("code")).data ?? [] });
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Choose subject" /></SelectTrigger>
      <SelectContent>{data.map((s) => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}</SelectContent>
    </Select>
  );
}
async function uploadPdf(file: File) {
  const fileName = `${Date.now()}-${file.name}`;

  const { error } = await supabase.storage
    .from("pdfs")
    .upload(fileName, file);

  if (error) throw error;

  const { data } = supabase.storage.from("pdfs").getPublicUrl(fileName);
  return data.publicUrl;
}

function PapersAdmin() {
  const qc = useQueryClient();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    subject_id: "",
    year: new Date().getFullYear(),
    exam_type: "sem",
    title: "",
  });

  const { data = [] } = useQuery({
    queryKey: ["all-papers"],
    queryFn: async () =>
      (await supabase
        .from("previous_papers")
        .select("*, subject:subjects(code,name)")
        .order("created_at", { ascending: false })
        .limit(50)).data ?? [],
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!form.subject_id) throw new Error("Pick a subject");
      if (!form.title) throw new Error("Title is required");
      if (!pdfFile) throw new Error("Please upload a PDF");

      const pdf_url = await uploadPdf(pdfFile);

      const { error } = await supabase.from("previous_papers").insert({
        ...form,
        year: Number(form.year),
        pdf_url,
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paper added");
      setForm({
        subject_id: "",
        year: new Date().getFullYear(),
        exam_type: "sem",
        title: "",
      });
      setPdfFile(null);
      qc.invalidateQueries({ queryKey: ["all-papers"] });
      qc.invalidateQueries({ queryKey: ["papers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("previous_papers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["all-papers"] });
    },
  });

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="space-y-3 rounded-2xl bg-card ring-1 ring-border p-5">
        <h3 className="font-serif text-lg">Add paper</h3>

        <div><Label>Subject</Label><SubjectPicker value={form.subject_id} onChange={(v) => setForm({ ...form, subject_id: v })} /></div>

        <div className="grid grid-cols-2 gap-3">
          <div><Label>Year</Label><Input type="number" required value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} /></div>
          <div><Label>Type</Label>
            <Select value={form.exam_type} onValueChange={(v) => setForm({ ...form, exam_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{EXAM_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>

        <div>
          <Label>Upload PDF</Label>
          <Input type="file" accept="application/pdf,.pdf" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
          {pdfFile && <p className="text-xs text-muted-foreground mt-1">Selected: {pdfFile.name}</p>}
        </div>

        <Button type="submit" disabled={add.isPending} className="w-full">Add paper</Button>
      </form>

      <div className="lg:col-span-2 rounded-2xl bg-card ring-1 ring-border divide-y divide-border max-h-[600px] overflow-auto">
        {data.length === 0 && <div className="p-6 text-sm text-muted-foreground">No papers yet.</div>}
        {data.map((p: any) => (
          <div key={p.id} className="flex items-center justify-between p-4">
            <div><div className="text-sm font-medium">{p.title}</div><div className="text-xs text-muted-foreground">{p.subject?.code} · {p.year} · {p.exam_type}</div></div>
            <Button variant="ghost" size="icon" onClick={() => remove.mutate(p.id)}><Trash2 className="size-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotesAdmin() {
  const qc = useQueryClient();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [form, setForm] = useState({ subject_id: "", category: "unit", title: "" });

  const { data = [] } = useQuery({
    queryKey: ["all-notes"],
    queryFn: async () =>
      (await supabase
        .from("notes")
        .select("*, subject:subjects(code,name)")
        .order("created_at", { ascending: false })
        .limit(50)).data ?? [],
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!form.subject_id) throw new Error("Pick a subject");
      if (!form.title) throw new Error("Title is required");
      if (!pdfFile) throw new Error("Please upload a PDF");

      const pdf_url = await uploadPdf(pdfFile);

      const { error } = await supabase.from("notes").insert({
        ...form,
        pdf_url,
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Note added");
      setForm({ subject_id: "", category: "unit", title: "" });
      setPdfFile(null);
      qc.invalidateQueries({ queryKey: ["all-notes"] });
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["all-notes"] });
    },
  });

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="space-y-3 rounded-2xl bg-card ring-1 ring-border p-5">
        <h3 className="font-serif text-lg">Add note</h3>

        <div><Label>Subject</Label><SubjectPicker value={form.subject_id} onChange={(v) => setForm({ ...form, subject_id: v })} /></div>

        <div><Label>Category</Label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{NOTE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>

        <div>
          <Label>Upload PDF</Label>
          <Input type="file" accept="application/pdf,.pdf" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
          {pdfFile && <p className="text-xs text-muted-foreground mt-1">Selected: {pdfFile.name}</p>}
        </div>

        <Button type="submit" disabled={add.isPending} className="w-full">Add note</Button>
      </form>

      <div className="lg:col-span-2 rounded-2xl bg-card ring-1 ring-border divide-y divide-border max-h-[600px] overflow-auto">
        {data.length === 0 && <div className="p-6 text-sm text-muted-foreground">No notes yet.</div>}
        {data.map((n: any) => (
          <div key={n.id} className="flex items-center justify-between p-4">
            <div><div className="text-sm font-medium">{n.title}</div><div className="text-xs text-muted-foreground">{n.subject?.code} · {n.category}</div></div>
            <Button variant="ghost" size="icon" onClick={() => remove.mutate(n.id)}><Trash2 className="size-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}