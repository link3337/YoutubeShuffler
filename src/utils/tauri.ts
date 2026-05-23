import { invoke } from '@tauri-apps/api/core';

export const safeInvoke = async <T>(command: string, args?: Record<string, unknown>) => {
  if (typeof window === 'undefined') {
    return undefined as T | undefined;
  }

  const legacyTauriInvoke = (
    window as {
      __TAURI__?: {
        core?: { invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<T> };
      };
    }
  ).__TAURI__?.core?.invoke;

  const hasTauriRuntime =
    Boolean((window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) ||
    Boolean(legacyTauriInvoke);

  if (!hasTauriRuntime) {
    return undefined as T | undefined;
  }

  if (legacyTauriInvoke) {
    return legacyTauriInvoke(command, args);
  }

  return invoke<T>(command, args);
};
