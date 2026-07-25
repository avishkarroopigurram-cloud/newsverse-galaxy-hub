import { Card, CardContent } from "@/components/admin/ui/card";
import { Progress } from "@/components/admin/ui/progress";
import { cn } from "@/lib/utils";
import type { QualityScores } from "@/types/editorial";

const LABELS: Array<{ key: keyof Omit<QualityScores, "overall">; label: string }> = [
  { key: "grammar", label: "Grammar" },
  { key: "readability", label: "Readability" },
  { key: "seo", label: "SEO" },
  { key: "trust", label: "Trust" },
  { key: "headline", label: "Headline" },
  { key: "structure", label: "Structure" },
  { key: "publishingReadiness", label: "Publishing Readiness" },
];

export function QualityScoreCards({ scores }: { scores: QualityScores }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card className="col-span-2 flex items-center justify-between p-4 sm:col-span-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-paper-700">Overall Score</p>
          <p className="font-display text-4xl text-paper-100">{scores.overall}</p>
        </div>
        <div
          className={cn(
            "stamp flex h-16 w-16 items-center justify-center rounded-full text-lg font-semibold",
          )}
        >
          {scores.overall}
        </div>
      </Card>

      {LABELS.map(({ key, label }) => (
        <Card key={key}>
          <CardContent className="space-y-2 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-paper-500">{label}</span>
              <span className="font-mono text-paper-300">{scores[key]}</span>
            </div>
            <Progress value={scores[key]} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
