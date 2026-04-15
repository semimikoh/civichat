'use client';

import { SSE_EVENT, type SSEEvent } from '@/core/types/sse';

export interface SSEStreamCallbacks<TResults> {
  onSummaryChunk: (text: string, accumulated: string) => void;
  onResults: (message: string, results: TResults[], condText?: string) => void;
  onError: (message: string) => void;
}

/** SSE 응답 스트림을 파싱하여 이벤트별 콜백을 호출한다. */
export async function parseSSEStream<TResults>(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  callbacks: SSEStreamCallbacks<TResults>,
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = '';
  let summaryText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6);
      if (!json) continue;

      let event: SSEEvent<TResults>;
      try {
        event = JSON.parse(json) as SSEEvent<TResults>;
      } catch {
        console.error('SSE JSON 파싱 실패:', json);
        continue;
      }

      if (event.type === SSE_EVENT.SUMMARY_CHUNK && event.text) {
        summaryText += event.text;
        callbacks.onSummaryChunk(event.text, summaryText);
      }

      if (event.type === SSE_EVENT.RESULTS) {
        callbacks.onResults(event.message ?? '', (event.results ?? []) as TResults[], event.condText);
      }
    }
  }
}
