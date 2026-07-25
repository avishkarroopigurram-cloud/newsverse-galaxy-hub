import { Flame, Newspaper } from "lucide-react";
import { Card, CardContent } from "@/components/admin/ui/card";
import { cn } from "@/lib/utils";
import type { HeroRecommendation, PublishDestination } from "@/types/editorial";

export function HeroDecisionCard({
  recommendation,
  destination,
  onChangeDestination,
}: {
  recommendation: HeroRecommendation;
  destination: PublishDestination;
  onChangeDestination: (destination: PublishDestination) => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          {recommendation.recommended ? (
            <Flame className="h-4 w-4 text-brass-500" />
          ) : (
            <Newspaper className="h-4 w-4 text-signal-400" />
          )}
          <p className="text-sm font-medium text-paper-100">
            AI recommends: {recommendation.recommended ? "Hero Section" : "SIJ Originals"}
          </p>
        </div>
        <p className="text-sm text-paper-500">{recommendation.reason}</p>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onChangeDestination("hero")}
            className={cn(
              "flex-1 rounded-lg border px-3 py-2 text-sm transition-colors",
              destination === "hero"
                ? "border-brass-500 bg-brass-500/10 text-paper-100"
                : "border-ink-600 text-paper-500 hover:border-ink-500",
            )}
          >
            Publish to Hero
          </button>
          <button
            onClick={() => onChangeDestination("originals")}
            className={cn(
              "flex-1 rounded-lg border px-3 py-2 text-sm transition-colors",
              destination === "originals"
                ? "border-signal-500 bg-signal-500/10 text-paper-100"
                : "border-ink-600 text-paper-500 hover:border-ink-500",
            )}
          >
            Publish to Originals
          </button>
        </div>
        <p className="text-xs text-paper-700">
          The editor always makes the final call — the AI recommendation never publishes on its
          own.
        </p>
      </CardContent>
    </Card>
  );
}
