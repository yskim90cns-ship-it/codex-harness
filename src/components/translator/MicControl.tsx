import { AlertTriangle, Mic, Square } from "lucide-react";

import type { MicStatus } from "../../types/speech";

interface MicControlProps {
  micStatus: MicStatus;
  errorMessage: string | null;
  onStart: () => void;
  onStop: () => void;
}

export function MicControl({
  micStatus,
  errorMessage,
  onStart,
  onStop,
}: MicControlProps): JSX.Element {
  const isListening = micStatus === "listening";
  const isRequesting = micStatus === "requesting";
  const buttonLabel = getButtonLabel(micStatus);

  return (
    <div className="flex flex-col gap-2 md:items-end">
      <button
        className={getButtonClassName(isListening)}
        type="button"
        onClick={isListening ? onStop : onStart}
        disabled={isRequesting || micStatus === "unsupported"}
      >
        {isListening ? (
          <Square className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Mic className="h-4 w-4" aria-hidden="true" />
        )}
        {buttonLabel}
      </button>

      <div className="flex items-center gap-2 text-xs text-[#a3a3a3]">
        <span
          className={getStatusDotClassName(micStatus)}
          aria-hidden="true"
        />
        <span aria-live="polite">{getStatusText(micStatus)}</span>
      </div>

      {errorMessage ? (
        <p
          className="flex max-w-sm items-start gap-2 text-xs leading-relaxed text-[#fca5a5]"
          role="alert"
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-[#ef4444]"
            aria-hidden="true"
          />
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

function getButtonLabel(micStatus: MicStatus): string {
  if (micStatus === "listening") {
    return "Stop";
  }

  if (micStatus === "requesting" || micStatus === "denied") {
    return "Request permission";
  }

  return "Start";
}

function getStatusText(micStatus: MicStatus): string {
  switch (micStatus) {
    case "idle":
      return "Idle";
    case "requesting":
      return "Requesting microphone permission";
    case "listening":
      return "Listening";
    case "denied":
      return "Permission denied";
    case "unsupported":
      return "Speech recognition unsupported";
  }
}

function getButtonClassName(isListening: boolean): string {
  const baseClassName =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#090909] disabled:cursor-not-allowed disabled:opacity-60";

  if (isListening) {
    return `${baseClassName} bg-[#ef4444] text-white hover:bg-[#dc2626] focus:ring-[#ef4444]`;
  }

  return `${baseClassName} bg-[#f5f5f5] text-[#090909] hover:bg-[#d4d4d4] focus:ring-[#2dd4bf]`;
}

function getStatusDotClassName(micStatus: MicStatus): string {
  const baseClassName = "h-2 w-2 rounded-full";

  switch (micStatus) {
    case "listening":
      return `${baseClassName} bg-[#22c55e] animate-status-pulse`;
    case "requesting":
      return `${baseClassName} bg-[#f59e0b] animate-status-pulse`;
    case "denied":
    case "unsupported":
      return `${baseClassName} bg-[#ef4444]`;
    case "idle":
      return `${baseClassName} bg-[#737373]`;
  }
}
