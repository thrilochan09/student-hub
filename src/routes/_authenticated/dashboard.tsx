import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import mascot from "@/assets/mascot.png";
import { BRANCHES, type Branch } from "@/lib/branches";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Student Hub" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState<Branch | "ALL">("ALL");
  const [semester, setSemester] = useState<number | "ALL">("ALL");

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("name,email").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*").order("semester").order("code");
      if (error) throw error;
      return data;
    },
  });

  const { data: recent = [] } = useQuery({
    queryKey: ["recent-views"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recent_views")
        .select("viewed_at, subject:subjects(*)")
        .order("viewed_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return subjects.filter((s) => {
      if (branch !== "ALL" && s.branch !== branch) return false;
      if (semester !== "ALL" && s.semester !== semester) return false;
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || String(s.semester).includes(q);
    });
  }, [subjects, query, branch, semester]);

  const grouped = useMemo(() => {
    const map = new Map<number, typeof filtered>();
    for (const s of filtered) {
      const arr = map.get(s.semester) ?? [];
      arr.push(s);
      map.set(s.semester, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [filtered]);

  const firstName = (profile?.name ?? "Scholar").split(" ")[0];

  return (
    <div className="mx-auto max-w-screen-xl">
      <header className="px-6 pt-8 lg:pt-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-4 max-w-[44ch]">
            <img src={mascot} alt="" width={1024} height={1024} className="size-16 rounded-full bg-secondary ring-1 ring-border p-1" />
            <div>
              <h1 className="font-serif text-3xl font-medium leading-tight text-balance">
                Hello, {firstName}.
              </h1>
              <p className="text-sm text-muted-foreground text-pretty">Ready to study? Search any subject by name or code.</p>
            </div>
          </div>
          <div className="relative w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search subjects (e.g. CS301)…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-11 bg-secondary border-0"
            />
          </div>
        </div>
      </header>

      <section className="px-6 py-8">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-full mb-1">Filter by Branch</span>
            <FilterChip active={branch === "ALL"} onClick={() => setBranch("ALL")}>All</FilterChip>
            {BRANCHES.map((b) => (
              <FilterChip key={b} active={branch === b} onClick={() => setBranch(b)}>{b}</FilterChip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-full mb-1">Filter by Semester</span>
            <FilterChip active={semester === "ALL"} onClick={() => setSemester("ALL")}>All</FilterChip>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <FilterChip key={n} active={semester === n} onClick={() => setSemester(n)}>Sem {n}</FilterChip>
            ))}
          </div>
        </div>
      </section>

      <div className="px-6 pb-20 space-y-12">
        {recent.length > 0 && (
          <section>
            <h2 className="mb-6 font-serif text-xl font-medium">Recently Viewed</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {recent.map((r: any) => r.subject && (
                <SubjectCard key={r.subject.id} subject={r.subject} />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-6 font-serif text-xl font-medium">
            {query || branch !== "ALL" || semester !== "ALL" ? `Results (${filtered.length})` : "All Subjects"}
          </h2>
          {filtered.length === 0 ? (
            <div className="rounded-2xl bg-card p-8 ring-1 ring-border text-sm text-muted-foreground text-center">
              No subjects match your search.
            </div>
          ) : (
            <div className="space-y-8">
              {grouped.map(([sem, list]) => (
                <div key={sem}>
                  <div className="mb-3 flex items-baseline justify-between">
                    <h3 className="font-serif text-base font-medium">Semester {sem}</h3>
                    <span className="text-xs text-muted-foreground">{list.length} subject{list.length === 1 ? "" : "s"}</span>
                  </div>
                  <div className="divide-y divide-border rounded-2xl bg-card ring-1 ring-border">
                    {list.map((s) => (
                      <Link
                        key={s.id}
                        to="/subjects/$id"
                        params={{ id: s.id }}
                        className="flex items-center justify-between p-4 hover:bg-secondary/40 transition-colors"
                      >
                        <div className="flex gap-4 min-w-0">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary font-mono text-xs font-medium text-muted-foreground">
                            {s.code.slice(0, 2)}
                          </div>
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
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-1.5 text-xs font-medium ring-1 transition-colors",
        active
          ? "bg-primary text-primary-foreground ring-primary"
          : "bg-card text-muted-foreground ring-border hover:bg-secondary"
      )}
    >
      {children}
    </button>
  );
}

function SubjectCard({ subject }: { subject: any }) {
  return (
    <Link to="/subjects/$id" params={{ id: subject.id }} className="group block">
      <div className="rounded-2xl bg-card p-5 ring-1 ring-border hover:shadow-md transition-shadow">
        <div className="mb-3 flex justify-between">
          <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{subject.code}</span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase">Sem {subject.semester}</span>
        </div>
        <h3 className="mb-1 text-base font-medium">{subject.name}</h3>
        <p className="text-sm text-muted-foreground">{subject.branch}</p>
        <div className="mt-4 flex items-center gap-2 text-[10px] font-medium text-primary">
          <span>Open subject</span><ArrowRight className="size-3" />
        </div>
      </div>
    </Link>
  );
}