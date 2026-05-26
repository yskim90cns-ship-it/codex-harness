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
  const providerUrl = process.env.TRANSLATION_API_URL;
  const providerKey = process.env.TRANSLATION_API_KEY;

  if (providerUrl && providerKey) {
    return new ProviderTranslationService(providerUrl, providerKey);
  }

  return new MockTranslationService();
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

function isProviderResponse(value: unknown): value is { translatedText: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "translatedText" in value &&
    typeof value.translatedText === "string"
  );
}
