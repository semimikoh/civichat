import type { SearchResult } from '@/core/search/benefit';
import type { SSEEventType } from '@/core/types/sse';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  summary?: string;
  results?: SearchResult[];
  /** 스트리밍 중 자리 표시자 (MessageList에서 필터링됨) */
  loading?: boolean;
}

export interface SSEEvent {
  type: SSEEventType;
  message?: string;
  results?: SearchResult[];
  text?: string;
  error?: string;
}
