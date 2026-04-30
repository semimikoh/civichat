'use client';

import { useState, useCallback } from 'react';
import { useAbortableReader } from '@/hooks/use-abortable-reader';
import { useChatMessages, type BaseChatMessage, type AssistantMessage } from '@/hooks/use-chat-messages';
import { parseSSEStream } from '@/lib/parse-sse-stream';

export type { BaseChatMessage } from '@/hooks/use-chat-messages';

export interface UseChatSearchStreamOptions<TResult> {
  apiUrl: string;
  buildBody: (query: string, messages: BaseChatMessage<TResult>[]) => Record<string, unknown>;
  calcExtraHeight: (results: TResult[]) => number;
  /** 검색 결과(SSE/JSON)가 도착했을 때 호출되는 콜백 */
  onResultsReceived?: () => void;
}

export function useChatSearchStream<TResult>(options: UseChatSearchStreamOptions<TResult>) {
  const { apiUrl, buildBody, calcExtraHeight, onResultsReceived } = options;
  const {
    messages,
    messagesRef,
    setAndSyncMessages,
    resetMessages,
    markMessageAnimated,
  } = useChatMessages<TResult>();
  const {
    startRequest,
    setReader,
    resetRequest,
    finishRequest,
  } = useAbortableReader();
  const [isInputDisabled, setIsInputDisabled] = useState(false);

  const resetChat = useCallback(() => {
    resetRequest();
    resetMessages();
    setIsInputDisabled(false);
  }, [resetMessages, resetRequest]);

  const handleSubmit = useCallback(async (query: string) => {
    const controller = startRequest();

    const userMsg: BaseChatMessage<TResult> = { role: 'user', content: query };
    const loadingMsg: BaseChatMessage<TResult> = { role: 'assistant', loading: true };

    const currentMessages = messagesRef.current;
    setAndSyncMessages((prev) => [...prev, userMsg, loadingMsg]);
    setIsInputDisabled(true);

    try {
      const body = buildBody(query, [...currentMessages, userMsg]);

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
        setAndSyncMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: data.message ?? data.error ?? '' },
        ]);
        return;
      }

      // SSE 스트리밍
      const reader = res.body?.getReader();
      if (!reader) throw new Error('스트림을 읽을 수 없습니다.');
      setReader(reader);

      await parseSSEStream<TResult>(reader, {
        onSummaryChunk(_chunk, accumulated) {
          setAndSyncMessages((prev) => {
            const updated = [...prev];
            const idx = updated.findLastIndex((m) => m.role === 'assistant');
            if (idx !== -1) {
              const prevMsg = updated[idx];
              updated[idx] = prevMsg.role === 'assistant' && !prevMsg.loading
                ? { ...prevMsg, summary: accumulated }
                : { role: 'assistant', content: '', summary: accumulated };
            }
            return updated;
          });
        },
        onResults(message, results, condText, effectiveQuery) {
          onResultsReceived?.();
          setAndSyncMessages((prev) => {
            const updated = [...prev];
            const idx = updated.findLastIndex((m) => m.role === 'assistant');
            if (idx !== -1) {
              const prevMsg = updated[idx];
              const summary =
                prevMsg.role === 'assistant' && !prevMsg.loading ? prevMsg.summary : undefined;
              const next: AssistantMessage<TResult> = {
                role: 'assistant',
                content: message,
                results,
                condText: condText ?? '',
                query: effectiveQuery ?? query,
                extraHeight: calcExtraHeight(results),
                summary,
              };
              updated[idx] = next;
            }
            return updated;
          });
        },
        onError(message) {
          setAndSyncMessages((prev) => {
            const updated = [...prev];
            const idx = updated.findLastIndex((m) => m.role === 'assistant');
            if (idx !== -1) {
              const prevMsg = updated[idx];
              const summary =
                prevMsg.role === 'assistant' && !prevMsg.loading ? prevMsg.summary : undefined;
              updated[idx] = { role: 'assistant', content: message, summary };
            }
            return updated;
          });
        },
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const errMsg = err instanceof Error ? err.message : '알 수 없는 오류';
      setAndSyncMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: `오류가 발생했습니다: ${errMsg}` },
      ]);
    } finally {
      if (finishRequest(controller)) {
        setIsInputDisabled(false);
      }
    }
  }, [apiUrl, buildBody, calcExtraHeight, setAndSyncMessages, finishRequest, messagesRef, onResultsReceived, setReader, startRequest]);

  return {
    messages,
    isInputDisabled,
    handleSubmit,
    markMessageAnimated,
    resetChat,
  };
}
