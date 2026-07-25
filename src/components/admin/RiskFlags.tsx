import { ShieldAlert, SearchCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Badge } from "@/components/admin/ui/badge";
import type { FactCheckFlag, LegalFlag } from "@/types/editorial";

const SEVERITY_VARIANT = { low: "neutral", medium: "warn", high: "danger" } as const;

export function RiskFlags({
  factCheckFlags,
  legalFlags,
}: {
  factCheckFlags: FactCheckFlag[];
  legalFlags: LegalFlag[];
}) {
  if (factCheckFlags.length === 0 && legalFlags.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-good-500">
          No fact-check or legal concerns detected. Always give it a human read before publishing.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {factCheckFlags.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <SearchCheck className="h-4 w-4 text-warn-500" />
            <CardTitle>Fact-check flags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            {factCheckFlags.map((flag, i) => (
              <div key={i} className="rounded-lg border border-ink-600 bg-ink-900/50 p-3 text-sm">
                <p className="text-paper-300">"{flag.excerpt}"</p>
                <p className="mt-1 text-xs text-paper-700">{flag.note}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {legalFlags.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <ShieldAlert className="h-4 w-4 text-danger-500" />
            <CardTitle>Legal flags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            {legalFlags.map((flag, i) => (
              <div key={i} className="rounded-lg border border-ink-600 bg-ink-900/50 p-3 text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-paper-300">"{flag.excerpt}"</span>
                  <Badge variant={SEVERITY_VARIANT[flag.severity]}>{flag.severity}</Badge>
                </div>
                <p className="text-xs text-paper-700">{flag.note}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
