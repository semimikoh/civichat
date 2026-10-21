/** SSE 이벤트 타입 상수 — 서버(검색 API 라우트)와 클라이언트(parse-sse-stream)가 공유하는 계약 */
export const SSE_EVENT = {
  RESULTS: 'results',
  QUESTION: 'question',
  SUMMARY_CHUNK: 'summary_chunk',
  SUMMARY_DONE: 'summary_done',
} as const;

export type SSEEventType = typeof SSE_EVENT[keyof typeof SSE_EVENT];

/** SSE 이벤트 페이로드 (복지/법령 공통) */
export interface SSEEvent<TResults = unknown> {
  type: SSEEventType;
  message?: string;
  results?: TResults[];
  query?: string;
  text?: string;
  error?: string;
  /** 복지 검색: 추출된 조건 텍스트 (예: "26세 / 서울 / 구직자") */
  condText?: string;
}
