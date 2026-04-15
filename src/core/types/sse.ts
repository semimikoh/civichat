/** SSE 이벤트 타입 상수 (route.ts, ChatContainer.tsx 공유) */
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
  text?: string;
  error?: string;
}
