interface TranscriptPanelProps {
  finalTranscript: string;
  partialTranscript: string;
}

export function TranscriptPanel({
  finalTranscript,
  partialTranscript,
}: TranscriptPanelProps): JSX.Element {
  const hasTranscript = finalTranscript || partialTranscript;

  return (
    <article className="min-h-52 rounded-lg border border-[#2a2a2a] bg-[#121212] p-4">
      <h2 className="text-xs font-medium uppercase text-[#a3a3a3]">
        Original transcript
      </h2>

      <div className="mt-6 grid gap-3" aria-live="polite">
        {finalTranscript ? (
          <p className="text-2xl font-medium leading-snug text-[#f5f5f5] md:text-3xl">
            {finalTranscript}
          </p>
        ) : null}

        {partialTranscript ? (
          <p className="text-xl leading-snug text-[#737373] md:text-2xl">
            {partialTranscript}
          </p>
        ) : null}

        {!hasTranscript ? (
          <p className="text-2xl font-medium leading-snug text-[#737373] md:text-3xl">
            Waiting for speech...
          </p>
        ) : null}
      </div>
    </article>
  );
}
