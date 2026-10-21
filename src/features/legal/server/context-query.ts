import { isContextReset } from '@/server/conversation/reset';
import type { ConversationMessage } from '@/server/conversation/types';

/** 앞 대화를 가리키는 지시어로 시작하는 질문 (예: "그 조항 벌칙은?", "그럼 예외는?") */
const LEGAL_ANAPHORA_PATTERN = /^(?:그중|그럼|그러면|그런|이런|해당|거기|추가로|그리고)|^(?:그|이|위)(?=\s)/;
/** 앞 주제의 특정 측면만 묻는 질문 (예: "비율은?", "벌칙은?") */
const LEGAL_ASPECT_PATTERN = /^(?:비율|벌칙|처벌|과태료|예외|요건|대상|절차|신고|의무|기간|방법|조건|근거|조항|조문|내용|기준|금액|얼마|몇|언제|어디)/;
const MAX_ASPECT_QUERY_WORDS = 3;

function normalizeHistoryText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\[[^\]]+\]/g, ' ')
    .trim();
}

/**
 * 이전 질문의 맥락이 필요한 후속 질문인지 판단한다.
 * 짧다는 이유만으로 후속 질문으로 보지 않는다 — "전세사기 피해"처럼 짧은 새 주제가 앞 질문과 섞이기 때문.
 */
function isFollowUpLawQuery(query: string): boolean {
  if (isContextReset(query)) return false;
  if (LEGAL_ANAPHORA_PATTERN.test(query)) return true;

  const wordCount = query.split(/\s+/).filter(Boolean).length;
  return wordCount <= MAX_ASPECT_QUERY_WORDS && LEGAL_ASPECT_PATTERN.test(query);
}

export function buildContextualLawQuery(query: string, history: ConversationMessage[] = []): string {
  const normalizedQuery = normalizeHistoryText(query);
  if (!normalizedQuery || !isFollowUpLawQuery(normalizedQuery)) return normalizedQuery;

  const context = history
    .filter((msg) => msg.role === 'user')
    .map((msg) => normalizeHistoryText(msg.content))
    .filter((text) => text && text !== normalizedQuery)
    .slice(-2);

  if (context.length === 0) return normalizedQuery;

  return [...context, normalizedQuery].join(' ');
}
