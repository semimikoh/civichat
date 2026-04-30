'use client';

import { useCallback, useRef } from 'react';

export function useAbortableReader() {
  const abortRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const startRequest = useCallback(() => {
    readerRef.current?.cancel();
    readerRef.current = null;
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;
    return controller;
  }, []);

  const setReader = useCallback((reader: ReadableStreamDefaultReader<Uint8Array>) => {
    readerRef.current = reader;
  }, []);

  const resetRequest = useCallback(() => {
    abortRef.current?.abort();
    readerRef.current?.cancel();
    abortRef.current = null;
    readerRef.current = null;
  }, []);

  const finishRequest = useCallback((controller: AbortController) => {
    if (abortRef.current !== controller) return false;
    readerRef.current = null;
    abortRef.current = null;
    return true;
  }, []);

  return {
    startRequest,
    setReader,
    resetRequest,
    finishRequest,
  };
}
