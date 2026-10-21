import { createStreamSearchPost } from '@/app/api/_shared/stream-search-route';
import { SSE_EVENT } from '@/features/chat/protocol';
import { searchBenefits } from '@/features/benefit/server/search';
import type { SearchResponse, SearchResult } from '@/features/benefit/types';
import { summarizeResultsStream } from '@/features/benefit/server/summarize';

type BenefitResultsResponse = Extract<SearchResponse, { type: 'results' }>;

export const POST = createStreamSearchPost<SearchResponse, SearchResult, BenefitResultsResponse>({
  source: 'benefit',
  search: ({ query, history, count }) => searchBenefits({ query, history, matchCount: count }),
  isStreamable: (response): response is BenefitResultsResponse => response.type === 'results',
  getResultsEvent({ message, results, condText }) {
    return { type: SSE_EVENT.RESULTS, message, results, condText };
  },
  getSummaryStream({ results, condText }, { query }) {
    if (results.length === 0) return Promise.resolve(null);
    return summarizeResultsStream(query, results, condText);
  },
});
