import { z } from 'zod';
import { searchLawArticles } from '@/core/legal/search';
import { summarizeLawResultsStream } from '@/core/legal/summarize';
import { SSE_EVENT } from '@/core/types/sse';

const searchSchema = z.object({
  query: z.string().trim().min(1).max(500),
  count: z.number().int().min(1).max(20).optional().default(10),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
  }

  const parsed = searchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: '입력값이 올바르지 않습니다.', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { query, count } = parsed.data;

  let response;
  try {
    response = await searchLawArticles({ query, matchCount: count });
  } catch (err) {
    console.error('법령 검색 실패:', err);
    return Response.json(
      { error: '검색 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }

  const encoder = new TextEncoder();
  let cancelled = false;
  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (data: string) => {
        if (cancelled) return;
        controller.enqueue(encoder.encode(data));
      };

      // 검색 결과를 먼저 전송 → 카드가 즉시 표시됨
      enqueue(`data: ${JSON.stringify({ type: SSE_EVENT.RESULTS, message: response.message, results: response.results })}\n\n`);

      if (response.results.length > 0) {
        try {
          const summaryStream = await summarizeLawResultsStream(query, response.results);

          for await (const chunk of summaryStream) {
            if (cancelled) break;
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
              enqueue(`data: ${JSON.stringify({ type: SSE_EVENT.SUMMARY_CHUNK, text })}\n\n`);
            }
          }
          enqueue(`data: ${JSON.stringify({ type: SSE_EVENT.SUMMARY_DONE })}\n\n`);
        } catch (err) {
          console.error('요약 스트리밍 실패:', err);
          enqueue(`data: ${JSON.stringify({ type: SSE_EVENT.SUMMARY_DONE, error: '요약 생성 중 오류가 발생했습니다.' })}\n\n`);
        }
      }

      if (!cancelled) controller.close();
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
