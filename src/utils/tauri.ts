export const safeInvoke = async <T>(command: string, args?: Record<string, unknown>) => {
  if (typeof window === 'undefined') {
    return undefined as T | undefined;
  }

  const tauriInvoke = (
    window as {
      __TAURI__?: {
        core?: { invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<T> };
      };
    }
  ).__TAURI__?.core?.invoke;

  if (!tauriInvoke) {
    return undefined as T | undefined;
  }

  return tauriInvoke(command, args);
};
