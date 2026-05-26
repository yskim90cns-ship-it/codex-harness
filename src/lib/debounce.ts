export interface DebouncedFunction<Args extends unknown[]> {
  (...args: Args): void;
  cancel: () => void;
  flush: () => void;
}

export function debounce<Args extends unknown[]>(
  callback: (...args: Args) => void,
  waitMs: number,
): DebouncedFunction<Args> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let latestArgs: Args | undefined;

  const clearPendingTimeout = (): void => {
    if (timeoutId === undefined) {
      return;
    }

    clearTimeout(timeoutId);
    timeoutId = undefined;
  };

  const run = (): void => {
    if (latestArgs === undefined) {
      return;
    }

    const args = latestArgs;
    latestArgs = undefined;
    timeoutId = undefined;
    callback(...args);
  };

  const debounced = ((...args: Args): void => {
    latestArgs = args;
    clearPendingTimeout();
    timeoutId = setTimeout(run, waitMs);
  }) as DebouncedFunction<Args>;

  debounced.cancel = (): void => {
    clearPendingTimeout();
    latestArgs = undefined;
  };

  debounced.flush = (): void => {
    clearPendingTimeout();
    run();
  };

  return debounced;
}
