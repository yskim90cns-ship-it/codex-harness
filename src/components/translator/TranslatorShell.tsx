"use client";

import { useCallback, useState } from "react";

import { useLiveTranslation } from "../../hooks/useLiveTranslation";
import { useSpeechSession } from "../../hooks/useSpeechSession";
import type { LanguageCode } from "../../types/language";
import { LanguagePicker } from "./LanguagePicker";
import { MicControl } from "./MicControl";
import { SessionHistory } from "./SessionHistory";
import { TranslationPanel } from "./TranslationPanel";
import { TranscriptPanel } from "./TranscriptPanel";

export function TranslatorShell(): JSX.Element {
  const [sourceLanguage, setSourceLanguage] = useState<LanguageCode>("ko");
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>("en");
  const {
    state: speechState,
    controls: speechControls,
  } = useSpeechSession(sourceLanguage);
  const translationState = useLiveTranslation({
    sourceLanguage,
    targetLanguage,
    finalTranscript: speechState.finalTranscript,
  });

  const swapLanguages = useCallback(() => {
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);
  }, [sourceLanguage, targetLanguage]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-4 py-4 md:px-6">
      <header className="flex flex-col gap-3 border-b border-[#2a2a2a] pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#f5f5f5]">
            Live Voice Translator
          </h1>
          <p className="mt-1 text-xs text-[#a3a3a3]" aria-live="polite">
            {getShellStatusText(
              speechState.micStatus,
              translationState.isTranslating,
            )}
          </p>
        </div>

        <MicControl
          micStatus={speechState.micStatus}
          errorMessage={speechState.errorMessage}
          onStart={() => {
            void speechControls.start();
          }}
          onStop={speechControls.stop}
        />
      </header>

      <LanguagePicker
        sourceLanguage={sourceLanguage}
        targetLanguage={targetLanguage}
        onSourceLanguageChange={setSourceLanguage}
        onTargetLanguageChange={setTargetLanguage}
        onSwapLanguages={swapLanguages}
      />

      <section className="grid flex-1 gap-4 md:grid-cols-2">
        <TranscriptPanel
          finalTranscript={speechState.finalTranscript}
          partialTranscript={speechState.partialTranscript}
        />
        <TranslationPanel
          translatedText={translationState.translatedText}
          isTranslating={translationState.isTranslating}
          errorMessage={translationState.errorMessage}
        />
      </section>

      <SessionHistory history={translationState.history} />
    </div>
  );
}

function getShellStatusText(
  micStatus: string,
  isTranslating: boolean,
): string {
  if (isTranslating) {
    return "Translating the latest confirmed speech.";
  }

  if (micStatus === "listening") {
    return "Listening for speech.";
  }

  if (micStatus === "requesting") {
    return "Waiting for microphone permission.";
  }

  return "Choose languages, then start the microphone.";
}
