import { Badge } from "@/components/admin/ui/badge";
import { cn } from "@/lib/utils";
import type { HeadlineSuggestion } from "@/types/editorial";

const STYLE_LABEL: Record<HeadlineSuggestion["style"], string> = {
  breaking: "Breaking",
  professional: "Professional",
  seo: "SEO",
  editorial: "Editorial",
  investigative: "Investigative",
  exclusive: "Exclusive",
};

export function HeadlineSuggestions({
  suggestions,
  selected,
  onSelect,
}: {
  suggestions: HeadlineSuggestion[];
  selected: string;
  onSelect: (headline: string) => void;
}) {
  return (
    <div className="space-y-2">
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s.text)}
          className={cn(
            "flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
            selected === s.text
              ? "border-brass-500 bg-brass-500/10 text-paper-100"
              : "border-ink-600 bg-ink-800/60 text-paper-300 hover:border-ink-500",
          )}
        >
          <span>{s.text}</span>
          <Badge variant="neutral" className="shrink-0">
            {STYLE_LABEL[s.style]}
          </Badge>
        </button>
      ))}
    </div>
  );
}
