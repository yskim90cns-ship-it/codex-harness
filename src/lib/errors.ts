const DEFAULT_ERROR_MESSAGE = "Something went wrong. Try again.";

export function createUserError(error: unknown): string {
  const errorName = getErrorName(error);

  if (errorName === "NotAllowedError" || errorName === "SecurityError") {
    return "Microphone permission was denied. Check your browser settings.";
  }

  if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
    return "No microphone was found.";
  }

  if (errorName === "NotSupportedError") {
    return "Speech recognition is not supported in this browser.";
  }

  if (errorName === "AbortError") {
    return "The request was interrupted. Try again.";
  }

  if (error instanceof TypeError) {
    return "Network connection failed. Try again.";
  }

  return DEFAULT_ERROR_MESSAGE;
}

function getErrorName(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof error.name === "string"
  ) {
    return error.name;
  }

  return undefined;
}
