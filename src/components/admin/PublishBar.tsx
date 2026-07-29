import { Loader2, Send, Clock } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import type { PublishDestination } from "@/types/editorial";

export function PublishBar({
  destination,
  isPublishing,
  isPublished,
  onPublish,
}: {
  destination: PublishDestination;
  isPublishing: boolean;
  isPublished: boolean;
  onPublish: () => void;
}) {
  return (
    <div className="sticky bottom-0 flex flex-col items-stretch gap-3 border-t border-ink-600 bg-ink-900/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
      <p className="text-xs text-paper-700">
        <Clock className="mr-1 inline h-3.5 w-3.5" />
        Publishing is never automatic — this button is the only thing that puts it live, into{" "}
        <span className="text-paper-300">{destination === "hero" ? "Hero" : "Originals"}</span>.
      </p>
      <Button onClick={onPublish} disabled={isPublishing || isPublished} size="lg" className="w-full sm:w-auto">
        {isPublishing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Publishing…
          </>
        ) : isPublished ? (
          "Published"
        ) : (
          <>
            <Send className="h-4 w-4" /> Publish to{" "}
            {destination === "hero" ? "Hero" : "Originals"}
          </>
        )}
      </Button>
    </div>
  );
}
