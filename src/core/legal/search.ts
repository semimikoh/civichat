import { z } from 'zod';
import { getSupabaseClient } from '@/core/db/supabase';
import { embedTexts } from '@/core/embeddings/openai';

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
}

export interface LawSearchOptions {
  query: string;
  matchCount?: number;
  matchThreshold?: number;
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
  const { query, matchCount = 10, matchThreshold = 0.3 } = options;

  const embeddings = await embedTexts([query]);
  if (embeddings.length === 0) {
    throw new Error('임베딩 생성 실패: 빈 결과');
  }
  const [queryEmbedding] = embeddings;
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('match_law_articles_hybrid', {
    query_embedding: JSON.stringify(queryEmbedding),
    query_text: query,
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

  return { message, results };
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
