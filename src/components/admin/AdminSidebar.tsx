import {
  LayoutDashboard,
  Sparkles,
  Flame,
  Newspaper,
  BarChart3,
  Settings,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavKey =
  | "dashboard"
  | "desk"
  | "hero"
  | "originals"
  | "analytics"
  | "settings";

const NAV_ITEMS: Array<{
  key: NavKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  editable: boolean;
}> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, editable: false },
  { key: "desk", label: "AI Editorial Desk", icon: Sparkles, editable: true },
  { key: "hero", label: "Hero Stories", icon: Flame, editable: true },
  { key: "originals", label: "SIJ Originals", icon: Newspaper, editable: true },
  { key: "analytics", label: "Analytics", icon: BarChart3, editable: false },
  { key: "settings", label: "Settings", icon: Settings, editable: false },
];

export function AdminSidebar({
  active,
  onSelect,
}: {
  active: NavKey;
  onSelect: (key: NavKey) => void;
}) {
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-ink-600 bg-ink-900 px-3 py-4">
      <div className="mb-6 px-2">
        <p className="font-display text-lg text-paper-100">South India Journal</p>
        <p className="text-xs text-paper-700">AI Editorial Desk</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ key, label, icon: Icon, editable }) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={cn(
              "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
              active === key
                ? "bg-ink-700 text-paper-100"
                : "text-paper-500 hover:bg-ink-800 hover:text-paper-100",
            )}
          >
            <span className="flex items-center gap-2.5">
              <Icon className="h-4 w-4" />
              {label}
            </span>
            {!editable && <Lock className="h-3 w-3 text-paper-700" />}
          </button>
        ))}
      </nav>

      <div className="rounded-lg border border-ink-600 bg-ink-800/60 px-3 py-2.5 text-xs text-paper-700">
        The AI Editor can only publish to <span className="text-paper-300">Hero</span> and{" "}
        <span className="text-paper-300">Originals</span>. All other sections are populated
        automatically and locked from this dashboard.
      </div>
    </aside>
  );
}

export type { NavKey };
