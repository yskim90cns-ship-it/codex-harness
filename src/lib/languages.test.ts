import { describe, expect, it } from "vitest";

import {
  SUPPORTED_LANGUAGES,
  getLanguageByCode,
  isSupportedLanguageCode,
} from "./languages";
import type { LanguageCode, LanguageOption } from "../types/language";

describe("language utilities", () => {
  it("defines the MVP supported languages with speech recognition codes", () => {
    expect(SUPPORTED_LANGUAGES).toEqual<LanguageOption[]>([
      { code: "ko", label: "Korean", speechRecognitionCode: "ko-KR" },
      { code: "en", label: "English", speechRecognitionCode: "en-US" },
      { code: "ja", label: "Japanese", speechRecognitionCode: "ja-JP" },
      { code: "zh", label: "Chinese", speechRecognitionCode: "zh-CN" },
      { code: "es", label: "Spanish", speechRecognitionCode: "es-ES" },
    ]);
  });

  it("returns a language option by code", () => {
    expect(getLanguageByCode("ja")).toEqual({
      code: "ja",
      label: "Japanese",
      speechRecognitionCode: "ja-JP",
    });
  });

  it("returns undefined for unknown language codes", () => {
    expect(getLanguageByCode("fr" as LanguageCode)).toBeUndefined();
  });

  it("narrows unknown values to supported language codes", () => {
    const value: unknown = "ko";

    expect(isSupportedLanguageCode(value)).toBe(true);

    if (isSupportedLanguageCode(value)) {
      const code: LanguageCode = value;
      expect(code).toBe("ko");
    }

    expect(isSupportedLanguageCode("fr")).toBe(false);
    expect(isSupportedLanguageCode(null)).toBe(false);
  });
});
