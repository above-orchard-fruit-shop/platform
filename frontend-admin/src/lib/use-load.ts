"use client";

import { useEffect, useRef, useState } from "react";
import { errorMessage } from "./api";

type Result<T> = { token: string; data?: T; error?: string };

/**
 * Runs an async loader whenever `key` changes (or `reload()` is called).
 * `data` keeps the last successful value while a reload is in flight.
 */
export function useLoad<T>(loader: () => Promise<T>, key: string = "") {
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });

  const [reloads, setReloads] = useState(0);
  const token = `${key}#${reloads}`;
  const [result, setResult] = useState<Result<T> | null>(null);

  useEffect(() => {
    let cancelled = false;
    loaderRef.current().then(
      (data) => {
        if (!cancelled) setResult({ token, data });
      },
      (err: unknown) => {
        if (!cancelled) setResult({ token, error: errorMessage(err) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [token]);

  const current = result?.token === token ? result : null;
  return {
    loading: current === null,
    data: result?.data,
    error: current?.error,
    reload: () => setReloads((n) => n + 1),
  };
}
