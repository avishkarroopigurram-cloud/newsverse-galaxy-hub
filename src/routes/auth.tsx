import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — South India Journal" },
      { name: "description", content: "Sign in to South India Journal to manage news, save stories, and access editorial tools." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/" });
    });
  }, [navigate]);

  const signInEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null); setNotice(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: "/admin" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const signInGoogle = async () => {
    setBusy(true); setErr(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) { setErr(result.error.message); setBusy(false); return; }
    if (result.redirected) return;
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-8">
        <div className="text-center mb-6">
          <Link to="/" className="text-xl font-serif tracking-tight">South India Journal</Link>
          <h1 className="mt-3 text-xl font-semibold">Editorial sign in</h1>
          <p className="mt-1 text-sm text-white/60">Authorized editors only.</p>
        </div>

        <button
          onClick={signInGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-white text-black px-4 py-2.5 font-medium hover:bg-white/90 disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-white/40">
          <div className="flex-1 h-px bg-white/10" /> or <div className="flex-1 h-px bg-white/10" />
        </div>

        <form onSubmit={signInEmail} className="space-y-3">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 outline-none focus:border-white/30" />
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 outline-none focus:border-white/30" />
          {err && <p className="text-sm text-red-400">{err}</p>}
          {notice && <p className="text-sm text-emerald-400">{notice}</p>}
          <button type="submit" disabled={busy} className="w-full rounded-lg bg-red-600 hover:bg-red-500 px-4 py-2.5 font-medium disabled:opacity-50">
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-white/40">
          Editorial access only. Public signup is disabled.
        </p>
      </div>
    </div>
  );
}
