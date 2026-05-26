import type { LanguageCode } from "./language";

export type MicStatus =
  | "idle"
  | "requesting"
  | "listening"
  | "denied"
  | "unsupported";

export interface SpeechSegment {
  id: string;
  text: string;
  isFinal: boolean;
  language: LanguageCode;
  createdAt: number;
}
