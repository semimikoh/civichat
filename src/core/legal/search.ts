import { z } from 'zod';
import { getSupabaseClient } from '@/core/db/supabase';
import { embedQuery } from '@/core/embeddings/openai';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

const rpcRowSchema = z.object({
  id: z.number(),
  law_title: z.string(),
  law_type: z.string(),
  chapter: z.string().nullable(),
  article_number: z.string(),
  article_title: z.string(),
  article_content: z.string(),
  source_url: z.string().nullable(),
  similarity: z.number(),
});

export interface LawSearchResult {
  id: number;
  lawTitle: string;
  lawType: string;
  chapter: string;
  articleNumber: string;
  articleTitle: string;
  articleContent: string;
  sourceUrl: string;
  similarity: number;
}

export interface LawSearchResponse {
  message: string;
  results: LawSearchResult[];
  query: string;
}

export interface LawSearchOptions {
  query: string;
  history?: ConversationMessage[];
  matchCount?: number;
  matchThreshold?: number;
}

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

function mapRow(row: z.infer<typeof rpcRowSchema>): LawSearchResult {
  return {
    id: row.id,
    lawTitle: row.law_title,
    lawType: row.law_type,
    chapter: row.chapter ?? '',
    articleNumber: row.article_number,
    articleTitle: row.article_title,
    articleContent: row.article_content,
    sourceUrl: row.source_url ?? '',
    similarity: row.similarity,
  };
}

/** 법령 조문 하이브리드 검색 (벡터 + 키워드 RRF) */
export async function searchLawArticles(options: LawSearchOptions): Promise<LawSearchResponse> {
  const { query, history = [], matchCount = 10, matchThreshold = 0.3 } = options;
  const effectiveQuery = buildContextualLawQuery(query, history);

  const queryEmbedding = await embedQuery(effectiveQuery);
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('match_law_articles_hybrid', {
    query_embedding: JSON.stringify(queryEmbedding),
    query_text: effectiveQuery,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    throw new Error(`법령 검색 실패: ${error.message}`);
  }

  const parsed = z.array(rpcRowSchema).safeParse(data ?? []);
  if (!parsed.success) {
    throw new Error(`RPC 응답 파싱 실패: ${parsed.error.message}`);
  }

  const results = parsed.data.map(mapRow);

  const message = results.length > 0
    ? `${results.length}건의 관련 법령 조문을 찾았습니다.`
    : '관련 법령 조문을 찾지 못했습니다. 다른 키워드로 검색해보세요.';

  return { message, results, query: effectiveQuery };
}

/** 법령명으로 해당 법령의 조문 목록 조회 (복지 서비스 → 법령 연결용) */
export async function getLawArticlesByTitle(lawTitle: string): Promise<LawSearchResult[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('get_law_articles_by_title', {
    target_law_title: lawTitle,
  });

  if (error) {
    throw new Error(`법령 조회 실패: ${error.message}`);
  }

  const rowSchema = rpcRowSchema.omit({ similarity: true });
  const parsed = z.array(rowSchema).safeParse(data ?? []);
  if (!parsed.success) {
    throw new Error(`RPC 응답 파싱 실패: ${parsed.error.message}`);
  }

  return parsed.data.map((row) => mapRow({ ...row, similarity: 1 }));
}
