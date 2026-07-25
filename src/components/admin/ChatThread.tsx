import { Sparkles, User, ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Badge } from "@/components/admin/ui/badge";
import { Skeleton } from "@/components/admin/ui/skeleton";
import type { EditorialReviewResult } from "@/types/editorial";

export interface ChatTurn {
  id: string;
  userText: string;
  imageDataUrls: string[];
  status: "processing" | "done" | "error";
  result?: EditorialReviewResult;
  error?: string;
}

export function ChatThread({
  turns,
  onOpenReview,
}: {
  turns: ChatTurn[];
  onOpenReview: (turnId: string) => void;
}) {
  if (turns.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <Sparkles className="h-8 w-8 text-brass-500" />
        <p className="font-display text-2xl text-paper-100">South India Journal AI Editor</p>
        <p className="max-w-md text-sm text-paper-500">
          Paste a story, drop in photos, or upload a DOCX/PDF below. The AI Editor will copy-edit
          it, check facts and legal risk, generate headlines and SEO, and recommend where it
          should run — before anything is published.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 overflow-y-auto px-4 py-6">
      {turns.map((turn) => (
        <div key={turn.id} className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-700">
              <User className="h-4 w-4 text-paper-300" />
            </div>
            <div className="flex-1 rounded-2xl bg-ink-800 px-4 py-3 text-[15px] text-paper-100">
              {turn.imageDataUrls.length > 0 && (
                <div className="mb-2 flex gap-2">
                  {turn.imageDataUrls.map((url, i) => (
                    <img key={i} src={url} className="h-16 w-16 rounded-lg object-cover" />
                  ))}
                </div>
              )}
              <p className="whitespace-pre-wrap">{turn.userText}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brass-500/15">
              <Sparkles className="h-4 w-4 text-brass-500" />
            </div>

            {turn.status === "processing" && (
              <div className="flex-1 space-y-2 rounded-2xl border border-ink-600 bg-ink-800/60 px-4 py-3">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
                <p className="text-xs text-paper-700">
                  Editing, fact-checking, and preparing headlines and SEO…
                </p>
              </div>
            )}

            {turn.status === "error" && (
              <div className="flex-1 rounded-2xl border border-danger-500/40 bg-danger-500/10 px-4 py-3 text-sm text-danger-500">
                <div className="mb-1 flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4" /> Review failed
                </div>
                {turn.error ?? "Something went wrong talking to the AI Editor."}
              </div>
            )}

            {turn.status === "done" && turn.result && (
              <div className="flex-1 rounded-2xl border border-ink-600 bg-ink-800 px-4 py-3">
                <p className="font-display text-lg text-paper-100">{turn.result.headline}</p>
                <p className="mt-1 text-sm text-paper-500">{turn.result.summary}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="brass">Overall {turn.result.scores.overall}/100</Badge>
                  <Badge variant={turn.result.heroRecommendation.recommended ? "signal" : "neutral"}>
                    {turn.result.heroRecommendation.recommended
                      ? "Recommended for Hero"
                      : "Recommended for Originals"}
                  </Badge>
                  {turn.result.legalFlags.length > 0 && (
                    <Badge variant="warn">{turn.result.legalFlags.length} legal flag(s)</Badge>
                  )}
                  {turn.result.factCheckFlags.length > 0 && (
                    <Badge variant="warn">{turn.result.factCheckFlags.length} fact flag(s)</Badge>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => onOpenReview(turn.id)}
                >
                  Open full review <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
