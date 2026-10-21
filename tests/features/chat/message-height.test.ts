import { describe, it, expect, vi, beforeEach } from 'vitest';
import { estimateMessageHeight } from '@/features/chat/lib/message-height';
import { createCache } from '@/lib/text-layout/cache';

// Canvas mock: 글자당 고정 폭 7px
function mockCanvas() {
  const measureText = vi.fn((text: string) => ({ width: text.length * 7 }));

  vi.stubGlobal('OffscreenCanvas', class {
    getContext() {
      return { measureText, font: '' };
    }
  });

  return measureText;
}

describe('estimateMessageHeight', () => {
  beforeEach(() => {
    mockCanvas();
  });

  it('사용자 메시지 높이', () => {
    const cache = createCache();
    const h = estimateMessageHeight(
      { role: 'user', content: '안녕하세요' },
      400,
      cache,
    );
    expect(h).toBeGreaterThan(40);
  });

  it('어시스턴트 요약 메시지 높이', () => {
    const cache = createCache();
    const h = estimateMessageHeight(
      { role: 'assistant', content: '', summary: '**요약입니다**\n내용' },
      400,
      cache,
    );
    expect(h).toBeGreaterThan(40);
  });

  it('결과 카드 포함 시 높이 증가', () => {
    const cache = createCache();
    const h1 = estimateMessageHeight(
      { role: 'assistant', content: '결과' },
      400,
      cache,
    );
    const h2 = estimateMessageHeight(
      { role: 'assistant', content: '결과', extraHeight: 2 * (200 + 8) },
      400,
      cache,
    );
    expect(h2).toBeGreaterThan(h1);
  });

  it('최소 높이 40px', () => {
    const cache = createCache();
    const h = estimateMessageHeight(
      { role: 'user', content: '' },
      400,
      cache,
    );
    expect(h).toBeGreaterThanOrEqual(40);
  });
});
