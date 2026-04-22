'use client';

import { useState, useCallback, useRef } from 'react';
import { parseSSEStream } from '@/lib/parse-sse-stream';

export interface BaseChatMessage<TResult = unknown> {
  role: 'user' | 'assistant';
  content: string;
  summary?: string;
  results?: TResult[];
  condText?: string;
  query?: string;
  extraHeight?: number;
  loading?: boolean;
  animated?: boolean;
}

export interface UseChatSearchStreamOptions<TResult> {
  apiUrl: string;
  buildBody: (query: string, messages: BaseChatMessage<TResult>[]) => Record<string, unknown>;
  calcExtraHeight: (results: TResult[]) => number;
  /** 검색 결과(SSE/JSON)가 도착했을 때 호출되는 콜백 */
  onResultsReceived?: () => void;
}

export function useChatSearchStream<TResult>(options: UseChatSearchStreamOptions<TResult>) {
  const { apiUrl, buildBody, calcExtraHeight, onResultsReceived } = options;
  const [messages, setMessages] = useState<BaseChatMessage<TResult>[]>([]);
  const [isInputDisabled, setIsInputDisabled] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const resetChat = useCallback(() => {
    abortRef.current?.abort();
    readerRef.current?.cancel();
    setMessages([]);
    setIsInputDisabled(false);
  }, []);

  /** visible 메시지 기준 인덱스로 해당 메시지를 animated 처리 */
  const markMessageAnimated = useCallback((visibleIndex: number) => {
    setMessages((prev) => {
      const visibleMessages = prev.filter((m) => !m.loading);
      const msg = visibleMessages[visibleIndex];
      if (!msg || msg.animated) return prev;
      const realIdx = prev.indexOf(msg);
      if (realIdx === -1) return prev;
      const updated = [...prev];
      updated[realIdx] = { ...updated[realIdx], animated: true };
      return updated;
    });
  }, []);

  const handleSubmit = useCallback(async (query: string) => {
    readerRef.current?.cancel();
    readerRef.current = null;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: BaseChatMessage<TResult> = { role: 'user', content: query };
    const loadingMsg: BaseChatMessage<TResult> = { role: 'assistant', content: '', loading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setIsInputDisabled(true);

    try {
      // setMessages는 비동기 반영이므로, 현재 messages + userMsg로 직접 구성
      const body = buildBody(query, [...messages, userMsg]);

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(60000)]),
      });

      if (!res.ok) throw new Error(`서버 오류 (${res.status})`);

      const contentType = res.headers.get('content-type') ?? '';

      // JSON 응답 (질문 모드)
      if (contentType.includes('application/json')) {
        const data = await res.json();
        onResultsReceived?.();
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: data.message ?? data.error ?? '' },
        ]);
        return;
      }

      // SSE 스트리밍
      const reader = res.body?.getReader();
      if (!reader) throw new Error('스트림을 읽을 수 없습니다.');
      readerRef.current = reader;

      await parseSSEStream<TResult>(reader, {
        onSummaryChunk(_chunk, accumulated) {
          setMessages((prev) => {
            const updated = [...prev];
            const idx = updated.findLastIndex((m) => m.role === 'assistant');
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], loading: false, summary: accumulated };
            }
            return updated;
          });
        },
        onResults(message, results, condText, effectiveQuery) {
          onResultsReceived?.();
          setMessages((prev) => {
            const updated = [...prev];
            const idx = updated.findLastIndex((m) => m.role === 'assistant');
            if (idx !== -1) {
              updated[idx] = {
                ...updated[idx],
                loading: false,
                content: message,
                results,
                condText: condText ?? '',
                query: effectiveQuery ?? query,
                extraHeight: calcExtraHeight(results),
              };
            }
            return updated;
          });
        },
        onError(message) {
          setMessages((prev) => {
            const updated = [...prev];
            const idx = updated.findLastIndex((m) => m.role === 'assistant');
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], loading: false, content: message };
            }
            return updated;
          });
        },
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const errMsg = err instanceof Error ? err.message : '알 수 없는 오류';
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: `오류가 발생했습니다: ${errMsg}` },
      ]);
    } finally {
      readerRef.current = null;
      setIsInputDisabled(false);
    }
  }, [apiUrl, buildBody, calcExtraHeight, messages, onResultsReceived]);

  return {
    messages,
    isInputDisabled,
    handleSubmit,
    markMessageAnimated,
    resetChat,
  };
}
