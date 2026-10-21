import { embedQuery } from '@/server/openai';
import {
  resolveSearchIntent,
  formatConditionText,
  type AnalysisResult,
} from '@/features/benefit/server/extract';
import { createBenefitRepository } from '@/features/benefit/server/repository';
import { dedupeBenefitRows, mapBenefitRpcRow } from '@/features/benefit/server/mapper';
import { applyAgeTextFilter, applyConditionFilter, applyContextFilter, applyRelevanceRerank } from '@/features/benefit/server/ranking';
import type { SearchOptions, SearchResponse } from '@/features/benefit/types';

const MIN_REGIONAL_CANDIDATES = 120;
const MIN_BROAD_CANDIDATES = 80;

/** 대화형 검색: 조건 추출 -> 질문 또는 검색 */
export async function searchBenefits(options: SearchOptions): Promise<SearchResponse> {
  const { query, history = [], matchCount = 10, matchThreshold = 0.3 } = options;

  // 1. 코드 기반 조건 추출
  const analysis: AnalysisResult = resolveSearchIntent(query, history);

  if (analysis.action === 'ask') {
    return {
      type: 'question',
      message: analysis.followUpQuestion ?? '조금 더 알려주시면 정확한 혜택을 찾아드릴게요!',
      conditions: analysis.conditions,
    };
  }

  // 2. 하이브리드 검색 실행 (벡터 + 키워드 + RRF)
  const conditions = analysis.conditions;
  const searchText = conditions.searchQuery;
  const queryEmbedding = await embedQuery(searchText);

  const repository = createBenefitRepository();

  const baseRpcParams = {
    query_embedding: JSON.stringify(queryEmbedding),
    query_text: searchText,
    match_threshold: matchThreshold,
  };

  const [regionalRows, broadRows] = await Promise.all([
    repository.searchCandidates({
      ...baseRpcParams,
      region_filter: conditions.region,
      province_filter: conditions.regionProvince,
      match_count: Math.max(matchCount * 8, MIN_REGIONAL_CANDIDATES),
    }),
    conditions.region
      ? repository.searchCandidates({
        ...baseRpcParams,
        region_filter: null,
        province_filter: null,
        match_count: Math.max(matchCount * 4, MIN_BROAD_CANDIDATES),
      })
      : Promise.resolve([]),
  ]);

  let results = dedupeBenefitRows([...regionalRows, ...broadRows]).map(mapBenefitRpcRow);

  // 3. JA 코드 기반 필터
  results = await applyConditionFilter(results, conditions, repository);

  // 4. 텍스트 기반 연령/대상 불일치 필터
  if (conditions.age !== null) {
    results = applyAgeTextFilter(results, conditions.age);
  }

  // 5. 컨텍스트 불일치 필터
  results = applyContextFilter(results, query);

  // 6. 조건/지역/키워드 기반 최종 재정렬
  results = applyRelevanceRerank(results, query, conditions);

  const finalResults = results.slice(0, matchCount);
  const condText = formatConditionText(conditions, query);

  const message = finalResults.length > 0
    ? `${condText ? condText + ' 기준으로 ' : ''}${finalResults.length}건의 혜택을 찾았습니다.`
    : '조건에 맞는 혜택을 찾지 못했습니다. 다른 키워드로 검색해보세요.';

  return { type: 'results', message, results: finalResults, conditions, condText };
}
