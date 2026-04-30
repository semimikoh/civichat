'use client';

import { useCallback, useRef, useState } from 'react';

export type UserMessage = {
  role: 'user';
  content: string;
};

export type AssistantLoadingMessage = {
  role: 'assistant';
  loading: true;
};

export type AssistantMessage<TResult = unknown> = {
  role: 'assistant';
  loading?: false;
  content: string;
  summary?: string;
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

  const markMessageAnimated = useCallback((visibleIndex: number) => {
    setAndSyncMessages((prev) => {
      const visibleMessages = prev.filter(
        (m): m is UserMessage | AssistantMessage<TResult> => !(m.role === 'assistant' && m.loading === true),
      );
      const msg = visibleMessages[visibleIndex];
      if (!msg || msg.role !== 'assistant' || msg.animated) return prev;

      const realIdx = prev.indexOf(msg);
      if (realIdx === -1) return prev;

      const updated = [...prev];
      updated[realIdx] = { ...msg, animated: true };
      return updated;
    });
  }, [setAndSyncMessages]);

  return {
    messages,
    messagesRef,
    setAndSyncMessages,
    resetMessages,
    markMessageAnimated,
  };
}
