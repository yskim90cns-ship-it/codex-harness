import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

describe("POST /api/translate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns 400 for empty text", async () => {
    const response = await POST(
      jsonRequest({
        text: "   ",
        sourceLanguage: "en",
        targetLanguage: "ko",
      }),
    );

    await expect(response.json()).resolves.toEqual({
      error: "Text is required.",
    });
    expect(response.status).toBe(400);
  });

  it("returns 400 for malformed JSON bodies", async () => {
    const response = await POST(
      new Request("http://localhost/api/translate", {
        method: "POST",
        body: "{",
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    await expect(response.json()).resolves.toEqual({
      error: "Invalid request body.",
    });
    expect(response.status).toBe(400);
  });

  it("returns 400 for unsupported language codes", async () => {
    const response = await POST(
      jsonRequest({
        text: "hello",
        sourceLanguage: "fr",
        targetLanguage: "ko",
      }),
    );

    await expect(response.json()).resolves.toEqual({
      error: "Unsupported language code.",
    });
    expect(response.status).toBe(400);
  });

  it("returns the input text for same-language requests without provider calls", async () => {
    const fetchMock = vi.fn();
    vi.stubEnv("TRANSLATION_API_URL", "https://provider.example/translate");
    vi.stubEnv("TRANSLATION_API_KEY", "secret");
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      jsonRequest({
        text: "hello",
        sourceLanguage: "en",
        targetLanguage: "en",
      }),
    );

    await expect(response.json()).resolves.toEqual({
      translatedText: "hello",
    });
    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns mock translation when no provider is configured", async () => {
    vi.stubEnv("TRANSLATION_API_URL", "");
    vi.stubEnv("TRANSLATION_API_KEY", "");

    const response = await POST(
      jsonRequest({
        text: "hello",
        sourceLanguage: "en",
        targetLanguage: "ko",
      }),
    );

    await expect(response.json()).resolves.toEqual({
      translatedText: "[Korean] hello",
    });
    expect(response.status).toBe(200);
  });

  it("returns provider translations", async () => {
    vi.stubEnv("TRANSLATION_API_URL", "https://provider.example/translate");
    vi.stubEnv("TRANSLATION_API_KEY", "secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ translatedText: "Hola" }), {
          status: 200,
        }),
      ),
    );

    const response = await POST(
      jsonRequest({
        text: "hello",
        sourceLanguage: "en",
        targetLanguage: "es",
      }),
    );

    await expect(response.json()).resolves.toEqual({
      translatedText: "Hola",
    });
    expect(response.status).toBe(200);
  });

  it("maps provider errors without exposing text", async () => {
    vi.stubEnv("TRANSLATION_API_URL", "https://provider.example/translate");
    vi.stubEnv("TRANSLATION_API_KEY", "secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("private transcript", { status: 503 })),
    );

    const response = await POST(
      jsonRequest({
        text: "private transcript",
        sourceLanguage: "en",
        targetLanguage: "ko",
      }),
    );

    await expect(response.json()).resolves.toEqual({
      error: "Translation provider failed. Try again.",
    });
    expect(response.status).toBe(502);
  });
});

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/translate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });
}
