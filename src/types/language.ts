export type LanguageCode = "ko" | "en" | "ja" | "zh" | "es";

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  speechRecognitionCode: string;
}
