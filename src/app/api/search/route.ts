import { z } from 'zod';
import { searchBenefits, type ConversationMessage } from '@/core/search/benefit';
import { summarizeResultsStream } from '@/core/search/summarize';

const searchSchema = z.object({
  query: z.string().trim().min(1).max(500),
  count: z.number().int().min(1).max(20).optional().default(10),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(2000),
  })).max(20).optional().default([]),
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

  const { query, count, history } = parsed.data;

  const response = await searchBenefits({
    query,
    history: history as ConversationMessage[],
    matchCount: count,
  });

  if (response.type === 'question') {
    return Response.json(response);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
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
