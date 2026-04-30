import { embedQuery } from '@/core/embeddings/openai';
import { buildContextualLawQuery } from '@/core/legal/context-query';
import { mapLawArticleRpcRow } from '@/core/legal/mapper';
import { createLawRepository } from '@/core/legal/repository';
import type { LawSearchOptions, LawSearchResponse, LawSearchResult } from '@/core/legal/types';

export { buildContextualLawQuery } from '@/core/legal/context-query';
export type { LawSearchOptions, LawSearchResponse, LawSearchResult } from '@/core/legal/types';

/** 법령 조문 하이브리드 검색 (벡터 + 키워드 RRF) */
export async function searchLawArticles(options: LawSearchOptions): Promise<LawSearchResponse> {
  const { query, history = [], matchCount = 10, matchThreshold = 0.3 } = options;
  const effectiveQuery = buildContextualLawQuery(query, history);
  const queryEmbedding = await embedQuery(effectiveQuery);
  const repository = createLawRepository();

  const rows = await repository.searchArticles({
    queryEmbedding,
    queryText: effectiveQuery,
    matchThreshold,
    matchCount,
  });

  const results = rows.map(mapLawArticleRpcRow);

  const message = results.length > 0
    ? `${results.length}건의 관련 법령 조문을 찾았습니다.`
    : '관련 법령 조문을 찾지 못했습니다. 다른 키워드로 검색해보세요.';

  return { message, results, query: effectiveQuery };
}

/** 법령명으로 해당 법령의 조문 목록 조회 (복지 서비스 → 법령 연결용) */
export async function getLawArticlesByTitle(lawTitle: string): Promise<LawSearchResult[]> {
  const repository = createLawRepository();
  const rows = await repository.getArticlesByTitle(lawTitle);
  return rows.map(mapLawArticleRpcRow);
}
