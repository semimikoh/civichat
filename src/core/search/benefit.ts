import { getSupabaseClient } from '@/core/db/supabase';
import { embedTexts } from '@/core/embeddings/openai';
import {
  analyzeQuery,
  type AnalysisResult,
  type ExtractedConditions,
  type ConversationMessage,
} from '@/core/search/extract';
export { summarizeResults } from '@/core/search/summarize';
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
  condText?: string;
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

  // 1. 코드 기반 조건 추출
  const analysis: AnalysisResult = analyzeQuery(query, history);

  if (analysis.action === 'ask') {
    return {
      type: 'question',
      message: analysis.followUpQuestion ?? '조금 더 알려주시면 정확한 혜택을 찾아드릴게요!',
      conditions: analysis.conditions,
    };
  }

  // 2. 검색 실행
  const conditions = analysis.conditions;
  // 지역이 있으면 searchQuery에서 지역 제거 (벡터 검색은 주제만)
  const searchText = conditions.region
    ? conditions.keywords.join(' ') || conditions.searchQuery
    : conditions.searchQuery;
  const [queryEmbedding] = await embedTexts([searchText]);

  const supabase = getSupabaseClient();

  let data: Record<string, unknown>[] | null;
  let error: { message: string } | null;

  if (conditions.region) {
    // 지역 필터 + 벡터 검색
    const res = await supabase.rpc('match_benefits_by_region', {
      query_embedding: JSON.stringify(queryEmbedding),
      region_filter: conditions.region,
      province_filter: conditions.regionProvince,
      match_threshold: matchThreshold,
      match_count: matchCount * 5,
    });
    data = res.data;
    error = res.error;
  } else {
    // 벡터 검색만
    const res = await supabase.rpc('match_benefits', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: matchThreshold,
      match_count: matchCount * 10,
    });
    data = res.data;
    error = res.error;
  }

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

  // 4. 텍스트 기반 연령/대상 불일치 필터
  if (conditions.age !== null) {
    const age = conditions.age;
    results = results.filter((r) => {
      const text = r.serviceName + ' ' + r.targetAudience;
      if (age < 40 && /중장년|노인|만\s*6[0-9]세\s*이상|만\s*65세/.test(text)) return false;
      if (age >= 20 && /어린이|아동/.test(text)) return false;
      if (age >= 20 && /청소년/.test(text) && !/청년/.test(text)) return false;
      // "만65세 이상" 같은 패턴에서 최소 나이 추출
      const minAgeMatch = text.match(/만\s*(\d{2,3})\s*세\s*이상/);
      if (minAgeMatch) {
        const minAge = parseInt(minAgeMatch[1], 10);
        if (age < minAge) return false;
      }
      return true;
    });
  }

  // 컨텍스트 불일치 필터: 언급하지 않은 특수 대상 서비스 제외
  const userQuery = options.query;
  results = results.filter((r) => {
    const text = r.serviceName + ' ' + r.targetAudience;

    // 임산부/출산/난임: 관련 키워드 없으면 제외
    if (!(/임산부|임신|산모|출산|아기|난임/.test(userQuery))) {
      if (/임산부|임신|산모|산전|산후|난임|분만/.test(text)) return false;
    }

    // 장애인: 장애 관련 키워드 없으면 제외
    if (!(/장애/.test(userQuery))) {
      if (/장애인|장애아/.test(text)) return false;
    }

    // 보훈: 보훈 관련 키워드 없으면 제외
    if (!(/보훈|국가유공/.test(userQuery))) {
      if (/보훈|국가유공/.test(text)) return false;
    }

    // 결혼/혼인: 결혼 관련 키워드 없으면 제외
    if (!(/결혼|혼인|기혼|신혼|웨딩/.test(userQuery))) {
      if (/결혼|혼인|신혼/.test(text)) return false;
    }

    // 자립/보호종료: 관련 키워드 없으면 제외
    if (!(/자립|보호종료|아동복지시설|퇴소|가정위탁|위탁/.test(userQuery))) {
      if (/자립준비|자립지원|보호종료|가정위탁|보호아동/.test(text)) return false;
    }

    // 다문화: 관련 키워드 없으면 제외
    if (!(/다문화|이주|외국인/.test(userQuery))) {
      if (/다문화|이주여성/.test(text)) return false;
    }

    // 농업/어업/축산: 관련 키워드 없으면 제외
    if (!(/농업|어업|축산|임업|농민|어민/.test(userQuery))) {
      if (/농업인|어업인|축산|임산물/.test(text)) return false;
    }

    // 군인/병사: 관련 키워드 없으면 제외
    if (!(/군인|병사|전역|제대/.test(userQuery))) {
      if (/병사|전역|군인/.test(text)) return false;
    }

    return true;
  });

  // 5. 지역 필터: DB RPC에서 처리됨 (후처리 불필요)

  const finalResults = results.slice(0, matchCount);
  const condParts: string[] = [];
  if (conditions.age) condParts.push(`${conditions.age}세`);
  if (conditions.gender) condParts.push(conditions.gender);
  if (conditions.occupation) condParts.push(conditions.occupation);
  if (conditions.region) condParts.push(conditions.region);
  const condText = condParts.join(' / ');

  const message = finalResults.length > 0
    ? `${condText ? condText + ' 기준으로 ' : ''}${finalResults.length}건의 혜택을 찾았습니다.`
    : '조건에 맞는 혜택을 찾지 못했습니다. 다른 키워드로 검색해보세요.';

  return { type: 'results', message, results: finalResults, conditions, condText };
}
