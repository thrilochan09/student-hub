import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { BRANCHES, SEMESTERS, type Branch } from "@/lib/branches";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/subjects/")({
  head: () => ({ meta: [{ title: "Subjects — Student Hub" }] }),
  component: SubjectsList,
});

function SubjectsList() {
  const [q, setQ] = useState("");
  const [branch, setBranch] = useState<Branch | "ALL">("ALL");
  const [sem, setSem] = useState<number | "ALL">("ALL");

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*").order("branch").order("semester").order("code");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return subjects.filter((s) => {
      if (branch !== "ALL" && s.branch !== branch) return false;
      if (sem !== "ALL" && s.semester !== sem) return false;
      if (!term) return true;
      return s.name.toLowerCase().includes(term) || s.code.toLowerCase().includes(term);
    });
  }, [subjects, q, branch, sem]);

  return (
    <div className="mx-auto max-w-screen-xl px-6 pt-8 lg:pt-12 pb-20">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-medium">Subjects</h1>
        <p className="text-sm text-muted-foreground mt-1">Browse by branch and semester.</p>
      </div>

      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Search by code or name…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 h-11 bg-secondary border-0" />
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-full">Branch</span>
        <Chip active={branch === "ALL"} onClick={() => setBranch("ALL")}>All</Chip>
        {BRANCHES.map((b) => <Chip key={b} active={branch === b} onClick={() => setBranch(b)}>{b}</Chip>)}
      </div>
      <div className="flex flex-wrap gap-2 mb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-full">Semester</span>
        <Chip active={sem === "ALL"} onClick={() => setSem("ALL")}>All</Chip>
        {SEMESTERS.map((s) => <Chip key={s} active={sem === s} onClick={() => setSem(s)}>Sem {s}</Chip>)}
      </div>

      <div className="divide-y divide-border rounded-2xl bg-card ring-1 ring-border">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">No subjects match.</div>
        )}
        {filtered.map((s) => (
          <Link key={s.id} to="/subjects/$id" params={{ id: s.id }} className="flex items-center justify-between p-4 hover:bg-secondary/40 transition-colors">
            <div className="flex gap-4 min-w-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary font-mono text-xs font-medium text-muted-foreground">{s.code.slice(0,2)}</div>
              <div className="min-w-0">
                <h4 className="text-sm font-medium truncate">{s.name}</h4>
                <p className="text-xs text-muted-foreground">{s.code} · {s.branch} · Sem {s.semester}</p>
              </div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn(
      "rounded-full px-4 py-1.5 text-xs font-medium ring-1 transition-colors",
      active ? "bg-primary text-primary-foreground ring-primary" : "bg-card text-muted-foreground ring-border hover:bg-secondary"
    )}>{children}</button>
  );
}