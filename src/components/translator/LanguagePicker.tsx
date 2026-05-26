import { ArrowLeftRight } from "lucide-react";

import { SUPPORTED_LANGUAGES, isSupportedLanguageCode } from "../../lib/languages";
import type { LanguageCode } from "../../types/language";

interface LanguagePickerProps {
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  onSourceLanguageChange: (language: LanguageCode) => void;
  onTargetLanguageChange: (language: LanguageCode) => void;
  onSwapLanguages: () => void;
}

export function LanguagePicker({
  sourceLanguage,
  targetLanguage,
  onSourceLanguageChange,
  onTargetLanguageChange,
  onSwapLanguages,
}: LanguagePickerProps): JSX.Element {
  return (
    <section
      className="grid gap-3 rounded-lg border border-[#2a2a2a] bg-[#121212] p-4 md:grid-cols-[1fr_auto_1fr] md:items-end"
      aria-label="Language selection"
    >
      <label className="grid gap-2 text-xs font-medium uppercase text-[#a3a3a3]">
        From
        <select
          className="rounded-md border border-[#2a2a2a] bg-[#181818] px-3 py-2 text-sm normal-case text-[#f5f5f5]"
          value={sourceLanguage}
          onChange={(event) => {
            if (isSupportedLanguageCode(event.target.value)) {
              onSourceLanguageChange(event.target.value);
            }
          }}
        >
          {SUPPORTED_LANGUAGES.map((language) => (
            <option key={language.code} value={language.code}>
              {language.label}
            </option>
          ))}
        </select>
      </label>

      <button
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#2a2a2a] text-[#f5f5f5] hover:bg-[#181818] focus:outline-none focus:ring-2 focus:ring-[#2dd4bf] focus:ring-offset-2 focus:ring-offset-[#121212]"
        type="button"
        aria-label="Swap languages"
        onClick={onSwapLanguages}
      >
        <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
      </button>

      <label className="grid gap-2 text-xs font-medium uppercase text-[#a3a3a3]">
        To
        <select
          className="rounded-md border border-[#2a2a2a] bg-[#181818] px-3 py-2 text-sm normal-case text-[#f5f5f5]"
          value={targetLanguage}
          onChange={(event) => {
            if (isSupportedLanguageCode(event.target.value)) {
              onTargetLanguageChange(event.target.value);
            }
          }}
        >
          {SUPPORTED_LANGUAGES.map((language) => (
            <option key={language.code} value={language.code}>
              {language.label}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
