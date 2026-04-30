import { parseSSEStream } from "@/lib/parse-sse-stream";
import { SSE_EVENT } from "@/core/types/sse";

function readerFromChunks(chunks: string[]) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  }).getReader();
}

describe("parseSSEStream", () => {
  it("결과 이벤트와 요약 청크를 순서대로 파싱한다", async () => {
    const onResults = vi.fn();
    const onSummaryChunk = vi.fn();
    const onError = vi.fn();

    const reader = readerFromChunks([
      `data: ${JSON.stringify({
        type: SSE_EVENT.RESULTS,
        message: "2건을 찾았습니다.",
        results: [{ id: 1 }],
        condText: "서울 / 청년",
      })}\n\n`,
      `data: ${JSON.stringify({ type: SSE_EVENT.SUMMARY_CHUNK, text: "첫" })}\n\n`,
      `data: ${JSON.stringify({ type: SSE_EVENT.SUMMARY_CHUNK, text: " 요약" })}\n\n`,
    ]);

    await parseSSEStream(reader, { onResults, onSummaryChunk, onError });

    expect(onResults).toHaveBeenCalledWith(
      "2건을 찾았습니다.",
      [{ id: 1 }],
      "서울 / 청년",
      undefined,
    );
    expect(onSummaryChunk).toHaveBeenNthCalledWith(1, "첫", "첫");
    expect(onSummaryChunk).toHaveBeenNthCalledWith(2, " 요약", "첫 요약");
    expect(onError).not.toHaveBeenCalled();
  });

  it("청크 경계에서 잘린 SSE 라인도 파싱한다", async () => {
    const onResults = vi.fn();
    const payload = `data: ${JSON.stringify({
      type: SSE_EVENT.RESULTS,
      message: "ok",
      results: [],
      query: "장애인 고용 의무 비율",
    })}\n\n`;

    const reader = readerFromChunks([payload.slice(0, 12), payload.slice(12)]);

    await parseSSEStream(reader, {
      onResults,
      onSummaryChunk: vi.fn(),
      onError: vi.fn(),
    });

    expect(onResults).toHaveBeenCalledWith("ok", [], undefined, "장애인 고용 의무 비율");
  });

  it("에러 이벤트를 콜백으로 전달한다", async () => {
    const onError = vi.fn();
    const reader = readerFromChunks([
      `data: ${JSON.stringify({ type: SSE_EVENT.SUMMARY_DONE, error: "요약 실패" })}\n\n`,
    ]);

    await parseSSEStream(reader, {
      onResults: vi.fn(),
      onSummaryChunk: vi.fn(),
      onError,
    });

    expect(onError).toHaveBeenCalledWith("요약 실패");
  });
});
