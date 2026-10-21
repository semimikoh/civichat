import { SSE_EVENT, type SSEEvent } from '@/features/chat/protocol';

export interface SSEStreamCallbacks<TResults> {
  onSummaryChunk: (text: string, accumulated: string) => void;
  onResults: (message: string, results: TResults[], condText?: string, query?: string) => void;
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

  const handleLine = (line: string) => {
    if (!line.startsWith('data: ')) return;
    const json = line.slice(6);
    if (!json) return;

    let event: SSEEvent<TResults>;
    try {
      event = JSON.parse(json) as SSEEvent<TResults>;
    } catch {
      console.error('SSE JSON 파싱 실패:', json);
      return;
    }

    if (event.type === SSE_EVENT.SUMMARY_CHUNK && event.text) {
      summaryText += event.text;
      callbacks.onSummaryChunk(event.text, summaryText);
    }

    if (event.error) {
      callbacks.onError(event.error);
      return;
    }

    if (event.type === SSE_EVENT.RESULTS) {
      callbacks.onResults(event.message ?? '', (event.results ?? []) as TResults[], event.condText, event.query);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    lines.forEach(handleLine);
  }

  // 마지막 이벤트가 줄바꿈 없이 끝난 경우까지 처리
  buffer += decoder.decode();
  if (buffer) handleLine(buffer);
}
