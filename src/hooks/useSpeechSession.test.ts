import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  initialSpeechSessionState,
  speechSessionReducer,
  useSpeechSession,
} from "./useSpeechSession";

type MockSpeechRecognitionEventMap = {
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: MockSpeechRecognitionEvent) => void) | null;
};

interface MockSpeechRecognitionEvent {
  resultIndex: number;
  results: Array<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
}

class MockSpeechRecognition implements MockSpeechRecognitionEventMap {
  static instances: MockSpeechRecognition[] = [];

  continuous = false;
  interimResults = false;
  lang = "";
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onresult: ((event: MockSpeechRecognitionEvent) => void) | null = null;
  start = vi.fn(() => {
    this.onstart?.();
  });
  stop = vi.fn(() => {
    this.onend?.();
  });
  abort = vi.fn();

  constructor() {
    MockSpeechRecognition.instances.push(this);
  }
}

describe("speechSessionReducer", () => {
  it("keeps partial and final transcripts separate", () => {
    const partialState = speechSessionReducer(initialSpeechSessionState, {
      type: "speech_result",
      partialTranscript: "hello wor",
      finalTranscript: "",
      now: 100,
    });

    expect(partialState.partialTranscript).toBe("hello wor");
    expect(partialState.finalTranscript).toBe("");
    expect(partialState.lastUpdatedAt).toBe(100);

    const finalState = speechSessionReducer(partialState, {
      type: "speech_result",
      partialTranscript: "",
      finalTranscript: "hello world",
      now: 200,
    });

    expect(finalState.partialTranscript).toBe("");
    expect(finalState.finalTranscript).toBe("hello world");
    expect(finalState.lastUpdatedAt).toBe(200);
  });

  it("maps permission errors to denied status", () => {
    const state = speechSessionReducer(initialSpeechSessionState, {
      type: "error",
      micStatus: "denied",
      errorMessage: "Microphone permission was denied. Check your browser settings.",
    });

    expect(state.micStatus).toBe("denied");
    expect(state.errorMessage).toBe(
      "Microphone permission was denied. Check your browser settings.",
    );
  });
});

describe("useSpeechSession", () => {
  beforeEach(() => {
    MockSpeechRecognition.instances = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sets unsupported when browser speech recognition is unavailable", async () => {
    vi.stubGlobal("SpeechRecognition", undefined);
    vi.stubGlobal("webkitSpeechRecognition", undefined);

    const { result } = renderHook(() => useSpeechSession("en"));

    await waitFor(() => {
      expect(result.current.state.micStatus).toBe("unsupported");
    });
  });

  it("creates and starts recognition only when start is called", async () => {
    vi.stubGlobal("SpeechRecognition", MockSpeechRecognition);
    vi.stubGlobal("webkitSpeechRecognition", undefined);

    const { result } = renderHook(() => useSpeechSession("ko"));

    expect(MockSpeechRecognition.instances).toHaveLength(0);

    await act(async () => {
      await result.current.controls.start();
    });

    expect(MockSpeechRecognition.instances).toHaveLength(1);
    expect(MockSpeechRecognition.instances[0]?.lang).toBe("ko-KR");
    expect(MockSpeechRecognition.instances[0]?.continuous).toBe(true);
    expect(MockSpeechRecognition.instances[0]?.interimResults).toBe(true);
    expect(MockSpeechRecognition.instances[0]?.start).toHaveBeenCalledOnce();
    expect(result.current.state.micStatus).toBe("listening");
  });

  it("updates partial and final transcripts from recognition results", async () => {
    vi.stubGlobal("SpeechRecognition", MockSpeechRecognition);

    const { result } = renderHook(() => useSpeechSession("en"));

    await act(async () => {
      await result.current.controls.start();
    });

    const recognition = MockSpeechRecognition.instances[0];

    act(() => {
      recognition?.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: false, 0: { transcript: "hello" } }],
      });
    });

    expect(result.current.state.partialTranscript).toBe("hello");
    expect(result.current.state.finalTranscript).toBe("");

    act(() => {
      recognition?.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: "hello world" } }],
      });
    });

    expect(result.current.state.partialTranscript).toBe("");
    expect(result.current.state.finalTranscript).toBe("hello world");
  });

  it("stops recognition cleanly", async () => {
    vi.stubGlobal("SpeechRecognition", MockSpeechRecognition);

    const { result } = renderHook(() => useSpeechSession("en"));

    await act(async () => {
      await result.current.controls.start();
    });

    const recognition = MockSpeechRecognition.instances[0];

    act(() => {
      result.current.controls.stop();
    });

    expect(recognition?.stop).toHaveBeenCalledOnce();
    expect(result.current.state.micStatus).toBe("idle");
  });
});
