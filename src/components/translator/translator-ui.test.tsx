import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { LiveTranslationState } from "../../hooks/useLiveTranslation";
import type { SpeechSessionState } from "../../hooks/useSpeechSession";
import { useLiveTranslation } from "../../hooks/useLiveTranslation";
import { useSpeechSession } from "../../hooks/useSpeechSession";
import { LanguagePicker } from "./LanguagePicker";
import { MicControl } from "./MicControl";
import { SessionHistory } from "./SessionHistory";
import { TranslationPanel } from "./TranslationPanel";
import { TranslatorShell } from "./TranslatorShell";
import { TranscriptPanel } from "./TranscriptPanel";

vi.mock("../../hooks/useSpeechSession", () => ({
  useSpeechSession: vi.fn(),
}));

vi.mock("../../hooks/useLiveTranslation", () => ({
  useLiveTranslation: vi.fn(),
}));

const mockedUseSpeechSession = vi.mocked(useSpeechSession);
const mockedUseLiveTranslation = vi.mocked(useLiveTranslation);

describe("LanguagePicker", () => {
  it("renders supported language selectors and swaps languages", () => {
    const onSourceLanguageChange = vi.fn();
    const onTargetLanguageChange = vi.fn();
    const onSwapLanguages = vi.fn();

    render(
      <LanguagePicker
        sourceLanguage="ko"
        targetLanguage="en"
        onSourceLanguageChange={onSourceLanguageChange}
        onTargetLanguageChange={onTargetLanguageChange}
        onSwapLanguages={onSwapLanguages}
      />,
    );

    fireEvent.change(screen.getByLabelText("From"), {
      target: { value: "ja" },
    });
    fireEvent.change(screen.getByLabelText("To"), {
      target: { value: "es" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Swap languages" }));

    expect(onSourceLanguageChange).toHaveBeenCalledWith("ja");
    expect(onTargetLanguageChange).toHaveBeenCalledWith("es");
    expect(onSwapLanguages).toHaveBeenCalledOnce();
  });
});

describe("MicControl", () => {
  it("shows listening status and stop action", () => {
    render(
      <MicControl
        micStatus="listening"
        errorMessage={null}
        onStart={vi.fn()}
        onStop={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
    expect(screen.getByText("Listening")).toBeInTheDocument();
  });

  it("disables duplicate permission requests while requesting", () => {
    render(
      <MicControl
        micStatus="requesting"
        errorMessage={null}
        onStart={vi.fn()}
        onStop={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Request permission" }),
    ).toBeDisabled();
  });

  it("renders permission and unsupported errors accessibly", () => {
    render(
      <MicControl
        micStatus="denied"
        errorMessage="Microphone permission was denied. Check your browser settings."
        onStart={vi.fn()}
        onStop={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Microphone permission was denied",
    );
    expect(
      screen.getByRole("button", { name: "Request permission" }),
    ).toBeInTheDocument();
  });
});

describe("subtitle panels", () => {
  it("shows final and partial transcript separately", () => {
    render(
      <TranscriptPanel
        finalTranscript="Hello world"
        partialTranscript="this is still partial"
      />,
    );

    expect(screen.getByText("Hello world")).toHaveClass("text-[#f5f5f5]");
    expect(screen.getByText("this is still partial")).toHaveClass(
      "text-[#737373]",
    );
  });

  it("keeps translation visible while a newer request is translating", () => {
    render(
      <TranslationPanel
        translatedText="안녕하세요"
        isTranslating={true}
        errorMessage={null}
      />,
    );

    expect(screen.getByText("안녕하세요")).toBeInTheDocument();
    expect(screen.getByText("Translating")).toBeInTheDocument();
  });

  it("shows translation errors without removing existing text", () => {
    render(
      <TranslationPanel
        translatedText="안녕하세요"
        isTranslating={false}
        errorMessage="Translation failed. Try again."
      />,
    );

    expect(screen.getByText("안녕하세요")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Translation failed. Try again.",
    );
  });
});

describe("SessionHistory", () => {
  it("renders recent translation pairs in memory", () => {
    render(
      <SessionHistory
        history={[
          {
            id: "pair-1",
            sourceText: "Hello",
            translatedText: "안녕하세요",
            sourceLanguage: "en",
            targetLanguage: "ko",
            createdAt: 100,
          },
        ]}
      />,
    );

    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("안녕하세요")).toBeInTheDocument();
  });
});

describe("TranslatorShell", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("wires language selection, microphone controls, panels, and history", () => {
    const start = vi.fn();
    const stop = vi.fn();

    mockedUseSpeechSession.mockReturnValue({
      state: createSpeechState({
        micStatus: "idle",
        finalTranscript: "Hello",
        partialTranscript: "world",
      }),
      controls: {
        start,
        stop,
        reset: vi.fn(),
      },
    });
    mockedUseLiveTranslation.mockReturnValue(
      createTranslationState({
        translatedText: "안녕하세요",
        history: [
          {
            id: "pair-1",
            sourceText: "Hello",
            translatedText: "안녕하세요",
            sourceLanguage: "ko",
            targetLanguage: "en",
            createdAt: 100,
          },
        ],
      }),
    );

    render(<TranslatorShell />);

    fireEvent.click(screen.getByRole("button", { name: "Start" }));

    expect(start).toHaveBeenCalledOnce();
    expect(mockedUseSpeechSession).toHaveBeenLastCalledWith("ko");
    expect(mockedUseLiveTranslation).toHaveBeenLastCalledWith({
      sourceLanguage: "ko",
      targetLanguage: "en",
      finalTranscript: "Hello",
    });
    expect(screen.getByText("world")).toBeInTheDocument();
    expect(screen.getAllByText("안녕하세요")).toHaveLength(2);
  });

  it("passes swapped languages to the hooks", () => {
    mockedUseSpeechSession.mockReturnValue({
      state: createSpeechState({ finalTranscript: "Hello" }),
      controls: {
        start: vi.fn(),
        stop: vi.fn(),
        reset: vi.fn(),
      },
    });
    mockedUseLiveTranslation.mockReturnValue(createTranslationState());

    render(<TranslatorShell />);

    fireEvent.click(screen.getByRole("button", { name: "Swap languages" }));

    expect(mockedUseSpeechSession).toHaveBeenLastCalledWith("en");
    expect(mockedUseLiveTranslation).toHaveBeenLastCalledWith({
      sourceLanguage: "en",
      targetLanguage: "ko",
      finalTranscript: "Hello",
    });
  });
});

function createSpeechState(
  overrides: Partial<SpeechSessionState> = {},
): SpeechSessionState {
  return {
    micStatus: "idle",
    partialTranscript: "",
    finalTranscript: "",
    errorMessage: null,
    lastUpdatedAt: null,
    ...overrides,
  };
}

function createTranslationState(
  overrides: Partial<LiveTranslationState> = {},
): LiveTranslationState {
  return {
    translatedText: "",
    isTranslating: false,
    errorMessage: null,
    history: [],
    ...overrides,
  };
}
