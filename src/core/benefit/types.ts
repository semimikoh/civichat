import type { ExtractedConditions, ConversationMessage } from '@/core/benefit/extract';

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
  similarity: number;
}

export interface SearchResponse {
  type: 'results' | 'question';
  message: string;
  results?: SearchResult[];
  conditions?: ExtractedConditions;
  condText?: string;
}

export interface SearchOptions {
  query: string;
  history?: ConversationMessage[];
  matchCount?: number;
  matchThreshold?: number;
}
