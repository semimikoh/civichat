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

  const hook = renderHook(() =>
    useChatSearchStream<TestResult>({
      apiUrl: "/api/test/search",
      buildBody,
      calcExtraHeight,
    }),
  );

  return { ...hook, buildBody, calcExtraHeight };
}

function lastAssistantId(messages: Array<{ id: string; role: string }>) {
  const last = messages.at(-1);
  if (!last || last.role !== "assistant") throw new Error("assistant 메시지가 없습니다");
  return last.id;
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
    const { result, buildBody, calcExtraHeight } = renderSearchHook();

    await act(async () => {
      await result.current.handleSubmit("서울 청년 주거");
    });

    expect(buildBody).toHaveBeenCalledWith("서울 청년 주거", [
      { id: expect.any(String), role: "user", content: "서울 청년 주거" },
    ]);
    expect(calcExtraHeight).toHaveBeenCalledWith([{ id: 1 }]);
    expect(result.current.messages).toEqual([
      { id: expect.any(String), role: "user", content: "서울 청년 주거" },
      {
        id: expect.any(String),
        role: "assistant",
        content: "1건을 찾았습니다.",
        results: [{ id: 1 }],
        condText: "서울 / 청년",
        query: "서울 청년 주거",
        extraHeight: 42,
        summary: "요약입니다",
      },
    ]);
    expect(result.current.isSearching).toBe(false);
  });

  it("응답 애니메이션이 끝날 때까지 입력을 막는다", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      streamResponse([{ type: SSE_EVENT.RESULTS, message: "1건", results: [{ id: 1 }] }]),
    );
    const { result } = renderSearchHook();

    await act(async () => {
      await result.current.handleSubmit("서울 청년 주거");
    });
    expect(result.current.isInputDisabled).toBe(true);

    act(() => {
      result.current.markMessageAnimated(lastAssistantId(result.current.messages));
    });
    expect(result.current.isInputDisabled).toBe(false);
  });

  it("요약 생성에 실패해도 이미 받은 검색 결과는 유지한다", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      streamResponse([
        { type: SSE_EVENT.RESULTS, message: "1건을 찾았습니다.", results: [{ id: 1 }] },
        { type: SSE_EVENT.SUMMARY_DONE, error: "요약 생성 중 오류가 발생했습니다." },
      ]),
    );
    const { result } = renderSearchHook();

    await act(async () => {
      await result.current.handleSubmit("서울 청년 주거");
    });

    expect(result.current.messages.at(-1)).toMatchObject({
      role: "assistant",
      content: "1건을 찾았습니다.",
      results: [{ id: 1 }],
      summaryError: "요약 생성 중 오류가 발생했습니다.",
    });
  });

  it("서버 오류 응답의 에러 문구를 보여준다", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      Response.json({ error: "요청이 너무 많습니다." }, { status: 429 }),
    );
    const { result } = renderSearchHook();

    await act(async () => {
      await result.current.handleSubmit("서울 청년 주거");
    });

    expect(result.current.messages.at(-1)).toMatchObject({
      role: "assistant",
      content: "오류가 발생했습니다: 요청이 너무 많습니다.",
    });
  });

  it("JSON 질문 응답을 assistant 메시지로 치환한다", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      Response.json({ message: "어느 지역에 거주하고 계신가요?" }),
    );
    const { result } = renderSearchHook();

    await act(async () => {
      await result.current.handleSubmit("청년 주거");
    });

    expect(result.current.messages).toEqual([
      { id: expect.any(String), role: "user", content: "청년 주거" },
      { id: expect.any(String), role: "assistant", content: "어느 지역에 거주하고 계신가요?" },
    ]);
    expect(result.current.isSearching).toBe(false);
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
      expect(result.current.isSearching).toBe(true);
    });

    act(() => {
      result.current.resetChat();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.isInputDisabled).toBe(false);
    expect(result.current.isSearching).toBe(false);
  });
});
