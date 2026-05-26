import { describe, expect, it } from "vitest";

import { createUserError } from "./errors";

describe("createUserError", () => {
  it("maps microphone permission errors to a short user-facing message", () => {
    const error = new DOMException("Permission details", "NotAllowedError");

    expect(createUserError(error)).toBe(
      "Microphone permission was denied. Check your browser settings.",
    );
  });

  it("maps network-like errors without exposing raw details", () => {
    const error = new TypeError(
      "fetch failed for https://provider.example/private?key=secret",
    );

    expect(createUserError(error)).toBe(
      "Network connection failed. Try again.",
    );
  });

  it("does not expose unknown error strings or stack details", () => {
    expect(createUserError("api_key=secret raw transcript")).toBe(
      "Something went wrong. Try again.",
    );
  });
});
