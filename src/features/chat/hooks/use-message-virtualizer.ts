'use client';
/* eslint-disable react-hooks/incompatible-library -- useVirtualizer는 React Compiler 메모이제이션 대상에서 제외 */

import { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { estimateMessageHeight, type VirtualizableMessage } from '@/features/chat/lib/message-height';
import { createCache } from '@/lib/text-layout/cache';

/** 가상 리스트의 key와 높이 캐시 key로 쓸 안정적인 id가 필요하다 */
export type KeyedVirtualizableMessage = VirtualizableMessage & { id: string };

const MESSAGE_GAP = 12;
const HEIGHT_CACHE_MAX = 500;
const HEIGHT_CACHE_TRIM_TO = 250;

export function useMessageVirtualizer(messages: KeyedVirtualizableMessage[]) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    setContainerWidth(el.clientWidth);

    return () => observer.disconnect();
  }, []);

  const measureCache = useMemo(() => createCache(), []);
  const heightCache = useRef(new Map<string, number>());

  // 캐시 트림: 메시지 수 변경 시 초과분 정리
  useEffect(() => {
    if (heightCache.current.size > HEIGHT_CACHE_MAX) {
      const entries = [...heightCache.current.entries()];
      heightCache.current = new Map(entries.slice(-HEIGHT_CACHE_TRIM_TO));
    }
  }, [messages.length]);

  const estimateSize = useCallback(
    (index: number) => {
      const msg = messages[index];
      if (!msg) return 60;

      // 너비가 바뀌면 아래 effect에서 캐시를 비우므로 키에는 너비를 넣지 않는다
      const cacheKey = `${msg.id}:${msg.content.length}:${msg.summary?.length ?? 0}:${msg.extraHeight ?? 0}`;
      const cached = heightCache.current.get(cacheKey);
      if (cached !== undefined) return cached;

      const height = estimateMessageHeight(msg, containerWidth, measureCache) + MESSAGE_GAP;
      heightCache.current.set(cacheKey, height);

      return height;
    },
    [messages, containerWidth, measureCache],
  );

  useEffect(() => {
    heightCache.current.clear();
  }, [containerWidth]);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize,
    getItemKey: (index) => messages[index]?.id ?? index,
    overscan: 5,
  });

  useEffect(() => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
    }
  }, [messages.length, virtualizer]);

  return { virtualizer, scrollRef };
}
