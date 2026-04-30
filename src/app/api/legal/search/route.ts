import { createStreamSearchPost, SSE_EVENT } from '@/app/api/_shared/stream-search-route';
import { searchLawArticles } from '@/domains/legal';
import { summarizeLawResultsStream } from '@/core/legal/summarize';

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
