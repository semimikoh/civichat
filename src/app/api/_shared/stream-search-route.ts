import 'server-only';

import { z } from 'zod';
import { captureError } from '@/core/monitoring/sentry';
import { SSE_EVENT, type SSEEvent } from '@/core/types/sse';
import type { ConversationMessage } from '@/core/types/conversation';
import { createSseResponse, sseEvent } from '@/lib/sse-stream';

const searchRequestSchema = z.object({
  query: z.string().trim().min(1).max(500),
  count: z.number().int().min(1).max(20).optional().default(10),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(2000),
  })).max(20).optional().default([]),
});

export interface SearchRequest {
  query: string;
  count: number;
  history: ConversationMessage[];
}

type SummaryChunkStream = AsyncIterable<{
  choices: Array<{ delta?: { content?: string | null } }>;
}>;

interface StreamSearchRouteOptions<TResponse, TResult> {
  source: string;
  search: (request: SearchRequest) => Promise<TResponse>;
  getQuestionResponse?: (response: TResponse) => Response | null;
  getResultsEvent: (response: TResponse, request: SearchRequest) => SSEEvent<TResult>;
  getSummaryStream: (response: TResponse, request: SearchRequest) => Promise<SummaryChunkStream | null>;
}

export function createStreamSearchPost<TResponse, TResult>({
  source,
  search,
  getQuestionResponse,
  getResultsEvent,
  getSummaryStream,
}: StreamSearchRouteOptions<TResponse, TResult>) {
  return async function POST(request: Request) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
    }

    const parsed = searchRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: '입력값이 올바르지 않습니다.', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const searchRequest: SearchRequest = {
      query: parsed.data.query,
      count: parsed.data.count,
      history: parsed.data.history,
    };

    let response: TResponse;
    try {
      response = await search(searchRequest);
    } catch (err) {
      captureError(err, { query: searchRequest.query, source: `${source}-search` });
      return Response.json({ error: '검색 중 오류가 발생했습니다.' }, { status: 500 });
    }

    const questionResponse = getQuestionResponse?.(response) ?? null;
    if (questionResponse) return questionResponse;

    return createSseResponse(async (enqueue, isCancelled) => {
      enqueue(sseEvent(getResultsEvent(response, searchRequest)));

      try {
        const summaryStream = await getSummaryStream(response, searchRequest);
        if (!summaryStream) return;

        for await (const chunk of summaryStream) {
          if (isCancelled()) break;
          const text = chunk.choices[0]?.delta?.content;
          if (text) enqueue(sseEvent({ type: SSE_EVENT.SUMMARY_CHUNK, text }));
        }

        enqueue(sseEvent({ type: SSE_EVENT.SUMMARY_DONE }));
      } catch (err) {
        captureError(err, { query: searchRequest.query, source: `${source}-summary` });
        enqueue(sseEvent({ type: SSE_EVENT.SUMMARY_DONE, error: '요약 생성 중 오류가 발생했습니다.' }));
      }
    });
  };
}

export { SSE_EVENT };
