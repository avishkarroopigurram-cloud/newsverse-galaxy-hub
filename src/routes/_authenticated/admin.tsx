import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminSidebar, type NavKey } from "@/components/admin/AdminSidebar";
import { EditorialDeskShell } from "@/components/admin/EditorialDeskShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "AI Editorial Desk — South India Journal" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

async function fetchIsAdmin(): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return false;
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: uid,
    _role: "admin",
  });
  if (error) return false;
  return data === true;
}

function AdminPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState<NavKey>("desk");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const roleQ = useQuery({ queryKey: ["is-admin"], queryFn: fetchIsAdmin });

  useEffect(() => {
    if (roleQ.data === false) navigate({ to: "/auth" });
  }, [roleQ.data, navigate]);

  if (roleQ.isLoading || roleQ.data === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0d12] text-[#9497a6] text-sm">
        Loading editorial desk…
      </div>
    );
  }

  if (!roleQ.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0d12] text-center px-6">
        <div>
          <p className="text-[#edeef2] text-lg font-medium">Access restricted</p>
          <p className="mt-2 text-sm text-[#9497a6]">
            This area is for authorized South India Journal editors only.
          </p>
          <Link to="/" className="mt-4 inline-block text-sm text-[#d9b968] hover:underline">
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-ink-950 font-sans">
      <AdminSidebar
        active={active}
        onSelect={setActive}
        isMobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-ink-600 bg-ink-900 px-4 py-3 md:hidden">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="rounded p-1.5 text-paper-300 hover:bg-ink-700"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="font-display text-base text-paper-100">South India Journal</p>
        </div>
        <div className="flex-1 overflow-hidden">
          {active === "desk" && <EditorialDeskShell />}
          {active !== "desk" && <PhasePlaceholder active={active} />}
        </div>
      </main>
    </div>
  );
}

function PhasePlaceholder({ active }: { active: NavKey }) {
  const copy: Record<Exclude<NavKey, "desk">, string> = {
    dashboard: "An overview of recent AI Editor activity will live here.",
    hero: "Manage published Hero stories — replace, reorder, schedule, remove.",
    originals: "Browse, edit, archive, and search all SIJ Originals.",
    analytics: "Performance for Hero and Originals content.",
    settings: "API keys, image provider, language, and theme.",
  };
  return (
    <div className="flex h-full items-center justify-center px-6 text-center">
      <p className="max-w-sm text-sm text-paper-500">
        {copy[active as Exclude<NavKey, "desk">]}
        <br />
        <span className="text-paper-700">Coming soon.</span>
      </p>
    </div>
  );
}
