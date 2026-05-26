import { NextResponse } from "next/server";

import { isSupportedLanguageCode } from "../../../lib/languages";
import {
  TranslationProviderError,
  createTranslationService,
} from "../../../services/translationService";
import type {
  TranslateRequestBody,
  TranslateResponseBody,
} from "../../../types/translation";

interface ErrorResponseBody {
  error: string;
}

export async function POST(
  request: Request,
): Promise<NextResponse<TranslateResponseBody | ErrorResponseBody>> {
  const body: unknown = await request.json().catch(() => null);
  const validation = validateTranslateRequest(body);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const service = createTranslationService();
    const translatedText = await service.translate(validation.body);

    return NextResponse.json({ translatedText });
  } catch (error) {
    if (error instanceof TranslationProviderError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json(
      { error: "Translation failed. Try again." },
      { status: 500 },
    );
  }
}

type ValidationResult =
  | { ok: true; body: TranslateRequestBody }
  | { ok: false; error: string };

function validateTranslateRequest(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid request body." };
  }

  const text = getObjectValue(body, "text");
  const sourceLanguage = getObjectValue(body, "sourceLanguage");
  const targetLanguage = getObjectValue(body, "targetLanguage");

  if (typeof text !== "string" || text.trim().length === 0) {
    return { ok: false, error: "Text is required." };
  }

  if (
    !isSupportedLanguageCode(sourceLanguage) ||
    !isSupportedLanguageCode(targetLanguage)
  ) {
    return { ok: false, error: "Unsupported language code." };
  }

  return {
    ok: true,
    body: {
      text,
      sourceLanguage,
      targetLanguage,
    },
  };
}

function getObjectValue(
  value: object,
  key: "text" | "sourceLanguage" | "targetLanguage",
): unknown {
  return (value as Record<string, unknown>)[key];
}
