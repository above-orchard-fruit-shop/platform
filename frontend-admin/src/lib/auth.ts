"use client";

import { useSyncExternalStore } from "react";

/**
 * Admin session token (JWT from the backend, or a mock token in mock mode).
 * Stored in sessionStorage so it is cleared when the browser tab is closed.
 */
const STORAGE_KEY = "aof-admin-token";
const listeners = new Set<() => void>();

export function getToken(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) window.sessionStorage.setItem(STORAGE_KEY, token);
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage blocked: session will not persist across reloads
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * `undefined` while rendering on the server / during hydration,
 * `null` when signed out, otherwise the token.
 */
export function useToken(): string | null | undefined {
  return useSyncExternalStore(subscribe, getToken, () => undefined);
}
