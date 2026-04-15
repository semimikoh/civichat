import type { SearchResult } from '@/core/benefit/search';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  summary?: string;
  results?: SearchResult[];
  /** 가상 스크롤 높이 계산용 */
  extraHeight?: number;
  /** 스트리밍 중 자리 표시자 (MessageList에서 필터링됨) */
  loading?: boolean;
}
