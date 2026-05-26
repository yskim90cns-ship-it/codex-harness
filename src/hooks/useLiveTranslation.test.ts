import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useLiveTranslation } from "./useLiveTranslation";

describe("useLiveTranslation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not request translation for empty final transcript", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useLiveTranslation({
        sourceLanguage: "en",
        targetLanguage: "ko",
        finalTranscript: "   ",
      }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.translatedText).toBe("");
    expect(result.current.history).toEqual([]);
  });

  it("calls the server translate route and stores the translated result in memory", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ translatedText: "안녕하세요" }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useLiveTranslation({
        sourceLanguage: "en",
        targetLanguage: "ko",
        finalTranscript: "hello",
      }),
    );

    await waitFor(() => {
      expect(result.current.translatedText).toBe("안녕하세요");
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/translate",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "hello",
          sourceLanguage: "en",
          targetLanguage: "ko",
        }),
      }),
    );
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0]).toMatchObject({
      sourceText: "hello",
      translatedText: "안녕하세요",
      sourceLanguage: "en",
      targetLanguage: "ko",
    });
  });

  it("only applies the latest response when translation requests overlap", async () => {
    const first = createDeferredResponse("첫 번째");
    const second = createDeferredResponse("두 번째");
    const fetchMock = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(
      ({ finalTranscript }) =>
        useLiveTranslation({
          sourceLanguage: "en",
          targetLanguage: "ko",
          finalTranscript,
        }),
      { initialProps: { finalTranscript: "first" } },
    );

    rerender({ finalTranscript: "second" });

    second.resolve();

    await waitFor(() => {
      expect(result.current.translatedText).toBe("두 번째");
    });

    first.resolve();

    await waitFor(() => {
      expect(result.current.isTranslating).toBe(false);
    });

    expect(result.current.translatedText).toBe("두 번째");
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0]?.sourceText).toBe("second");
  });

  it("ignores an in-flight response when the final transcript is cleared", async () => {
    const deferred = createDeferredResponse("오래된 응답");
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(deferred.promise));

    const { result, rerender } = renderHook(
      ({ finalTranscript }) =>
        useLiveTranslation({
          sourceLanguage: "en",
          targetLanguage: "ko",
          finalTranscript,
        }),
      { initialProps: { finalTranscript: "stale" } },
    );

    await waitFor(() => {
      expect(result.current.isTranslating).toBe(true);
    });

    rerender({ finalTranscript: "" });
    deferred.resolve();

    await waitFor(() => {
      expect(result.current.isTranslating).toBe(false);
    });

    expect(result.current.translatedText).toBe("");
    expect(result.current.history).toEqual([]);
  });

  it("maps failed server responses without exposing transcript text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Translation failed. Try again." }), {
          status: 500,
        }),
      ),
    );

    const { result } = renderHook(() =>
      useLiveTranslation({
        sourceLanguage: "en",
        targetLanguage: "ko",
        finalTranscript: "private transcript",
      }),
    );

    await waitFor(() => {
      expect(result.current.errorMessage).toBe("Translation failed. Try again.");
    });

    expect(result.current.errorMessage).not.toContain("private transcript");
  });
});

function createDeferredResponse(translatedText: string): {
  promise: Promise<Response>;
  resolve: () => void;
} {
  let resolve: () => void = () => undefined;
  const promise = new Promise<Response>((promiseResolve) => {
    resolve = () => {
      promiseResolve(
        new Response(JSON.stringify({ translatedText }), {
          status: 200,
        }),
      );
    };
  });

  return { promise, resolve };
}
