"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";

import { createUserError } from "../lib/errors";
import { getLanguageByCode } from "../lib/languages";
import type { LanguageCode } from "../types/language";
import type { MicStatus } from "../types/speech";

export interface SpeechSessionState {
  micStatus: MicStatus;
  partialTranscript: string;
  finalTranscript: string;
  errorMessage: string | null;
  lastUpdatedAt: number | null;
}

export interface SpeechSessionControls {
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

type SpeechSessionAction =
  | { type: "unsupported"; errorMessage: string }
  | { type: "requesting" }
  | { type: "listening" }
  | { type: "stop" }
  | {
      type: "speech_result";
      partialTranscript: string;
      finalTranscript: string;
      now: number;
    }
  | { type: "error"; micStatus: MicStatus; errorMessage: string }
  | { type: "reset" };

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionResultEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface BrowserSpeechRecognitionErrorEvent {
  error: string;
}

interface BrowserSpeechRecognitionResultEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: BrowserSpeechRecognitionResult;
  };
}

interface BrowserSpeechRecognitionResult {
  isFinal: boolean;
  0: {
    transcript: string;
  };
}

export const initialSpeechSessionState: SpeechSessionState = {
  micStatus: "idle",
  partialTranscript: "",
  finalTranscript: "",
  errorMessage: null,
  lastUpdatedAt: null,
};

export function speechSessionReducer(
  state: SpeechSessionState,
  action: SpeechSessionAction,
): SpeechSessionState {
  switch (action.type) {
    case "unsupported":
      return {
        ...state,
        micStatus: "unsupported",
        errorMessage: action.errorMessage,
      };
    case "requesting":
      return {
        ...state,
        micStatus: "requesting",
        errorMessage: null,
      };
    case "listening":
      return {
        ...state,
        micStatus: "listening",
        errorMessage: null,
      };
    case "stop":
      return {
        ...state,
        micStatus: "idle",
      };
    case "speech_result":
      return {
        ...state,
        partialTranscript: action.partialTranscript,
        finalTranscript: appendTranscript(
          state.finalTranscript,
          action.finalTranscript,
        ),
        errorMessage: null,
        lastUpdatedAt: action.now,
      };
    case "error":
      return {
        ...state,
        micStatus: action.micStatus,
        errorMessage: action.errorMessage,
      };
    case "reset":
      return initialSpeechSessionState;
  }
}

export function useSpeechSession(inputLanguage: LanguageCode): {
  state: SpeechSessionState;
  controls: SpeechSessionControls;
} {
  const [state, dispatch] = useReducer(
    speechSessionReducer,
    initialSpeechSessionState,
  );
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const manuallyStoppingRef = useRef(false);

  useEffect(() => {
    if (!getSpeechRecognitionConstructor()) {
      dispatch({
        type: "unsupported",
        errorMessage: createUserError({ name: "NotSupportedError" }),
      });
    }
  }, []);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = getSpeechRecognitionLanguage(inputLanguage);
    }
  }, [inputLanguage]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    manuallyStoppingRef.current = true;
    recognitionRef.current?.stop();
    dispatch({ type: "stop" });
  }, []);

  const start = useCallback(async () => {
    const Recognition = getSpeechRecognitionConstructor();

    if (!Recognition) {
      dispatch({
        type: "unsupported",
        errorMessage: createUserError({ name: "NotSupportedError" }),
      });
      return;
    }

    dispatch({ type: "requesting" });

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = getSpeechRecognitionLanguage(inputLanguage);
    recognition.onstart = () => {
      dispatch({ type: "listening" });
    };
    recognition.onend = () => {
      manuallyStoppingRef.current = false;
      dispatch({ type: "stop" });
    };
    recognition.onerror = (event) => {
      const micStatus = getMicStatusForRecognitionError(event.error);
      dispatch({
        type: "error",
        micStatus,
        errorMessage: getRecognitionErrorMessage(event.error),
      });
    };
    recognition.onresult = (event) => {
      const result = readRecognitionResult(event);
      dispatch({
        type: "speech_result",
        partialTranscript: result.partialTranscript,
        finalTranscript: result.finalTranscript,
        now: Date.now(),
      });
    };
    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      dispatch({
        type: "error",
        micStatus: "idle",
        errorMessage: createUserError(error),
      });
    }
  }, [inputLanguage]);

  const reset = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    manuallyStoppingRef.current = false;
    dispatch({ type: "reset" });
  }, []);

  return {
    state,
    controls: {
      start,
      stop,
      reset,
    },
  };
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  const speechGlobal = globalThis as typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return (
    speechGlobal.SpeechRecognition ?? speechGlobal.webkitSpeechRecognition ?? null
  );
}

function getSpeechRecognitionLanguage(inputLanguage: LanguageCode): string {
  return getLanguageByCode(inputLanguage)?.speechRecognitionCode ?? inputLanguage;
}

function readRecognitionResult(event: BrowserSpeechRecognitionResultEvent): {
  partialTranscript: string;
  finalTranscript: string;
} {
  const partialParts: string[] = [];
  const finalParts: string[] = [];

  for (let index = event.resultIndex; index < event.results.length; index += 1) {
    const result = event.results[index];
    const transcript = result?.[0]?.transcript.trim();

    if (!transcript) {
      continue;
    }

    if (result.isFinal) {
      finalParts.push(transcript);
    } else {
      partialParts.push(transcript);
    }
  }

  return {
    partialTranscript: partialParts.join(" "),
    finalTranscript: finalParts.join(" "),
  };
}

function appendTranscript(existingTranscript: string, nextTranscript: string): string {
  if (!nextTranscript) {
    return existingTranscript;
  }

  if (!existingTranscript) {
    return nextTranscript;
  }

  return `${existingTranscript} ${nextTranscript}`;
}

function getMicStatusForRecognitionError(error: string): MicStatus {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "denied";
  }

  return "idle";
}

function getRecognitionErrorMessage(error: string): string {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return createUserError({ name: "NotAllowedError" });
  }

  if (error === "audio-capture") {
    return createUserError({ name: "NotFoundError" });
  }

  return "Speech recognition stopped. Try again.";
}
