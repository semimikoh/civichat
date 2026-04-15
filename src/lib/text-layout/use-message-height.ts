'use client';

import { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { estimateMessageHeight } from './prepared';
import { createCache } from './cache';

/** 복지/법령 공통 메시지 인터페이스 */
export interface VirtualizableMessage {
  role: 'user' | 'assistant';
  content: string;
  summary?: string;
  /** 복지 검색 결과 (높이 계산용) */
  results?: unknown[];
  /** 법령 검색 결과 (높이 계산용) */
  lawResults?: unknown[];
}

const MESSAGE_GAP = 12;
const HEIGHT_CACHE_MAX = 500;
const HEIGHT_CACHE_TRIM_TO = 250;

export function useMessageVirtualizer(messages: VirtualizableMessage[]) {
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

      const cacheKey = `${msg.role}:${msg.content.length}:${msg.summary?.length ?? 0}:${msg.results?.length ?? 0}:${msg.lawResults?.length ?? 0}:${containerWidth}`;
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
    overscan: 5,
  });

  useEffect(() => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
    }
  }, [messages.length, virtualizer]);

  return { virtualizer, scrollRef };
}
