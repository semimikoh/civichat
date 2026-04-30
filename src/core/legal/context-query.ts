import type { ConversationMessage } from '@/core/types/conversation';

const LEGAL_CONTEXT_RESET_PATTERN = /^(초기화|리셋|reset|처음부터|새로\s*검색|다른\s*주제)/i;
const LEGAL_FOLLOW_UP_PATTERN = /^(그|이|위|해당|관련|그러면|그럼|그중|거기|추가로|그리고)\b|[?？]$|^(비율|벌칙|예외|요건|대상|절차|신고|처벌|의무|기간|방법|조건|근거|조항|조문|내용|얼마|몇|언제|어디)(은|는|이|가|도|만|부터|부터야|이야|인가|일까|일까\?|은\?)?/;

function normalizeHistoryText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\[[^\]]+\]/g, ' ')
    .trim();
}

function isStandaloneLawQuery(query: string): boolean {
  const normalized = query.trim();
  const words = normalized.split(/\s+/).filter(Boolean);

  if (normalized.length >= 18) return true;
  if (words.length >= 4) return true;
  if (/법|법령|시행령|시행규칙|조문|조항|제\d+조/.test(normalized) && words.length >= 2) return true;

  return false;
}

function isFollowUpLawQuery(query: string): boolean {
  const normalized = query.trim();
  const words = normalized.split(/\s+/).filter(Boolean);

  if (LEGAL_CONTEXT_RESET_PATTERN.test(normalized)) return false;
  if (isStandaloneLawQuery(normalized)) return false;

  return normalized.length <= 20 && (words.length <= 3 || LEGAL_FOLLOW_UP_PATTERN.test(normalized));
}

export function buildContextualLawQuery(query: string, history: ConversationMessage[] = []): string {
  const normalizedQuery = normalizeHistoryText(query);
  if (!normalizedQuery || !isFollowUpLawQuery(normalizedQuery)) return normalizedQuery;

  const recentUserQueries = history
    .filter((msg) => msg.role === 'user')
    .map((msg) => normalizeHistoryText(msg.content))
    .filter(Boolean)
    .slice(-2);

  if (recentUserQueries.length === 0) return normalizedQuery;

  const context = recentUserQueries.filter((text) => text !== normalizedQuery);
  if (context.length === 0) return normalizedQuery;

  return [...context, normalizedQuery].join(' ');
}
