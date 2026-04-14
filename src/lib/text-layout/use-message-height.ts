'use client';

import { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ChatMessage } from '@/components/chat/MessageList';
import { estimateMessageHeight } from './prepared';
import { createCache } from './cache';

const MESSAGE_GAP = 12;

export function useMessageVirtualizer(messages: ChatMessage[]) {
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

  const estimateSize = useCallback(
    (index: number) => {
      const msg = messages[index];
      if (!msg) return 60;

      const cacheKey = `${msg.role}:${msg.content.length}:${msg.summary?.length ?? 0}:${msg.results?.length ?? 0}:${containerWidth}`;
      const cached = heightCache.current.get(cacheKey);
      if (cached !== undefined) return cached;

      const height = estimateMessageHeight(msg, containerWidth, measureCache) + MESSAGE_GAP;
      heightCache.current.set(cacheKey, height);

      if (heightCache.current.size > 500) {
        const entries = [...heightCache.current.entries()];
        heightCache.current = new Map(entries.slice(-250));
      }

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
    overscan: 5,
  });

  useEffect(() => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
    }
  }, [messages.length, virtualizer]);

  return { virtualizer, scrollRef, containerWidth };
}
