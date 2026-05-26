import type { LanguageCode, LanguageOption } from "../types/language";

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "ko", label: "Korean", speechRecognitionCode: "ko-KR" },
  { code: "en", label: "English", speechRecognitionCode: "en-US" },
  { code: "ja", label: "Japanese", speechRecognitionCode: "ja-JP" },
  { code: "zh", label: "Chinese", speechRecognitionCode: "zh-CN" },
  { code: "es", label: "Spanish", speechRecognitionCode: "es-ES" },
];

export function getLanguageByCode(
  code: LanguageCode,
): LanguageOption | undefined {
  return SUPPORTED_LANGUAGES.find((language) => language.code === code);
}

export function isSupportedLanguageCode(
  value: unknown,
): value is LanguageCode {
  return (
    typeof value === "string" &&
    SUPPORTED_LANGUAGES.some((language) => language.code === value)
  );
}
