import { type MeasureCache, defaultCache } from '@/lib/text-layout/cache';
import { DEFAULT_FONT } from '@/lib/text-layout/measure';
import { type LayoutParams, prepareMarkdownLayout, prepareTextLayout } from '@/lib/text-layout/prepared';

/** 가상 리스트가 높이를 추정할 때 필요한 메시지 정보 */
export interface VirtualizableMessage {
  role: 'user' | 'assistant';
  content: string;
  summary?: string;
  /** 도메인이 직접 계산한 추가 높이 (카드, 아코디언 등) */
  extraHeight?: number;
}

const PAPER_PADDING_Y = 24;
const PAPER_PADDING_X = 24;
const DEFAULT_LINE_HEIGHT = 1.55;
const MIN_MESSAGE_HEIGHT = 40;

/** 결과 카드/아코디언 사이 간격 — 도메인별 extraHeight 계산에 쓴다 */
export const CARD_GAP = 8;

/** 말풍선 최대 너비 비율 — ChatBubble.tsx의 maxWidth가 이 값을 그대로 사용한다 */
export const USER_BUBBLE_WIDTH_RATIO = 0.75;
export const ASSISTANT_BUBBLE_WIDTH_RATIO = 0.80;

export function estimateMessageHeight(
  message: VirtualizableMessage,
  containerWidth: number,
  cache: MeasureCache = defaultCache,
): number {
  const isUser = message.role === 'user';
  const msgWidth = isUser
    ? containerWidth * USER_BUBBLE_WIDTH_RATIO
    : containerWidth * ASSISTANT_BUBBLE_WIDTH_RATIO;

  const params: LayoutParams = {
    containerWidth: msgWidth,
    font: DEFAULT_FONT,
    lineHeight: DEFAULT_LINE_HEIGHT,
    paddingX: PAPER_PADDING_X,
    paddingY: PAPER_PADDING_Y,
  };

  let height = 0;

  if (isUser) {
    if (message.content) {
      height += prepareTextLayout(message.content, params, cache).height;
    }
  } else {
    const text = message.summary ?? message.content;
    if (text) {
      height += prepareMarkdownLayout(text, params, cache).height;
    }
  }

  // 도메인이 계산한 추가 높이 (카드, 아코디언 등)
  if (message.extraHeight) {
    height += message.extraHeight;
  }

  return Math.max(height, MIN_MESSAGE_HEIGHT);
}
