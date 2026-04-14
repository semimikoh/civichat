import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prepareTextLayout, prepareMarkdownLayout, estimateMessageHeight, type LayoutParams } from '@/lib/text-layout/prepared';
import { DEFAULT_FONT, BOLD_FONT } from '@/lib/text-layout/measure';
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

describe('prepareTextLayout', () => {
  beforeEach(() => {
    mockCanvas();
  });

  const params: LayoutParams = {
    containerWidth: 200,
    font: DEFAULT_FONT,
    lineHeight: 1.55,
    paddingX: 24,
    paddingY: 24,
  };

  it('빈 텍스트 → 0줄', () => {
    const cache = createCache();
    const r = prepareTextLayout('', params, cache);
    expect(r.lines).toBe(0);
    expect(r.height).toBe(0);
  });

  it('짧은 텍스트 → 1줄', () => {
    const cache = createCache();
    // 200 - 24 = 176px, "hello" = 5 * 7 = 35px → 1줄
    const r = prepareTextLayout('hello', params, cache);
    expect(r.lines).toBe(1);
    expect(r.lineBreaks).toHaveLength(0);
  });

  it('긴 텍스트 → 여러 줄', () => {
    const cache = createCache();
    // availableWidth = 176px, 글자당 7px → 한 줄에 25자
    // 50자 텍스트 → 2줄
    const text = 'a '.repeat(25).trim(); // 49자 (공백 포함)
    const r = prepareTextLayout(text, params, cache);
    expect(r.lines).toBeGreaterThanOrEqual(2);
    expect(r.lineBreaks.length).toBeGreaterThanOrEqual(1);
  });

  it('높이 계산: lines * lineHeight * fontSize + paddingY', () => {
    const cache = createCache();
    const r = prepareTextLayout('hi', params, cache);
    expect(r.height).toBe(1 * (14 * 1.55) + 24);
  });

  it('한글 텍스트 처리', () => {
    const cache = createCache();
    const r = prepareTextLayout('안녕하세요 반갑습니다', params, cache);
    expect(r.lines).toBeGreaterThanOrEqual(1);
  });
});

describe('prepareMarkdownLayout', () => {
  beforeEach(() => {
    mockCanvas();
  });

  const params: LayoutParams = {
    containerWidth: 300,
    font: DEFAULT_FONT,
    lineHeight: 1.55,
    paddingX: 24,
    paddingY: 24,
  };

  it('볼드 마크다운 처리', () => {
    const cache = createCache();
    const r = prepareMarkdownLayout('**굵은 텍스트** 일반', params, cache);
    expect(r.lines).toBeGreaterThanOrEqual(1);
  });

  it('빈 줄 → 단락 간격 추가', () => {
    const cache = createCache();
    const r1 = prepareMarkdownLayout('한줄', params, cache);
    const r2 = prepareMarkdownLayout('한줄\n\n두줄', params, cache);
    expect(r2.height).toBeGreaterThan(r1.height);
  });

  it('링크 마크다운 제거', () => {
    const cache = createCache();
    const r = prepareMarkdownLayout('[링크](https://example.com)', params, cache);
    expect(r.lines).toBeGreaterThanOrEqual(1);
  });
});

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
      { role: 'assistant', content: '결과', results: [{ serviceId: '1' }, { serviceId: '2' }] },
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
