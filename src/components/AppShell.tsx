import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, BookOpen, Sparkles, Shield, LogOut, UploadCloud, LifeBuoy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

function NavItem({ to, icon: Icon, label }: { to: string; icon: typeof BookOpen; label: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = pathname === to || (to !== "/dashboard" && pathname.startsWith(to));
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-zinc-950/5 text-primary dark:bg-white/5 dark:text-foreground"
          : "text-muted-foreground hover:bg-zinc-950/5 dark:hover:bg-white/5"
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="hidden lg:inline">{label}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      return (data ?? []).some((r) => r.role === "admin");
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/10">
      <nav className="fixed bottom-0 left-0 z-50 w-full border-t border-border bg-background/85 backdrop-blur-md lg:top-0 lg:left-0 lg:h-full lg:w-64 lg:border-r lg:border-t-0">
        <div className="flex h-16 items-center px-6 lg:h-20">
          <Link to="/dashboard" className="font-serif text-xl font-semibold tracking-tight text-primary">
            Student Hub.
          </Link>
        </div>
        <div className="flex justify-around p-2 lg:flex-col lg:gap-1 lg:px-4">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/subjects" icon={BookOpen} label="Subjects" />
          <NavItem to="/ai-tutor" icon={Sparkles} label="AI Tutor" />
          <NavItem to="/contribute" icon={UploadCloud} label="Contribute" />
          <NavItem to="/support" icon={LifeBuoy} label="Support" />
          {isAdmin && <NavItem to="/admin" icon={Shield} label="Admin" />}
        </div>
        <div className="hidden lg:block absolute bottom-4 left-0 right-0 px-4">
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2 text-muted-foreground">
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </nav>
      <main className="pb-24 lg:pl-64 lg:pb-0">{children}</main>
    </div>
  );
}