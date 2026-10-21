import { describe, it, expect } from 'vitest';
import { createCache, fontToKey } from '@/lib/text-layout/cache';
import type { FontDescriptor } from '@/lib/text-layout/cache';

const FONT: FontDescriptor = {
  family: 'sans-serif',
  size: 14,
  weight: 400,
  style: 'normal',
};

describe('fontToKey', () => {
  it('CSS font shorthand 생성', () => {
    expect(fontToKey(FONT)).toBe('normal 400 14px sans-serif');
  });
});

describe('MeasureCache', () => {
  it('set/get 동작', () => {
    const cache = createCache();
    cache.set(FONT, 'hello', 42.5);
    expect(cache.get(FONT, 'hello')).toBe(42.5);
  });

  it('미등록 키 → undefined', () => {
    const cache = createCache();
    expect(cache.get(FONT, 'missing')).toBeUndefined();
  });

  it('같은 키 덮어쓰기', () => {
    const cache = createCache();
    cache.set(FONT, 'a', 10);
    cache.set(FONT, 'a', 20);
    expect(cache.get(FONT, 'a')).toBe(20);
    expect(cache.size).toBe(1);
  });

  it('clear 동작', () => {
    const cache = createCache();
    cache.set(FONT, 'a', 1);
    cache.set(FONT, 'b', 2);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get(FONT, 'a')).toBeUndefined();
  });

  it('LRU: 최대 항목 초과 시 오래된 항목 제거', () => {
    const cache = createCache();
    // 2000개 채우기
    for (let i = 0; i < 2000; i++) {
      cache.set(FONT, `key${i}`, i);
    }
    expect(cache.size).toBe(2000);

    // 2001번째 추가 → 첫 번째(key0) 제거
    cache.set(FONT, 'overflow', 999);
    expect(cache.size).toBe(2000);
    expect(cache.get(FONT, 'key0')).toBeUndefined();
    expect(cache.get(FONT, 'overflow')).toBe(999);
  });
});
