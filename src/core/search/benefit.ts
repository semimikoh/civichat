import { getSupabaseClient } from '@/core/db/supabase';
import { embedTexts } from '@/core/embeddings/openai';
import {
  analyzeQuery,
  type AnalysisResult,
  type ExtractedConditions,
  type ConversationMessage,
} from '@/core/search/extract';

export type { ConversationMessage } from '@/core/search/extract';

export interface SearchResult {
  serviceId: string;
  serviceName: string;
  servicePurpose: string;
  supportType: string;
  targetAudience: string;
  selectionCriteria: string;
  supportContent: string;
  applicationMethod: string;
  applicationDeadline: string;
  contactAgency: string;
  contactPhone: string;
  onlineApplicationUrl: string;
  detailUrl: string;
  managingAgency: string;
  law: string;
  similarity: number;
}

export interface SearchResponse {
  type: 'results' | 'question';
  message: string;
  results?: SearchResult[];
  conditions?: ExtractedConditions;
}

export interface SearchOptions {
  query: string;
  history?: ConversationMessage[];
  matchCount?: number;
  matchThreshold?: number;
}

/** 대화형 검색: LLM 판단 → 질문 또는 검색 */
export async function searchBenefits(options: SearchOptions): Promise<SearchResponse> {
  const { query, history = [], matchCount = 10, matchThreshold = 0.3 } = options;

  // 1. LLM 분석: 검색할지 질문할지 판단
  const analysis: AnalysisResult = await analyzeQuery(query, history);

  if (analysis.action === 'ask') {
    return {
      type: 'question',
      message: analysis.followUpQuestion ?? '조금 더 알려주시면 정확한 혜택을 찾아드릴게요!',
      conditions: analysis.conditions,
    };
  }

  // 2. 검색 실행
  const conditions = analysis.conditions;
  const [queryEmbedding] = await embedTexts([conditions.searchQuery]);

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('match_benefits', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: matchThreshold,
    match_count: matchCount * 5,
  });

  if (error) {
    throw new Error(`벡터 검색 실패: ${error.message}`);
  }

  let results: SearchResult[] = (data ?? []).map((row: Record<string, unknown>) => ({
    serviceId: row.service_id as string,
    serviceName: row.service_name as string,
    servicePurpose: row.service_purpose as string,
    supportType: row.support_type as string,
    targetAudience: row.target_audience as string,
    selectionCriteria: row.selection_criteria as string,
    supportContent: row.support_content as string,
    applicationMethod: row.application_method as string,
    applicationDeadline: row.application_deadline as string,
    contactAgency: row.contact_agency as string,
    contactPhone: row.contact_phone as string,
    onlineApplicationUrl: row.online_application_url as string,
    detailUrl: row.detail_url as string,
    managingAgency: row.managing_agency as string,
    law: row.law as string,
    similarity: row.similarity as number,
  }));

  // 3. JA 코드 기반 필터
  if (conditions.age !== null || conditions.gender || conditions.occupation) {
    const serviceIds = results.map((r) => r.serviceId);

    if (serviceIds.length > 0) {
      const { data: condData } = await supabase
        .from('benefit_conditions')
        .select('service_id, age_start, age_end, gender, occupation')
        .in('service_id', serviceIds);

      if (condData) {
        const condMap = new Map(
          condData.map((c: Record<string, unknown>) => [c.service_id as string, c]),
        );

        results = results.filter((r) => {
          const cond = condMap.get(r.serviceId) as Record<string, unknown> | undefined;
          if (!cond) return true;

          if (conditions.age !== null) {
            const ageStart = cond.age_start as number | null;
            const ageEnd = cond.age_end as number | null;
            if (ageStart !== null && ageEnd !== null) {
              if (conditions.age < ageStart || conditions.age > ageEnd) return false;
            }
          }

          if (conditions.gender) {
            const gender = cond.gender as string[] | null;
            if (gender && gender.length > 0 && !gender.includes(conditions.gender)) {
              return false;
            }
          }

          if (conditions.occupation) {
            const occupation = cond.occupation as string[] | null;
            if (occupation && occupation.length > 0
              && !occupation.includes(conditions.occupation)
              && !occupation.includes('해당사항없음')) {
              return false;
            }
          }

          return true;
        });
      }
    }
  }

  // 4. 지역 우선 정렬
  if (conditions.region) {
    const region = conditions.region;
    results.sort((a, b) => {
      const aMatch = a.managingAgency.includes(region) ? 1 : 0;
      const bMatch = b.managingAgency.includes(region) ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      return b.similarity - a.similarity;
    });
  }

  const finalResults = results.slice(0, matchCount);
  const condParts: string[] = [];
  if (conditions.age) condParts.push(`${conditions.age}세`);
  if (conditions.gender) condParts.push(conditions.gender);
  if (conditions.occupation) condParts.push(conditions.occupation);
  if (conditions.region) condParts.push(conditions.region);

  const condText = condParts.length > 0 ? `${condParts.join(' / ')} 기준으로 ` : '';
  const message = finalResults.length > 0
    ? `${condText}${finalResults.length}건의 혜택을 찾았습니다.`
    : '조건에 맞는 혜택을 찾지 못했습니다. 다른 키워드로 검색해보세요.';

  return { type: 'results', message, results: finalResults, conditions };
}
