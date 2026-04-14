import { type FontDescriptor, type MeasureCache, fontToKey, defaultCache } from './cache';

export const MANTINE_FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif';

export const DEFAULT_FONT: FontDescriptor = {
  family: MANTINE_FONT_FAMILY,
  size: 14,
  weight: 400,
  style: 'normal',
};

export const BOLD_FONT: FontDescriptor = {
  ...DEFAULT_FONT,
  weight: 700,
};

export const HEADING_FONTS: Record<number, FontDescriptor> = {
  1: { ...DEFAULT_FONT, size: 34, weight: 700 },
  2: { ...DEFAULT_FONT, size: 26, weight: 700 },
  3: { ...DEFAULT_FONT, size: 22, weight: 700 },
  4: { ...DEFAULT_FONT, size: 18, weight: 700 },
  5: { ...DEFAULT_FONT, size: 16, weight: 700 },
  6: { ...DEFAULT_FONT, size: 14, weight: 700 },
};

let sharedCtx: CanvasRenderingContext2D | null = null;

function getContext(): CanvasRenderingContext2D {
  if (sharedCtx) return sharedCtx;

  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(1, 1);
    sharedCtx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
  } else {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    sharedCtx = canvas.getContext('2d')!;
  }

  return sharedCtx;
}

/** 단일 텍스트의 폭 측정 */
export function measureTextWidth(
  text: string,
  font: FontDescriptor = DEFAULT_FONT,
  cache: MeasureCache = defaultCache,
): number {
  const cached = cache.get(font, text);
  if (cached !== undefined) return cached;

  const ctx = getContext();
  ctx.font = fontToKey(font);
  const width = ctx.measureText(text).width;
  cache.set(font, text, width);
  return width;
}

/** 누적 폭 배열 생성 -- arr[i] = text.slice(0, i)의 폭 */
export function buildCumulativeWidths(
  text: string,
  font: FontDescriptor = DEFAULT_FONT,
  cache: MeasureCache = defaultCache,
): Float64Array {
  const len = text.length;
  const arr = new Float64Array(len + 1);
  arr[0] = 0;

  const ctx = getContext();
  ctx.font = fontToKey(font);

  for (let i = 0; i < len; i++) {
    const ch = text[i];
    let charWidth = cache.get(font, ch);
    if (charWidth === undefined) {
      charWidth = ctx.measureText(ch).width;
      cache.set(font, ch, charWidth);
    }
    arr[i + 1] = arr[i] + charWidth;
  }

  return arr;
}
