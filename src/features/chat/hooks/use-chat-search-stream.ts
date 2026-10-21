'use client';

import { useState, useCallback } from 'react';
import { useAbortableReader } from '@/features/chat/hooks/use-abortable-reader';
import {
  createMessageId,
  useChatMessages,
  type AssistantMessage,
  type BaseChatMessage,
} from '@/features/chat/hooks/use-chat-messages';
import { parseSSEStream } from '@/features/chat/lib/parse-sse-stream';

export type { BaseChatMessage } from '@/features/chat/hooks/use-chat-messages';

const REQUEST_TIMEOUT_MS = 60_000;

export interface UseChatSearchStreamOptions<TResult> {
  apiUrl: string;
  buildBody: (query: string, messages: BaseChatMessage<TResult>[]) => Record<string, unknown>;
  calcExtraHeight: (results: TResult[]) => number;
}

function hasResults<TResult>(msg: BaseChatMessage<TResult>): msg is AssistantMessage<TResult> {
  return msg.role === 'assistant' && !msg.loading && msg.results !== undefined;
}

function getSummary<TResult>(msg: BaseChatMessage<TResult>): string | undefined {
  return msg.role === 'assistant' && !msg.loading ? msg.summary : undefined;
}

async function readErrorMessage(res: Response): Promise<string> {
  const data: unknown = await res.json().catch(() => null);
  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
    return data.error;
  }
  return `서버 오류 (${res.status})`;
}

export function useChatSearchStream<TResult>(options: UseChatSearchStreamOptions<TResult>) {
  const { apiUrl, buildBody, calcExtraHeight } = options;
  const {
    messages,
    messagesRef,
    setAndSyncMessages,
    updateMessage,
    resetMessages,
    markMessageAnimated: markAnimated,
  } = useChatMessages<TResult>();
  const {
    startRequest,
    setReader,
    resetRequest,
    finishRequest,
  } = useAbortableReader();
  /** 요청 시작 ~ 스트림 종료 */
  const [isRequesting, setIsRequesting] = useState(false);
  /** 요청 시작 ~ 첫 응답(결과/질문/오류) 도착. 이후 요약 스트리밍 중에는 false. */
  const [isSearching, setIsSearching] = useState(false);
  /** 응답 메시지가 화면에 타이핑/등장 애니메이션 중 */
  const [isAnimating, setIsAnimating] = useState(false);

  const resetChat = useCallback(() => {
    resetRequest();
    resetMessages();
    setIsRequesting(false);
    setIsSearching(false);
    setIsAnimating(false);
  }, [resetMessages, resetRequest]);

  const markMessageAnimated = useCallback((id: string) => {
    markAnimated(id);
    setIsAnimating(false);
  }, [markAnimated]);

  const handleSubmit = useCallback(async (query: string) => {
    const controller = startRequest();

    const userMsg: BaseChatMessage<TResult> = { id: createMessageId(), role: 'user', content: query };
    const assistantId = createMessageId();
    const loadingMsg: BaseChatMessage<TResult> = { id: assistantId, role: 'assistant', loading: true };

    const currentMessages = messagesRef.current;
    setAndSyncMessages((prev) => [...prev, userMsg, loadingMsg]);
    setIsRequesting(true);
    setIsSearching(true);

    const replaceAssistant = (next: AssistantMessage<TResult>) => updateMessage(assistantId, () => next);

    try {
      const body = buildBody(query, [...currentMessages, userMsg]);

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
      });

      if (!res.ok) throw new Error(await readErrorMessage(res));

      const contentType = res.headers.get('content-type') ?? '';

      // JSON 응답 (질문 모드)
      if (contentType.includes('application/json')) {
        const data = await res.json();
        setIsSearching(false);
        setIsAnimating(true);
        replaceAssistant({ id: assistantId, role: 'assistant', content: data.message ?? data.error ?? '' });
        return;
      }

      // SSE 스트리밍
      const reader = res.body?.getReader();
      if (!reader) throw new Error('스트림을 읽을 수 없습니다.');
      setReader(reader);

      await parseSSEStream<TResult>(reader, {
        onSummaryChunk(_chunk, accumulated) {
          updateMessage(assistantId, (msg) => (
            msg.role === 'assistant' && !msg.loading
              ? { ...msg, summary: accumulated }
              : { id: assistantId, role: 'assistant', content: '', summary: accumulated }
          ));
        },
        onResults(message, results, condText, effectiveQuery) {
          setIsSearching(false);
          setIsAnimating(true);
          updateMessage(assistantId, (msg) => ({
            id: assistantId,
            role: 'assistant',
            content: message,
            results,
            condText: condText ?? '',
            query: effectiveQuery ?? query,
            extraHeight: calcExtraHeight(results),
            summary: getSummary(msg),
          }));
        },
        onError(message) {
          setIsSearching(false);
          // 결과를 이미 받았다면(요약만 실패) 결과는 그대로 두고 안내만 덧붙인다
          updateMessage(assistantId, (msg) => (
            hasResults(msg)
              ? { ...msg, summaryError: message }
              : { id: assistantId, role: 'assistant', content: message, summary: getSummary(msg) }
          ));
        },
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const errMsg = err instanceof Error ? err.message : '알 수 없는 오류';
      replaceAssistant({ id: assistantId, role: 'assistant', content: `오류가 발생했습니다: ${errMsg}` });
    } finally {
      if (finishRequest(controller)) {
        setIsRequesting(false);
        setIsSearching(false);
      }
    }
  }, [apiUrl, buildBody, calcExtraHeight, setAndSyncMessages, updateMessage, finishRequest, messagesRef, setReader, startRequest]);

  return {
    messages,
    /** 검색 결과를 기다리는 중 — 대화 영역에 로딩 오버레이를 띄울 때 사용 */
    isSearching,
    /** 요청이 끝나고 응답 애니메이션까지 끝나야 다음 입력을 받는다 */
    isInputDisabled: isRequesting || isAnimating,
    handleSubmit,
    markMessageAnimated,
    resetChat,
  };
}
