import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  isAdmin,
  runIngestAll,
  runIngestSection,
  getAdminStats,
  listAdminArticles,
  updateArticleAdmin,
  deleteDuplicates,
} from "@/lib/admin.functions";
import { SECTION_ORDER, SECTION_LABELS } from "@/lib/newsdata.server";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — South India Journal" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const checkAdmin = useServerFn(isAdmin);
  const fetchStats = useServerFn(getAdminStats);
  const fetchArticles = useServerFn(listAdminArticles);
  const ingestAll = useServerFn(runIngestAll);
  const ingestSection = useServerFn(runIngestSection);
  const updateArticle = useServerFn(updateArticleAdmin);
  const dedupe = useServerFn(deleteDuplicates);

  const adminQ = useQuery({ queryKey: ["is-admin"], queryFn: () => checkAdmin() });
  const statsQ = useQuery({ queryKey: ["admin-stats"], queryFn: () => fetchStats(), enabled: adminQ.data?.isEditor });
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending" | "rejected">("all");
  const articlesQ = useQuery({
    queryKey: ["admin-articles", statusFilter],
    queryFn: () => fetchArticles({ data: { status: statusFilter, page: 0, pageSize: 30 } }),
    enabled: adminQ.data?.isEditor,
  });

  const ingestAllMut = useMutation({
    mutationFn: () => ingestAll(),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["admin-stats"] }); void qc.invalidateQueries({ queryKey: ["admin-articles"] }); },
  });
  const ingestSecMut = useMutation({
    mutationFn: (section: string) => ingestSection({ data: { section } }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["admin-stats"] }); void qc.invalidateQueries({ queryKey: ["admin-articles"] }); },
  });
  const updateMut = useMutation({
    mutationFn: (v: { id: string; title?: string; status?: "approved" | "pending" | "rejected"; is_featured?: boolean; is_breaking?: boolean; is_editors_pick?: boolean; is_original?: boolean }) => updateArticle({ data: v }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["admin-articles"] }); },
  });
  const dedupeMut = useMutation({
    mutationFn: () => dedupe(),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["admin-stats"] }); void qc.invalidateQueries({ queryKey: ["admin-articles"] }); },
  });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (adminQ.isLoading) return <div className="min-h-screen bg-black text-white p-10">Loading…</div>;
  if (!adminQ.data?.isEditor) {
    return (
      <div className="min-h-screen bg-black text-white p-10">
        <h1 className="text-2xl">Not authorized</h1>
        <p className="text-white/60 mt-2">You need admin or editor role to access this page.</p>
        <button onClick={signOut} className="mt-4 underline">Sign out</button>
      </div>
    );
  }

  const stats = statsQ.data;
  const articles = articlesQ.data?.rows ?? [];
  const lastLog = stats?.recentLogs?.[0];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="font-bold">NEWS<span className="text-red-500">VERSE</span> Admin</Link>
          <button onClick={signOut} className="text-sm text-white/70 hover:text-white">Sign out</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Actions */}
        <section className="flex flex-wrap gap-3">
          <button onClick={() => ingestAllMut.mutate()} disabled={ingestAllMut.isPending} className="rounded-lg bg-red-600 hover:bg-red-500 px-4 py-2 text-sm font-medium disabled:opacity-50">
            {ingestAllMut.isPending ? "Refreshing…" : "Refresh all sections now"}
          </button>
          <button onClick={() => dedupeMut.mutate()} disabled={dedupeMut.isPending} className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-50">
            {dedupeMut.isPending ? "Cleaning…" : "Delete duplicates"}
          </button>
        </section>

        {ingestAllMut.data && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
            Ingested: {ingestAllMut.data.reduce((s, r) => s + r.inserted, 0)} new · {ingestAllMut.data.reduce((s, r) => s + r.duplicates, 0)} duplicates skipped
          </div>
        )}

        {/* Stats */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card label="Total articles" value={stats?.totalArticles ?? "…"} />
          <Card label="Pending review" value={stats?.pendingCount ?? "…"} />
          <Card label="Last fetch" value={lastLog ? new Date(lastLog.ran_at).toLocaleTimeString() : "—"} sub={lastLog?.status} />
          <Card label="API status" value={lastLog?.rate_limited ? "Rate limited" : "OK"} sub={lastLog?.error ?? undefined} />
        </section>

        {/* Per-section import */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Import by section</h2>
          <div className="flex flex-wrap gap-2">
            {SECTION_ORDER.map((s) => (
              <button
                key={s}
                onClick={() => ingestSecMut.mutate(s)}
                disabled={ingestSecMut.isPending}
                className="rounded-full border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5 disabled:opacity-50"
              >
                {SECTION_LABELS[s]} · {stats?.byCategory[s] ?? 0}
              </button>
            ))}
          </div>
        </section>

        {/* Article table */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Articles</h2>
            <div className="flex gap-2 text-xs">
              {(["all", "approved", "pending", "rejected"] as const).map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)} className={`rounded-full px-3 py-1 ${statusFilter === s ? "bg-red-600" : "bg-white/5 border border-white/10"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/50 mb-2">
            Editorial priority: <span className="text-white/80">⭐ Pin</span> promotes a story to the homepage hero, overriding the automatic ranking.
            Otherwise the homepage follows the newsroom priority order (Breaking → Government → Telangana → Hyderabad → India → World → … → Entertainment last).
            <br />
            <span className="text-white/80">📰 Original</span> publishes the story under South India Journal Originals — in-house editorial content excluded from external provider sync.
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase text-white/60">
                <tr>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Section</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Priority</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a) => (
                  <tr key={a.id} className="border-t border-white/5">
                    <td className="px-3 py-2 max-w-md">
                      <Link to="/article/$slug" params={{ slug: a.slug }} className="hover:text-red-300 line-clamp-2">{a.title}</Link>
                      <div className="text-xs text-white/40">{a.source_name}</div>
                    </td>
                    <td className="px-3 py-2 text-white/70">{a.category}</td>
                    <td className="px-3 py-2">
                      <select value={a.status} onChange={(e) => updateMut.mutate({ id: a.id, status: e.target.value as "approved" | "pending" | "rejected" })} className="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs">
                        <option value="approved">approved</option>
                        <option value="pending">pending</option>
                        <option value="rejected">rejected</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 space-x-1 whitespace-nowrap">
                      <FlagBtn on={a.is_featured} label="⭐ Pin" onClick={() => updateMut.mutate({ id: a.id, is_featured: !a.is_featured })} />
                      <FlagBtn on={a.is_breaking} label="🔥 Break" onClick={() => updateMut.mutate({ id: a.id, is_breaking: !a.is_breaking })} />
                      <FlagBtn on={a.is_editors_pick} label="✏️ Pick" onClick={() => updateMut.mutate({ id: a.id, is_editors_pick: !a.is_editors_pick })} />
                      <FlagBtn on={a.is_original ?? false} label="📰 Original" onClick={() => updateMut.mutate({ id: a.id, is_original: !a.is_original })} />
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => {
                        const t = prompt("Edit headline", a.title);
                        if (t && t.trim()) updateMut.mutate({ id: a.id, title: t.trim() });
                      }} className="text-xs underline">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Logs */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Recent fetch logs</h2>
          <div className="rounded-xl border border-white/10 divide-y divide-white/5">
            {(stats?.recentLogs ?? []).map((l) => (
              <div key={l.id} className="px-4 py-2 flex flex-wrap gap-3 text-sm">
                <span className="text-white/50 w-40">{new Date(l.ran_at).toLocaleString()}</span>
                <span className="w-28">{l.category ?? "—"}</span>
                <span className="w-20 text-white/70">{l.provider ?? "—"}</span>
                <span className={l.status === "success" ? "text-emerald-400" : l.rate_limited ? "text-yellow-400" : "text-red-400"}>{l.status}</span>
                <span className="text-white/60">+{l.inserted_count} · dup {l.duplicate_count}</span>
                {l.error && <span className="text-red-400/80 truncate max-w-xl">{l.error}</span>}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-widest text-white/50">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-1 text-xs text-white/50">{sub}</div>}
    </div>
  );
}

function FlagBtn({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`rounded px-2 py-0.5 text-xs border ${on ? "bg-red-600 border-red-500" : "border-white/15 bg-transparent"}`}>{label}</button>
  );
}
