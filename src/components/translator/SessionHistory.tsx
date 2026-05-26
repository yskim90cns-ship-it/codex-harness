import { Clock } from "lucide-react";

import type { TranslationPair } from "../../types/translation";

interface SessionHistoryProps {
  history: TranslationPair[];
}

export function SessionHistory({ history }: SessionHistoryProps): JSX.Element {
  const recentHistory = history.slice(0, 5);

  return (
    <section className="rounded-lg border border-[#2a2a2a] bg-[#121212] p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase text-[#a3a3a3]">
        <Clock className="h-4 w-4" aria-hidden="true" />
        Recent translations
      </div>

      {recentHistory.length > 0 ? (
        <ol className="mt-3 grid gap-2">
          {recentHistory.map((item) => (
            <li
              className="rounded-md border border-[#2a2a2a] bg-[#181818] p-3 text-sm leading-relaxed text-[#d4d4d4] animate-slide-up"
              key={item.id}
            >
              <p className="text-[#f5f5f5]">{item.sourceText}</p>
              <p className="mt-1 text-[#a3a3a3]">{item.translatedText}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-[#737373]">
          No confirmed translations in this session.
        </p>
      )}
    </section>
  );
}
