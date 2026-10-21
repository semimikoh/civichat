import 'server-only';

import { z } from 'zod';
import { captureError } from '@/server/monitoring';
import { SSE_EVENT, type SSEEvent } from '@/features/chat/protocol';
import { createSseResponse, sseEvent } from '@/app/api/_shared/sse-response';
import { createRateLimiter, getClientKey } from '@/app/api/_shared/rate-limit';

const searchRequestSchema = z.object({
  query: z.string().trim().min(1).max(500),
  count: z.number().int().min(1).max(20).optional().default(10),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(2000),
  })).max(20).optional().default([]),
});

export type SearchRequest = z.infer<typeof searchRequestSchema>;

/** 요청 1건이 OpenAI 임베딩 + 요약을 호출하므로 클라이언트별로 호출 횟수를 제한한다. */
const SEARCH_RATE_LIMIT = { limit: 20, windowMs: 60_000 };

type SummaryChunkStream = AsyncIterable<{
  choices: Array<{ delta?: { content?: string | null } }>;
}>;

interface StreamSearchRouteOptions<TResponse, TStreamResponse extends TResponse, TResult> {
  source: string;
  search: (request: SearchRequest) => Promise<TResponse>;
  /**
   * SSE로 흘려보낼 응답인지 판별한다. false면 SSE 대신 JSON으로 바로 응답한다(추가 질문 등).
   * 생략하면 모든 응답을 SSE로 보낸다.
   */
  isStreamable?: (response: TResponse) => response is TStreamResponse;
  getResultsEvent: (response: TStreamResponse, request: SearchRequest) => SSEEvent<TResult>;
  getSummaryStream: (response: TStreamResponse, request: SearchRequest) => Promise<SummaryChunkStream | null>;
}

export function createStreamSearchPost<TResponse, TResult, TStreamResponse extends TResponse = TResponse>({
  source,
  search,
  isStreamable,
  getResultsEvent,
  getSummaryStream,
}: StreamSearchRouteOptions<TResponse, TStreamResponse, TResult>) {
  const checkRateLimit = createRateLimiter(SEARCH_RATE_LIMIT);

  return async function POST(request: Request) {
    const rateLimit = checkRateLimit(getClientKey(request));
    if (!rateLimit.allowed) {
      return Response.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
      );
    }

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

    const searchRequest = parsed.data;

    let response: TResponse;
    try {
      response = await search(searchRequest);
    } catch (err) {
      captureError(err, { query: searchRequest.query, source: `${source}-search` });
      return Response.json({ error: '검색 중 오류가 발생했습니다.' }, { status: 500 });
    }

    if (isStreamable && !isStreamable(response)) return Response.json(response);
    // isStreamable을 생략했다면 TStreamResponse는 TResponse와 같다
    const streamResponse = response as TStreamResponse;

    return createSseResponse(async (enqueue, isCancelled) => {
      enqueue(sseEvent(getResultsEvent(streamResponse, searchRequest)));

      try {
        const summaryStream = await getSummaryStream(streamResponse, searchRequest);
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
