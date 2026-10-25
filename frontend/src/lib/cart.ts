"use client";

import { useSyncExternalStore } from "react";
import type { Product } from "./types";

export type CartProduct = Pick<
  Product,
  "id" | "name" | "price" | "unit" | "stock" | "emoji" | "image_url"
>;
export type CartLine = { product: CartProduct; quantity: number };

const STORAGE_KEY = "aof-cart-v1";
const EMPTY: CartLine[] = [];

let lines: CartLine[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function readStorage(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function ensureLoaded() {
  if (!loaded) {
    lines = readStorage();
    loaded = true;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function setLines(next: CartLine[]) {
  lines = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors; cart still works for this page view
  }
  emit();
}

function onStorage(e: StorageEvent) {
  // keep several open tabs in sync
  if (e.key === STORAGE_KEY) {
    lines = readStorage();
    emit();
  }
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  ensureLoaded();
  return lines;
}

function getServerSnapshot() {
  return EMPTY;
}

function toCartProduct(p: CartProduct): CartProduct {
  const { id, name, price, unit, stock, emoji, image_url } = p;
  return { id, name, price, unit, stock, emoji, image_url };
}

export const cartActions = {
  add(product: CartProduct, quantity = 1) {
    ensureLoaded();
    const existing = lines.find((l) => l.product.id === product.id);
    const max = Math.max(product.stock, 0);
    if (existing) {
      setLines(
        lines.map((l) =>
          l.product.id === product.id
            ? {
                product: toCartProduct(product),
                quantity: Math.min(l.quantity + quantity, max),
              }
            : l,
        ),
      );
    } else if (max > 0) {
      setLines([
        ...lines,
        { product: toCartProduct(product), quantity: Math.min(quantity, max) },
      ]);
    }
  },
  setQuantity(productId: string, quantity: number) {
    ensureLoaded();
    if (quantity <= 0) return cartActions.remove(productId);
    setLines(
      lines.map((l) =>
        l.product.id === productId
          ? { ...l, quantity: Math.min(quantity, l.product.stock) }
          : l,
      ),
    );
  },
  remove(productId: string) {
    ensureLoaded();
    setLines(lines.filter((l) => l.product.id !== productId));
  },
  clear() {
    setLines(EMPTY);
  },
};

export function useCart() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const count = items.reduce((sum, l) => sum + l.quantity, 0);
  const total = items.reduce((sum, l) => sum + l.quantity * l.product.price, 0);
  return { items, count, total, ...cartActions };
}
