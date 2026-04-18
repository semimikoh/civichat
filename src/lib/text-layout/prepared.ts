import {
  type FontDescriptor,
  type MeasureCache,
  defaultCache,
} from './cache';
import {
  DEFAULT_FONT,
  BOLD_FONT,
  buildCumulativeWidths,
} from './measure';
import type { VirtualizableMessage } from './use-message-height';

// --- 타입 ---

export interface PreparedLayout {
  lines: number;
  height: number;
  lineBreaks: number[];
}

export interface LayoutParams {
  containerWidth: number;
  font: FontDescriptor;
  lineHeight: number;
  paddingX: number;
  paddingY: number;
}

// --- 줄바꿈 판정 ---

function isBreakable(text: string, index: number): boolean {
  if (index <= 0 || index >= text.length) return false;
  const code = text.charCodeAt(index);
  if (code === 0x20 || code === 0x0a) return true;
  const prev = text.charCodeAt(index - 1);
  if (prev === 0x20 || prev === 0x0a) return true;
  return false;
}

// --- 핵심: O(log n) 이진탐색 줄바꿈 ---

export function prepareTextLayout(
  text: string,
  params: LayoutParams,
  cache: MeasureCache = defaultCache,
): PreparedLayout {
  if (!text || text.length === 0) {
    return { lines: 0, height: 0, lineBreaks: [] };
  }

  const availableWidth = params.containerWidth - params.paddingX;
  if (availableWidth <= 0) {
    return { lines: 1, height: params.font.size * params.lineHeight, lineBreaks: [] };
  }

  const cumWidths = buildCumulativeWidths(text, params.font, cache);
  const lineBreaks: number[] = [];
  let lineStart = 0;

  while (lineStart < text.length) {
    const remainingWidth = cumWidths[text.length] - cumWidths[lineStart];
    if (remainingWidth <= availableWidth) {
      break;
    }

    // 이진탐색: availableWidth 내 최대 인덱스
    let lo = lineStart + 1;
    let hi = text.length;

    while (lo < hi) {
      const mid = (lo + hi + 1) >>> 1;
      const lineWidth = cumWidths[mid] - cumWidths[lineStart];
      if (lineWidth <= availableWidth) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }

    let breakAt = lo;

    // 줄바꿈 가능한 위치로 후퇴
    let candidate = breakAt;
    while (candidate > lineStart && !isBreakable(text, candidate)) {
      candidate--;
    }

    if (candidate <= lineStart) {
      breakAt = Math.max(lineStart + 1, lo);
    } else {
      breakAt = candidate;
    }

    lineBreaks.push(breakAt);
    lineStart = breakAt;

    while (lineStart < text.length && text[lineStart] === ' ') {
      lineStart++;
    }
  }

  const lines = lineBreaks.length + 1;
  const lineHeightPx = params.font.size * params.lineHeight;
  const height = lines * lineHeightPx + params.paddingY;

  return { lines, height, lineBreaks };
}

// --- 마크다운 파싱 (간이) ---

interface TextSegment {
  text: string;
  font: FontDescriptor;
  blockSpacing: number;
}

function parseMarkdownSegments(markdown: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const lines = markdown.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      segments.push({ text: '', font: DEFAULT_FONT, blockSpacing: 8 });
      continue;
    }

    // 리스트 항목: "- ", "* ", "1. " 등 → 들여쓰기 고려
    const isListItem = /^[-*]\s|^\d+\.\s/.test(trimmed);
    const listPrefix = isListItem ? '  ' : ''; // 들여쓰기 근사

    const cleaned = trimmed
      .replace(/^[-*]\s+/, '')        // unordered list marker
      .replace(/^\d+\.\s+/, '')       // ordered list marker
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1');

    const hasBold = /\*\*/.test(trimmed);
    segments.push({
      text: listPrefix + cleaned,
      font: hasBold ? BOLD_FONT : DEFAULT_FONT,
      blockSpacing: isListItem ? 2 : 4,
    });
  }

  return segments;
}

export function prepareMarkdownLayout(
  markdown: string,
  params: LayoutParams,
  cache: MeasureCache = defaultCache,
): PreparedLayout {
  const segments = parseMarkdownSegments(markdown);
  let totalHeight = params.paddingY;
  let totalLines = 0;
  const allBreaks: number[] = [];

  for (const seg of segments) {
    if (!seg.text) {
      totalHeight += seg.blockSpacing;
      continue;
    }

    const segParams = { ...params, font: seg.font, paddingY: 0 };
    const layout = prepareTextLayout(seg.text, segParams, cache);
    totalHeight += layout.height + seg.blockSpacing;
    totalLines += layout.lines;
    allBreaks.push(...layout.lineBreaks);
  }

  return { lines: totalLines, height: totalHeight, lineBreaks: allBreaks };
}

// --- CiviChat 메시지 높이 추정 ---

const PAPER_PADDING_Y = 24;
const PAPER_PADDING_X = 24;
const DEFAULT_LINE_HEIGHT = 1.55;

/** BenefitCard 추정 높이 — BenefitCard.tsx의 실제 렌더와 일치시킬 것 */
export const BENEFIT_CARD_HEIGHT = 200;
export const CARD_GAP = 8;

/** 법령 아코디언 접힌 상태 추정 높이 — LawArticleCard.tsx의 Accordion.Control과 일치 */
export const LAW_ACCORDION_COLLAPSED_HEIGHT = 80;

/** 말풍선 최대 너비 비율 — MessageList.tsx, ChatContainer.tsx의 maxWidth와 일치시킬 것 */
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

  return Math.max(height, 40);
}
