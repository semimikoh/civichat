export interface VirtualizableMessage {
  role: 'user' | 'assistant';
  content: string;
  summary?: string;
  /** 도메인이 직접 계산한 추가 높이 (카드, 아코디언 등) */
  extraHeight?: number;
}
