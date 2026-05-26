"use client";

import { useEffect, useRef, useState } from "react";

import type { LanguageCode } from "../types/language";
import type { TranslateResponseBody, TranslationPair } from "../types/translation";

export interface LiveTranslationState {
  translatedText: string;
  isTranslating: boolean;
  errorMessage: string | null;
  history: TranslationPair[];
}

interface UseLiveTranslationParams {
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  finalTranscript: string;
}

interface TranslateErrorResponseBody {
  error: string;
}

const DEFAULT_TRANSLATION_ERROR = "Translation failed. Try again.";

export function useLiveTranslation(
  params: UseLiveTranslationParams,
): LiveTranslationState {
  const { sourceLanguage, targetLanguage, finalTranscript } = params;
  const [state, setState] = useState<LiveTranslationState>({
    translatedText: "",
    isTranslating: false,
    errorMessage: null,
    history: [],
  });
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    const text = finalTranscript.trim();

    if (!text) {
      latestRequestIdRef.current += 1;
      setState((current) => ({
        ...current,
        isTranslating: false,
        errorMessage: null,
      }));
      return;
    }

    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    setState((current) => ({
      ...current,
      isTranslating: true,
      errorMessage: null,
    }));

    void translateText({
      text,
      sourceLanguage,
      targetLanguage,
    })
      .then((translatedText) => {
        if (latestRequestIdRef.current !== requestId) {
          return;
        }

        const pair: TranslationPair = {
          id: `${Date.now()}-${requestId}`,
          sourceText: text,
          translatedText,
          sourceLanguage,
          targetLanguage,
          createdAt: Date.now(),
        };

        setState((current) => ({
          translatedText,
          isTranslating: false,
          errorMessage: null,
          history: [pair, ...current.history],
        }));
      })
      .catch((error: unknown) => {
        if (latestRequestIdRef.current !== requestId) {
          return;
        }

        setState((current) => ({
          ...current,
          isTranslating: false,
          errorMessage:
            error instanceof Error ? error.message : DEFAULT_TRANSLATION_ERROR,
        }));
      });
  }, [finalTranscript, sourceLanguage, targetLanguage]);

  return state;
}

async function translateText(input: {
  text: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
}): Promise<string> {
  const response = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(readErrorMessage(body));
  }

  if (!isTranslateResponseBody(body)) {
    throw new Error(DEFAULT_TRANSLATION_ERROR);
  }

  return body.translatedText;
}

function readErrorMessage(body: unknown): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as TranslateErrorResponseBody).error === "string"
  ) {
    return (body as TranslateErrorResponseBody).error;
  }

  return DEFAULT_TRANSLATION_ERROR;
}

function isTranslateResponseBody(body: unknown): body is TranslateResponseBody {
  return (
    typeof body === "object" &&
    body !== null &&
    "translatedText" in body &&
    typeof body.translatedText === "string"
  );
}
