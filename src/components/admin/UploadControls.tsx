import { useRef, useState } from "react";
import { ImageIcon, FileText, ClipboardPaste, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { extractTextFromFile, fileToDataUrl } from "@/lib/extractFileText";

export interface PendingAttachment {
  id: string;
  kind: "image";
  name: string;
  dataUrl: string;
}

interface UploadControlsProps {
  onTextExtracted: (text: string, sourceType: "docx" | "pdf" | "voice" | "clipboard") => void;
  onImageAdded: (attachment: PendingAttachment) => void;
  disabled?: boolean;
}

/** Minimal typing for the Web Speech API, which lacks official TS types. */
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}

export function UploadControls({
  onTextExtracted,
  onImageAdded,
  disabled,
}: UploadControlsProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docxInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImageFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const dataUrl = await fileToDataUrl(file);
      onImageAdded({ id: crypto.randomUUID(), kind: "image", name: file.name, dataUrl });
    }
  }

  async function handleDocFile(file: File | undefined, kind: "docx" | "pdf") {
    if (!file) return;
    try {
      const { text } = await extractTextFromFile(file);
      onTextExtracted(text, kind);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that file.");
    }
  }

  async function handlePasteClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) onTextExtracted(text, "clipboard");
    } catch {
      setError("Clipboard access was blocked by the browser. Try Ctrl/Cmd+V in the box instead.");
    }
  }

  function toggleVoice() {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setError("Voice input isn't supported in this browser — try Chrome or Edge.");
      return;
    }

    const recognition: SpeechRecognitionLike = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-IN";
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results as ArrayLike<{ 0: { transcript: string } }>)
        .map((result) => result[0].transcript)
        .join(" ");
      onTextExtracted(transcript, "voice");
    };
    recognition.onerror = () => setError("Voice input stopped due to a recognition error.");
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const images = files.filter((f) => f.type.startsWith("image/"));
    const docx = files.find((f) => f.name.endsWith(".docx"));
    const pdf = files.find((f) => f.name.endsWith(".pdf"));
    if (images.length) handleImageFiles(e.dataTransfer.files);
    if (docx) handleDocFile(docx, "docx");
    if (pdf) handleDocFile(pdf, "pdf");
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="flex flex-wrap items-center gap-1.5"
    >
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleImageFiles(e.target.files)}
      />
      <input
        ref={docxInputRef}
        type="file"
        accept=".docx"
        hidden
        onChange={(e) => handleDocFile(e.target.files?.[0], "docx")}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf"
        hidden
        onChange={(e) => handleDocFile(e.target.files?.[0], "pdf")}
      />

      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => imageInputRef.current?.click()}
      >
        <ImageIcon className="h-3.5 w-3.5" /> Images
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => docxInputRef.current?.click()}
      >
        <FileText className="h-3.5 w-3.5" /> DOCX
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => pdfInputRef.current?.click()}
      >
        <FileText className="h-3.5 w-3.5" /> PDF
      </Button>
      <Button variant="ghost" size="sm" disabled={disabled} onClick={handlePasteClipboard}>
        <ClipboardPaste className="h-3.5 w-3.5" /> Paste clipboard
      </Button>
      <Button variant="ghost" size="sm" disabled={disabled} onClick={toggleVoice}>
        {isListening ? (
          <>
            <MicOff className="h-3.5 w-3.5 text-danger-500" /> Stop
          </>
        ) : (
          <>
            <Mic className="h-3.5 w-3.5" /> Voice
          </>
        )}
      </Button>

      {error && <span className="text-xs text-danger-500">{error}</span>}
    </div>
  );
}
