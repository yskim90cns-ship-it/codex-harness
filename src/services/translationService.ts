import { getLanguageByCode } from "../lib/languages";
import type { LanguageCode } from "../types/language";

export interface TranslationServiceInput {
  text: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
}

export interface TranslationService {
  translate(input: TranslationServiceInput): Promise<string>;
}

export class TranslationProviderError extends Error {
  constructor() {
    super("Translation provider failed. Try again.");
    this.name = "TranslationProviderError";
  }
}

export function createTranslationService(): TranslationService {
  const providerMode = process.env.TRANSLATION_PROVIDER;
  const providerUrl = process.env.TRANSLATION_API_URL;
  const providerKey = process.env.TRANSLATION_API_KEY;

  if (providerMode === "mock") {
    return new MockTranslationService();
  }

  if (providerUrl && providerKey) {
    return new ProviderTranslationService(providerUrl, providerKey);
  }

  return new MyMemoryTranslationService(
    providerUrl?.trim() || "https://api.mymemory.translated.net/get",
  );
}

class MockTranslationService implements TranslationService {
  async translate(input: TranslationServiceInput): Promise<string> {
    if (input.sourceLanguage === input.targetLanguage) {
      return input.text;
    }

    const targetLanguage = getLanguageByCode(input.targetLanguage);
    return `[${targetLanguage?.label ?? input.targetLanguage}] ${input.text}`;
  }
}

class ProviderTranslationService implements TranslationService {
  constructor(
    private readonly providerUrl: string,
    private readonly providerKey: string,
  ) {}

  async translate(input: TranslationServiceInput): Promise<string> {
    if (input.sourceLanguage === input.targetLanguage) {
      return input.text;
    }

    const response = await fetch(this.providerUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.providerKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new TranslationProviderError();
    }

    const body: unknown = await response.json();

    if (!isProviderResponse(body)) {
      throw new TranslationProviderError();
    }

    return body.translatedText;
  }
}

class MyMemoryTranslationService implements TranslationService {
  constructor(private readonly providerUrl: string) {}

  async translate(input: TranslationServiceInput): Promise<string> {
    if (input.sourceLanguage === input.targetLanguage) {
      return input.text;
    }

    const url = new URL(this.providerUrl);
    url.searchParams.set("q", input.text);
    url.searchParams.set(
      "langpair",
      `${toProviderLanguageCode(input.sourceLanguage)}|${toProviderLanguageCode(
        input.targetLanguage,
      )}`,
    );

    const response = await fetch(url);

    if (!response.ok) {
      throw new TranslationProviderError();
    }

    const body: unknown = await response.json();

    if (!isMyMemoryResponse(body)) {
      throw new TranslationProviderError();
    }

    return body.responseData.translatedText;
  }
}

function isProviderResponse(value: unknown): value is { translatedText: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "translatedText" in value &&
    typeof value.translatedText === "string"
  );
}

function isMyMemoryResponse(
  value: unknown,
): value is { responseData: { translatedText: string } } {
  if (typeof value !== "object" || value === null || !("responseData" in value)) {
    return false;
  }

  const responseData = value.responseData;

  return (
    typeof responseData === "object" &&
    responseData !== null &&
    "translatedText" in responseData &&
    typeof responseData.translatedText === "string"
  );
}

function toProviderLanguageCode(code: LanguageCode): string {
  if (code === "zh") {
    return "zh-CN";
  }

  return code;
}
