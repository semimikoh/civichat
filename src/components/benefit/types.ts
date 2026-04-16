import type { SearchResult } from '@/core/benefit/search';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  summary?: string;
  results?: SearchResult[];
  /** 추출된 조건 텍스트 (예: "26세 / 서울 / 구직자") */
  condText?: string;
  /** 가상 스크롤 높이 계산용 */
  extraHeight?: number;
  /** 스트리밍 중 자리 표시자 (MessageList에서 필터링됨) */
  loading?: boolean;
  /** 타이프라이터/스태거 애니메이션 완료 여부 (재마운트 시 스킵용) */
  animated?: boolean;
}
