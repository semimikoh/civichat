import { act, renderHook, waitFor } from "@testing-library/react";
import { useChatSearchStream } from "@/hooks/use-chat-search-stream";
import { SSE_EVENT } from "@/core/types/sse";

interface TestResult {
  id: number;
}

function streamResponse(events: Array<Record<string, unknown>>) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const event of events) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
        controller.close();
      },
    }),
    { headers: { "content-type": "text/event-stream" } },
  );
}

function renderSearchHook() {
  const buildBody = vi.fn((query: string) => ({ query, count: 10, history: [] }));
  const calcExtraHeight = vi.fn((results: TestResult[]) => results.length * 42);
  const onResultsReceived = vi.fn();

  const hook = renderHook(() =>
    useChatSearchStream<TestResult>({
      apiUrl: "/api/test/search",
      buildBody,
      calcExtraHeight,
      onResultsReceived,
    }),
  );

  return { ...hook, buildBody, calcExtraHeight, onResultsReceived };
}

describe("useChatSearchStream", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("SSE 결과와 요약을 assistant 메시지에 반영한다", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      streamResponse([
        {
          type: SSE_EVENT.RESULTS,
          message: "1건을 찾았습니다.",
          results: [{ id: 1 }],
          condText: "서울 / 청년",
          query: "서울 청년 주거",
        },
        { type: SSE_EVENT.SUMMARY_CHUNK, text: "요약" },
        { type: SSE_EVENT.SUMMARY_CHUNK, text: "입니다" },
      ]),
    );
    const { result, buildBody, calcExtraHeight, onResultsReceived } = renderSearchHook();

    await act(async () => {
      await result.current.handleSubmit("서울 청년 주거");
    });

    expect(buildBody).toHaveBeenCalledWith("서울 청년 주거", [
      { role: "user", content: "서울 청년 주거" },
    ]);
    expect(calcExtraHeight).toHaveBeenCalledWith([{ id: 1 }]);
    expect(onResultsReceived).toHaveBeenCalledTimes(1);
    expect(result.current.messages).toEqual([
      { role: "user", content: "서울 청년 주거" },
      {
        role: "assistant",
        content: "1건을 찾았습니다.",
        results: [{ id: 1 }],
        condText: "서울 / 청년",
        query: "서울 청년 주거",
        extraHeight: 42,
        summary: "요약입니다",
      },
    ]);
    expect(result.current.isInputDisabled).toBe(false);
  });

  it("JSON 질문 응답을 assistant 메시지로 치환한다", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      Response.json({ message: "어느 지역에 거주하고 계신가요?" }),
    );
    const { result, onResultsReceived } = renderSearchHook();

    await act(async () => {
      await result.current.handleSubmit("청년 주거");
    });

    expect(onResultsReceived).toHaveBeenCalledTimes(1);
    expect(result.current.messages).toEqual([
      { role: "user", content: "청년 주거" },
      { role: "assistant", content: "어느 지역에 거주하고 계신가요?" },
    ]);
    expect(result.current.isInputDisabled).toBe(false);
  });

  it("resetChat은 진행 중인 요청 상태와 메시지를 정리한다", async () => {
    vi.spyOn(global, "fetch").mockImplementation(
      () => new Promise(() => undefined) as Promise<Response>,
    );
    const { result } = renderSearchHook();

    act(() => {
      void result.current.handleSubmit("서울 청년");
    });

    await waitFor(() => {
      expect(result.current.isInputDisabled).toBe(true);
    });

    act(() => {
      result.current.resetChat();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.isInputDisabled).toBe(false);
  });
});
