'use client';

import { useCallback, useRef, useState } from 'react';

export type UserMessage = {
  id: string;
  role: 'user';
  content: string;
};

export type AssistantLoadingMessage = {
  id: string;
  role: 'assistant';
  loading: true;
};

export type AssistantMessage<TResult = unknown> = {
  id: string;
  role: 'assistant';
  loading?: false;
  content: string;
  summary?: string;
  /** 검색 결과는 받았지만 요약 생성에 실패한 경우의 안내 문구 */
  summaryError?: string;
  results?: TResult[];
  condText?: string;
  query?: string;
  extraHeight?: number;
  animated?: boolean;
};

export type BaseChatMessage<TResult = unknown> =
  | UserMessage
  | AssistantLoadingMessage
  | AssistantMessage<TResult>;

type MessageUpdater<TResult> =
  | BaseChatMessage<TResult>[]
  | ((prev: BaseChatMessage<TResult>[]) => BaseChatMessage<TResult>[]);

export function createMessageId(): string {
  return crypto.randomUUID();
}

export function useChatMessages<TResult>() {
  const [messages, setMessages] = useState<BaseChatMessage<TResult>[]>([]);
  const messagesRef = useRef<BaseChatMessage<TResult>[]>([]);

  /** setState + messagesRef 동기화를 한 번에 처리. 두 가지 역할을 함께 한다는 것을 이름으로 표현. */
  const setAndSyncMessages = useCallback((updater: MessageUpdater<TResult>) => {
    const next = typeof updater === 'function' ? updater(messagesRef.current) : updater;
    messagesRef.current = next;
    setMessages(next);
  }, []);

  const resetMessages = useCallback(() => {
    setAndSyncMessages([]);
  }, [setAndSyncMessages]);

  /** id의 메시지를 찾아 교체한다. 해당 메시지가 없으면 아무것도 하지 않는다. */
  const updateMessage = useCallback((
    id: string,
    update: (msg: BaseChatMessage<TResult>) => BaseChatMessage<TResult>,
  ) => {
    setAndSyncMessages((prev) => prev.map((msg) => (msg.id === id ? update(msg) : msg)));
  }, [setAndSyncMessages]);

  const markMessageAnimated = useCallback((id: string) => {
    updateMessage(id, (msg) => (
      msg.role === 'assistant' && !msg.loading && !msg.animated ? { ...msg, animated: true } : msg
    ));
  }, [updateMessage]);

  return {
    messages,
    messagesRef,
    setAndSyncMessages,
    updateMessage,
    resetMessages,
    markMessageAnimated,
  };
}
