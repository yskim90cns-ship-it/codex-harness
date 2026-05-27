import { afterEach, describe, expect, it, vi } from "vitest";

import { createTranslationService } from "./translationService";

describe("createTranslationService", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("calls the default public translation provider when no custom provider is configured", async () => {
    vi.stubEnv("TRANSLATION_API_URL", "");
    vi.stubEnv("TRANSLATION_API_KEY", "");
    vi.stubEnv("TRANSLATION_PROVIDER", "");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ responseData: { translatedText: "안녕하세요" } }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const service = createTranslationService();

    await expect(
      service.translate({
        text: "hello there",
        sourceLanguage: "en",
        targetLanguage: "ko",
      }),
    ).resolves.toBe("안녕하세요");

    const requestedUrl = fetchMock.mock.calls[0]?.[0];

    expect(requestedUrl).toBeInstanceOf(URL);
    expect((requestedUrl as URL).origin).toBe("https://api.mymemory.translated.net");
    expect((requestedUrl as URL).searchParams.get("q")).toBe("hello there");
    expect((requestedUrl as URL).searchParams.get("langpair")).toBe("en|ko");
  });

  it("can use the deterministic mock translator for offline demos", async () => {
    vi.stubEnv("TRANSLATION_PROVIDER", "mock");
    vi.stubEnv("TRANSLATION_API_URL", "");
    vi.stubEnv("TRANSLATION_API_KEY", "");

    const service = createTranslationService();

    await expect(
      service.translate({
        text: "hello",
        sourceLanguage: "en",
        targetLanguage: "ko",
      }),
    ).resolves.toBe("[Korean] hello");
  });

  it("returns the original text without calling a provider for same-language translation", async () => {
    const fetchMock = vi.fn();
    vi.stubEnv("TRANSLATION_API_URL", "https://provider.example/translate");
    vi.stubEnv("TRANSLATION_API_KEY", "secret");
    vi.stubGlobal("fetch", fetchMock);

    const service = createTranslationService();

    await expect(
      service.translate({
        text: "같은 언어",
        sourceLanguage: "ko",
        targetLanguage: "ko",
      }),
    ).resolves.toBe("같은 언어");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls the configured provider and returns translatedText", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ translatedText: "안녕하세요" }), {
        status: 200,
      }),
    );
    vi.stubEnv("TRANSLATION_API_URL", "https://provider.example/translate");
    vi.stubEnv("TRANSLATION_API_KEY", "secret");
    vi.stubGlobal("fetch", fetchMock);

    const service = createTranslationService();

    await expect(
      service.translate({
        text: "hello",
        sourceLanguage: "en",
        targetLanguage: "ko",
      }),
    ).resolves.toBe("안녕하세요");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://provider.example/translate",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer secret",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("maps default provider failures to a short error without exposing input text", async () => {
    vi.stubEnv("TRANSLATION_API_URL", "");
    vi.stubEnv("TRANSLATION_API_KEY", "");
    vi.stubEnv("TRANSLATION_PROVIDER", "");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ responseData: {} }), {
          status: 200,
        }),
      ),
    );

    const service = createTranslationService();

    await expect(
      service.translate({
        text: "private transcript",
        sourceLanguage: "en",
        targetLanguage: "ko",
      }),
    ).rejects.toThrow("Translation provider failed. Try again.");
  });

  it("maps provider failures to a short error without exposing input text", async () => {
    vi.stubEnv("TRANSLATION_API_URL", "https://provider.example/translate");
    vi.stubEnv("TRANSLATION_API_KEY", "secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("provider failed while translating private transcript", {
          status: 500,
        }),
      ),
    );

    const service = createTranslationService();

    await expect(
      service.translate({
        text: "private transcript",
        sourceLanguage: "en",
        targetLanguage: "ko",
      }),
    ).rejects.toThrow("Translation provider failed. Try again.");
  });
});
