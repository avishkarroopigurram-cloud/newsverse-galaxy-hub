import { useState } from "react";
import { ChatComposer } from "./ChatComposer";
import { ChatThread, type ChatTurn } from "./ChatThread";
import { ReviewScreen } from "./ReviewScreen";
import { useEditorialReview } from "@/hooks/useEditorialReview";

export function EditorialDeskShell() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [openReviewTurnId, setOpenReviewTurnId] = useState<string | null>(null);
  const review = useEditorialReview();

  async function handleSubmit({
    text,
    imageDataUrls,
  }: {
    text: string;
    imageDataUrls: string[];
  }) {
    const id = crypto.randomUUID();
    setTurns((prev) => [
      ...prev,
      { id, userText: text, imageDataUrls, status: "processing" },
    ]);

    try {
      const result = await review.mutateAsync({
        rawText: text,
        sourceType: "paste",
        imageDataUrls,
      });
      setTurns((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "done", result } : t)),
      );
      setOpenReviewTurnId(id);
    } catch (err) {
      setTurns((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, status: "error", error: err instanceof Error ? err.message : String(err) }
            : t,
        ),
      );
    }
  }

  const openTurn = turns.find((t) => t.id === openReviewTurnId);

  if (openTurn?.result) {
    return (
      <ReviewScreen
        result={openTurn.result}
        heroImageDataUrl={openTurn.imageDataUrls[0]}
        onBack={() => setOpenReviewTurnId(null)}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ChatThread turns={turns} onOpenReview={setOpenReviewTurnId} />
      <ChatComposer onSubmit={handleSubmit} isProcessing={review.isPending} />
    </div>
  );
}
