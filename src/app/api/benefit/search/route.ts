import { createStreamSearchPost, SSE_EVENT } from '@/app/api/_shared/stream-search-route';
import { searchBenefits } from '@/domains/benefit';
import { summarizeResultsStream } from '@/core/benefit/summarize';

export const POST = createStreamSearchPost({
  source: 'benefit',
  search: ({ query, history, count }) => searchBenefits({ query, history, matchCount: count }),
  getQuestionResponse(response) {
    return response.type === 'question' ? Response.json(response) : null;
  },
  getResultsEvent(response) {
    if (response.type === 'question') {
      return { type: SSE_EVENT.RESULTS, message: response.message, results: [] };
    }
    return {
      type: SSE_EVENT.RESULTS,
      message: response.message,
      results: response.results,
      condText: response.condText,
    };
  },
  getSummaryStream(response, { query }) {
    if (response.type === 'question' || !response.results || response.results.length === 0) {
      return Promise.resolve(null);
    }
    return summarizeResultsStream(query, response.results, response.condText ?? '');
  },
});
