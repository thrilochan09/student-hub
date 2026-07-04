import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck, FileText, ExternalLink, ArrowLeft, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { EXAM_TYPES, NOTE_CATEGORIES } from "@/lib/branches";

export const Route = createFileRoute("/_authenticated/subjects/$id")({
  head: () => ({ meta: [{ title: "Subject — Student Hub" }] }),
  component: SubjectPage,
});

function SubjectPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: subject } = useQuery({
    queryKey: ["subject", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      await supabase.from("recent_views").upsert(
        { user_id: u.user.id, subject_id: id, viewed_at: new Date().toISOString() },
        { onConflict: "user_id,subject_id" }
      );
    })();
  }, [id]);

  const { data: papers = [] } = useQuery({
    queryKey: ["papers", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("previous_papers").select("*").eq("subject_id", id).order("year", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["notes", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("notes").select("*").eq("subject_id", id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: bookmarks = [] } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase.from("bookmarks").select("resource_id,resource_kind").eq("user_id", u.user.id);
      return data ?? [];
    },
  });

  const isBookmarked = (rid: string) => bookmarks.some((b) => b.resource_id === rid);

  const toggleBookmark = useMutation({
    mutationFn: async ({ rid, kind }: { rid: string; kind: "paper" | "note" }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      if (isBookmarked(rid)) {
        await supabase.from("bookmarks").delete().eq("user_id", u.user.id).eq("resource_id", rid);
      } else {
        await supabase.from("bookmarks").insert({ user_id: u.user.id, resource_id: rid, resource_kind: kind });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookmarks"] }),
  });

  if (!subject) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-screen-xl px-6 pt-8 lg:pt-12 pb-20">
      <Link to="/subjects" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-3" /> All subjects
      </Link>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex gap-2 mb-2">
            <span className="rounded bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold">{subject.code}</span>
            <span className="rounded bg-secondary text-muted-foreground px-2 py-0.5 text-[10px] font-semibold">{subject.branch}</span>
            <span className="rounded bg-secondary text-muted-foreground px-2 py-0.5 text-[10px] font-semibold">Sem {subject.semester}</span>
          </div>
          <h1 className="font-serif text-3xl font-medium">{subject.name}</h1>
          {subject.description && <p className="text-sm text-muted-foreground mt-1 max-w-prose">{subject.description}</p>}
        </div>
        <Link to="/ai-tutor" search={{ subject: subject.code }}>
          <Button variant="default" className="gap-2"><Sparkles className="size-4" /> Ask AI tutor</Button>
        </Link>
      </div>

      <Tabs defaultValue="papers">
        <TabsList>
          <TabsTrigger value="papers">Previous Year Papers</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="papers" className="pt-6 space-y-8">
          {EXAM_TYPES.map((et) => {
            const list = papers.filter((p) => p.exam_type === et.value);
            return (
              <section key={et.value}>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{et.label} ({list.length})</h3>
                {list.length === 0 ? (
                  <div className="rounded-xl bg-card p-6 ring-1 ring-border text-sm text-muted-foreground">No {et.label} papers uploaded yet.</div>
                ) : (
                  <div className="divide-y divide-border rounded-xl bg-card ring-1 ring-border">
                    {list.map((p) => (
                      <ResourceRow key={p.id} title={p.title} subtitle={`Year ${p.year}`} url={p.pdf_url}
                        bookmarked={isBookmarked(p.id)}
                        onBookmark={() => toggleBookmark.mutate({ rid: p.id, kind: "paper" })} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </TabsContent>

        <TabsContent value="notes" className="pt-6 space-y-8">
          {NOTE_CATEGORIES.map((cat) => {
            const list = notes.filter((n) => n.category === cat.value);
            return (
              <section key={cat.value}>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cat.label} ({list.length})</h3>
                {list.length === 0 ? (
                  <div className="rounded-xl bg-card p-6 ring-1 ring-border text-sm text-muted-foreground">No {cat.label.toLowerCase()} yet.</div>
                ) : (
                  <div className="divide-y divide-border rounded-xl bg-card ring-1 ring-border">
                    {list.map((n) => (
                      <ResourceRow key={n.id} title={n.title} url={n.pdf_url}
                        bookmarked={isBookmarked(n.id)}
                        onBookmark={() => toggleBookmark.mutate({ rid: n.id, kind: "note" })} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ResourceRow({ title, subtitle, url, bookmarked, onBookmark }: { title: string; subtitle?: string; url: string; bookmarked: boolean; onBookmark: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <FileText className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" onClick={onBookmark} aria-label="Bookmark">
          {bookmarked ? <BookmarkCheck className="size-4 text-primary" /> : <Bookmark className="size-4" />}
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={url} target="_blank" rel="noreferrer" className="gap-1">Open <ExternalLink className="size-3" /></a>
        </Button>
      </div>
    </div>
  );
}