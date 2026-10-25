"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import type { CustomerSession } from "./types";

/**
 * Customer sign-in state, kept in localStorage so shoppers stay signed in
 * across reloads and tabs (the backend token lasts 7 days).
 */
export type AuthState =
  | { status: "loading" } // server render / hydration: storage not readable yet
  | { status: "signed-out" }
  | { status: "signed-in"; session: CustomerSession };

const STORAGE_KEY = "aof-customer-session-v1";
const LOADING: AuthState = { status: "loading" };
const SIGNED_OUT: AuthState = { status: "signed-out" };

const listeners = new Set<() => void>();
// useSyncExternalStore needs the same object back while nothing changed.
let cachedRaw: string | null | undefined;
let cachedState: AuthState = SIGNED_OUT;

function isSession(value: unknown): value is CustomerSession {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const c = v.customer as Record<string, unknown> | null | undefined;
  return (
    typeof v.access_token === "string" &&
    typeof c === "object" &&
    c !== null &&
    typeof c.id === "string" &&
    typeof c.name === "string" &&
    typeof c.email === "string" &&
    typeof c.phone === "string"
  );
}

/** True when the token is a JWT whose `exp` has passed (mock tokens never expire). */
function isExpired(token: string): boolean {
  const payload = token.split(".")[1];
  if (!payload) return false;
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const { exp } = JSON.parse(json) as { exp?: unknown };
    return typeof exp === "number" && exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): AuthState {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    let parsed: unknown = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      // corrupted entry: treat as signed out
    }
    cachedState =
      isSession(parsed) && !isExpired(parsed.access_token)
        ? { status: "signed-in", session: parsed }
        : SIGNED_OUT;
  }
  return cachedState;
}

function emit() {
  for (const listener of listeners) listener();
}

function onStorage(e: StorageEvent) {
  if (e.key === STORAGE_KEY) emit(); // signed in or out in another tab
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function getSession(): CustomerSession | null {
  const state = getSnapshot();
  return state.status === "signed-in" ? state.session : null;
}

export function setSession(session: CustomerSession | null) {
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage blocked: the session lasts until this page is closed
  }
  emit();
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, getSnapshot, () => LOADING);
}

/**
 * Where to go after login. Only same-site paths are allowed, so a crafted
 * `?next=https://evil.example` link can't send the shopper elsewhere.
 */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (next.startsWith("/login") || next.startsWith("/register")) return "/";
  return next;
}

export function loginHref(next: string): string {
  return `/login?next=${encodeURIComponent(safeNext(next))}`;
}

/**
 * For pages that need a signed-in customer (cart, checkout): returns the
 * session, or null while loading / redirecting to the login page.
 */
export function useRequireCustomer(): CustomerSession | null {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (auth.status === "signed-out") router.replace(loginHref(pathname));
  }, [auth.status, pathname, router]);

  return auth.status === "signed-in" ? auth.session : null;
}
