import type { LanguageCode } from "./language";

export interface TranslationPair {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  createdAt: number;
}

export interface TranslateRequestBody {
  text: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
}

export interface TranslateResponseBody {
  translatedText: string;
}
