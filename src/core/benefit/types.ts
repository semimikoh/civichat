import type { ExtractedConditions } from '@/core/benefit/extract';
import type { ConversationMessage } from '@/core/types/conversation';

export interface SearchResult {
  serviceId: string;
  serviceName: string;
  servicePurpose: string;
  supportType: string;
  targetAudience: string;
  selectionCriteria: string;
  supportContent: string;
  applicationMethod: string;
  applicationDeadline: string;
  contactAgency: string;
  contactPhone: string;
  onlineApplicationUrl: string;
  detailUrl: string;
  managingAgency: string;
  law: string;
  /** 검색 단계(벡터 + 키워드 RRF)에서 나온 원본 유사도 */
  similarity: number;
  /** 조건·지역·의도 가산점을 반영한 최종 정렬 점수. 화면에 매칭률로 노출하지 않는다. */
  score: number;
}

export type SearchResponse =
  | {
    type: 'question';
    message: string;
    conditions: ExtractedConditions;
  }
  | {
    type: 'results';
    message: string;
    results: SearchResult[];
    conditions: ExtractedConditions;
    condText: string;
  };

export interface SearchOptions {
  query: string;
  history?: ConversationMessage[];
  matchCount?: number;
  matchThreshold?: number;
}
