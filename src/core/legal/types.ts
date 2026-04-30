import type { ConversationMessage } from '@/core/types/conversation';

export interface LawSearchResult {
  id: number;
  lawTitle: string;
  lawType: string;
  chapter: string;
  articleNumber: string;
  articleTitle: string;
  articleContent: string;
  sourceUrl: string;
  similarity: number;
}

export interface LawSearchResponse {
  message: string;
  results: LawSearchResult[];
  query: string;
}

export interface LawSearchOptions {
  query: string;
  history?: ConversationMessage[];
  matchCount?: number;
  matchThreshold?: number;
}
