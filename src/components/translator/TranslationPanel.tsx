import { AlertTriangle } from "lucide-react";

interface TranslationPanelProps {
  translatedText: string;
  isTranslating: boolean;
  errorMessage: string | null;
}

export function TranslationPanel({
  translatedText,
  isTranslating,
  errorMessage,
}: TranslationPanelProps): JSX.Element {
  return (
    <article className="min-h-52 rounded-lg border border-[#2a2a2a] bg-[#121212] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-medium uppercase text-[#a3a3a3]">
          Translation
        </h2>

        {isTranslating ? (
          <span
            className="inline-flex items-center gap-2 text-xs text-[#2dd4bf]"
            aria-live="polite"
          >
            <span
              className="h-2 w-2 rounded-full bg-[#2dd4bf] animate-status-pulse"
              aria-hidden="true"
            />
            Translating
          </span>
        ) : null}
      </div>

      <div className="mt-6 grid gap-3" aria-live="polite">
        {translatedText ? (
          <p className="text-3xl font-semibold leading-tight text-[#f5f5f5] md:text-4xl">
            {translatedText}
          </p>
        ) : (
          <p className="text-3xl font-semibold leading-tight text-[#737373] md:text-4xl">
            Translation will appear here.
          </p>
        )}

        {errorMessage ? (
          <p
            className="flex items-start gap-2 text-xs leading-relaxed text-[#fca5a5]"
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
    </article>
  );
}
