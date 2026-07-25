import { useState } from "react";
import { ArrowUp, X } from "lucide-react";
import { Textarea } from "@/components/admin/ui/textarea";
import { Button } from "@/components/admin/ui/button";
import { UploadControls, type PendingAttachment } from "./UploadControls";
import { cn } from "@/lib/utils";

interface ChatComposerProps {
  onSubmit: (payload: { text: string; imageDataUrls: string[] }) => void;
  isProcessing: boolean;
}

export function ChatComposer({ onSubmit, isProcessing }: ChatComposerProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);

  function handleTextExtracted(extracted: string) {
    setText((prev) => (prev.trim() ? `${prev.trim()}\n\n${extracted}` : extracted));
  }

  function handleSubmit() {
    if (!text.trim() || isProcessing) return;
    onSubmit({ text: text.trim(), imageDataUrls: attachments.map((a) => a.dataUrl) });
    setText("");
    setAttachments([]);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-6">
      <div
        className={cn(
          "wire-pulse rounded-2xl border border-ink-600 bg-ink-800 shadow-2xl shadow-black/30",
        )}
      >
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-ink-600 p-3">
            {attachments.map((att) => (
              <div key={att.id} className="group relative h-14 w-14 overflow-hidden rounded-lg border border-ink-600">
                <img src={att.dataUrl} alt={att.name} className="h-full w-full object-cover" />
                <button
                  onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-4 w-4 text-paper-100" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="What happened today?"
          rows={4}
          className="px-4 pt-4 text-[15px] leading-relaxed"
        />

        <div className="flex items-center justify-between gap-2 px-3 pb-3">
          <UploadControls
            disabled={isProcessing}
            onTextExtracted={handleTextExtracted}
            onImageAdded={(att) => setAttachments((prev) => [...prev, att])}
          />
          <Button
            size="icon"
            disabled={!text.trim() || isProcessing}
            onClick={handleSubmit}
            aria-label="Submit to AI Editor"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-paper-700">
        Every submission is reviewed by the South India Journal AI Editor before anything can be
        published.
      </p>
    </div>
  );
}
