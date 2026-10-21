/** 대화 맥락(이전 조건·이전 질문)을 버리고 새로 시작하라는 입력 (복지/법령 공통) */
const CONTEXT_RESET_PATTERN = /^(초기화|리셋|reset|다시\s*검색|새로\s*검색|처음부터|다른\s*주제)/i;

export function isContextReset(text: string): boolean {
  return CONTEXT_RESET_PATTERN.test(text.trim());
}
