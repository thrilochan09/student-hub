import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import mascot from "@/assets/mascot.png";


export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Student Hub" },
      { name: "description", content: "Sign in or create an account to access PYQs, notes, and AI study tools." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
  const isResetPage =
    window.location.pathname === "/reset-password";

  if (isResetPage) return;

  supabase.auth.getUser().then(({ data }) => {
    if (data.user) {
      navigate({ to: "/dashboard", replace: true });
    }
  });
}, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome back!");
    navigate({ to: "/dashboard", replace: true });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Account created!");
    navigate({ to: "/dashboard", replace: true });
  }

  async function googleSignIn() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) {
    toast.error(error.message);
  }
}
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-primary text-primary-foreground p-12">
        <div>
          <div className="font-serif text-2xl font-semibold">Student Hub.</div>
          <p className="mt-2 text-sm opacity-80">For engineering students who study smarter.</p>
        </div>
        <div className="flex flex-col items-center gap-6">
          <img src={mascot} alt="Student Hub mascot owl" width={1024} height={1024} className="w-56 h-56 object-contain" />
          <blockquote className="font-serif text-2xl leading-snug max-w-sm text-center text-balance">
            "Every previous paper, every unit note, one AI tutor — all in one quiet place."
          </blockquote>
        </div>
        <div className="text-xs opacity-60">PYQs · Notes · AI study assistance</div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3">
            <img src={mascot} alt="" width={1024} height={1024} className="w-12 h-12" />
            <div className="font-serif text-xl font-semibold text-primary">Student Hub.</div>
          </div>
          <div>
            <h1 className="font-serif text-3xl font-medium">Welcome.</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to access papers, notes, and your AI tutor.</p>
          </div>

          <Button variant="outline" onClick={googleSignIn} className="w-full h-11" type="button">
            <svg viewBox="0 0 48 48" className="size-4 mr-2"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.3l-6.3-5.2C29.3 35 26.8 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.2C41.5 35.8 44 30.4 44 24c0-1.2-.1-2.4-.4-3.5z"/></svg>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider"><span className="bg-background px-2 text-muted-foreground">or</span></div>
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-3 pt-4">
                <div className="space-y-1"><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="space-y-1"><Label>Password</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button type="submit" disabled={loading} className="w-full h-11">Sign in</Button>
                <div className="text-center mt-3">
             <a
            href="/forgot-password"
            className="text-sm text-blue-600 hover:underline"
            >
            Forgot Password?
                 </a>
               </div>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-3 pt-4">
                <div className="space-y-1"><Label>Name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></div>
                <div className="space-y-1"><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="space-y-1"><Label>Password</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button type="submit" disabled={loading} className="w-full h-11">Create account</Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}