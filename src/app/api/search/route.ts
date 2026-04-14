import { searchBenefits, type ConversationMessage } from '@/core/search/benefit';
import { summarizeResultsStream } from '@/core/search/summarize';

export async function POST(request: Request) {
  const body: unknown = await request.json();
  const { query, history, count } = body as Record<string, unknown>;

  if (!query || typeof query !== 'string') {
    return Response.json({ error: '검색어(query)가 필요합니다.' }, { status: 400 });
  }

  const response = await searchBenefits({
    query,
    history: Array.isArray(history) ? history as ConversationMessage[] : [],
    matchCount: typeof count === 'number' ? count : 10,
  });

  // 질문 모드면 그냥 JSON 반환
  if (response.type === 'question') {
    return Response.json(response);
  }

  // 결과 모드면 SSE 스트리밍
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // 1. 요약 스트리밍 먼저
      if (response.results && response.results.length > 0) {
        const summaryStream = await summarizeResultsStream(
          query,
          response.results,
          response.condText ?? '',
        );

        for await (const chunk of summaryStream) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: 'summary_chunk', text })}\n\n`
            ));
          }
        }

        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'summary_done' })}\n\n`
        ));
      }

      // 2. 요약 끝나면 검색 결과 카드 전송
      controller.enqueue(encoder.encode(
        `data: ${JSON.stringify({ type: 'results', message: response.message, results: response.results })}\n\n`
      ));

      controller.close();
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
