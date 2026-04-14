'use client';

import { useState, useEffect, useRef } from 'react';

function buildWordEndIndices(text: string): number[] {
  const breaks: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === ' ' || text[i] === '\n') breaks.push(i + 1);
  }
  breaks.push(text.length);
  return breaks;
}

interface UseTypewriterOptions {
  /** 어절 간 딜레이 (ms) */
  interval?: number;
  /** 애니메이션 활성화 여부 */
  enabled?: boolean;
}

/**
 * 어절 단위 타이프라이터 훅.
 * text가 변할 때마다 새로 추가된 부분을 어절 단위로 순차 표시한다.
 */
export function useTypewriter(text: string, options: UseTypewriterOptions = {}) {
  const { interval = 40, enabled = true } = options;
  const [visibleLength, setVisibleLength] = useState(enabled ? 0 : text.length);
  const prevTextRef = useRef('');
  const indicesRef = useRef<number[]>([]);
  const stepRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setVisibleLength(text.length);
      return;
    }

    // 텍스트가 이전보다 길어진 경우 (스트리밍 중 추가)
    if (text.startsWith(prevTextRef.current)) {
      indicesRef.current = buildWordEndIndices(text);
    } else {
      // 텍스트가 완전히 바뀐 경우 리셋
      indicesRef.current = buildWordEndIndices(text);
      stepRef.current = 0;
      setVisibleLength(0);
    }

    prevTextRef.current = text;
  }, [text, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const indices = indicesRef.current;
    if (indices.length === 0) return;

    // 현재 step이 이미 끝에 도달했으면 종료
    if (stepRef.current >= indices.length) return;

    const timer = setInterval(() => {
      stepRef.current += 1;
      const idx = Math.min(stepRef.current, indices.length - 1);
      setVisibleLength(indices[idx]);

      if (stepRef.current >= indices.length) {
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [text, interval, enabled]);

  const visibleText = text.slice(0, visibleLength);
  const isDone = visibleLength >= text.length;

  return { visibleText, isDone };
}
