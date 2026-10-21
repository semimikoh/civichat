import { createStreamSearchPost } from '@/app/api/_shared/stream-search-route';
import { SSE_EVENT } from '@/features/chat/protocol';
import { searchLawArticles } from '@/features/legal/server/search';
import { summarizeLawResultsStream } from '@/features/legal/server/summarize';

export const POST = createStreamSearchPost({
  source: 'legal',
  search: ({ query, history, count }) => searchLawArticles({ query, history, matchCount: count }),
  getResultsEvent(response) {
    return {
      type: SSE_EVENT.RESULTS,
      message: response.message,
      results: response.results,
      query: response.query,
    };
  },
  getSummaryStream(response) {
    if (response.results.length === 0) return Promise.resolve(null);
    return summarizeLawResultsStream(response.query, response.results);
  },
});
