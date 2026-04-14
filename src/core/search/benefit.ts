import { z } from 'zod';
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

const rpcRowSchema = z.object({
  service_id: z.string(),
  service_name: z.string(),
  service_purpose: z.string(),
  support_type: z.string(),
  target_audience: z.string(),
  selection_criteria: z.string(),
  support_content: z.string(),
  application_method: z.string(),
  application_deadline: z.string(),
  contact_agency: z.string(),
  contact_phone: z.string(),
  online_application_url: z.string(),
  detail_url: z.string(),
  managing_agency: z.string(),
  law: z.string(),
  similarity: z.number(),
});

const condRowSchema = z.object({
  service_id: z.string(),
  age_start: z.number().nullable(),
  age_end: z.number().nullable(),
  gender: z.array(z.string()).nullable(),
  occupation: z.array(z.string()).nullable(),
});

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

// --- 서비스명 매칭 부스트: 쿼리 키워드가 서비스명에 포함되면 유사도 가산 ---

function applyNameBoost(results: SearchResult[], userQuery: string): SearchResult[] {
  const queryWords = userQuery.replace(/[^가-힣a-zA-Z0-9\s]/g, '').split(/\s+/).filter((w) => w.length >= 2);
  if (queryWords.length === 0) return results;

  const boosted = results.map((r) => {
    const name = r.serviceName;
    const matchCount = queryWords.filter((w) => name.includes(w)).length;
    const matchRatio = matchCount / queryWords.length;
    // 서비스명에 쿼리 키워드가 많이 겹칠수록 부스트 (최대 +0.15)
    const boost = matchRatio * 0.15;
    return { ...r, similarity: Math.min(r.similarity + boost, 1) };
  });

  return boosted.sort((a, b) => b.similarity - a.similarity);
}

// --- 컨텍스트 불일치 필터: 사용자가 언급하지 않은 특수 대상 서비스 제외 ---

const TOPIC_FILTERS: { queryPattern: RegExp; textPattern: RegExp }[] = [
  { queryPattern: /임산부|임신|산모|출산|아기|난임/, textPattern: /임산부|임신|산모|산전|산후|난임|분만/ },
  { queryPattern: /장애/, textPattern: /장애인|장애아/ },
  { queryPattern: /보훈|국가유공/, textPattern: /보훈|국가유공/ },
  { queryPattern: /결혼|혼인|기혼|신혼|웨딩/, textPattern: /결혼|혼인|신혼/ },
  { queryPattern: /자립|보호종료|아동복지시설|퇴소|가정위탁|위탁/, textPattern: /자립준비|자립지원|보호종료|가정위탁|보호아동/ },
  { queryPattern: /다문화|이주|외국인/, textPattern: /다문화|이주여성/ },
  { queryPattern: /농업|어업|축산|임업|농민|어민/, textPattern: /농업인|어업인|축산|임산물/ },
  { queryPattern: /군인|병사|전역|제대/, textPattern: /병사|전역|군인/ },
];

function applyContextFilter(results: SearchResult[], userQuery: string): SearchResult[] {
  return results.filter((r) => {
    const text = r.serviceName + ' ' + r.targetAudience;
    return TOPIC_FILTERS.every(({ queryPattern, textPattern }) =>
      queryPattern.test(userQuery) || !textPattern.test(text),
    );
  });
}

function applyAgeTextFilter(results: SearchResult[], age: number): SearchResult[] {
  return results.filter((r) => {
    const text = r.serviceName + ' ' + r.targetAudience;
    if (age < 40 && /중장년|노인|만\s*6[0-9]세\s*이상|만\s*65세/.test(text)) return false;
    if (age >= 20 && /어린이|아동/.test(text)) return false;
    if (age >= 20 && /청소년/.test(text) && !/청년/.test(text)) return false;
    const minAgeMatch = text.match(/만\s*(\d{2,3})\s*세\s*이상/);
    if (minAgeMatch) {
      const minAge = parseInt(minAgeMatch[1], 10);
      if (age < minAge) return false;
    }
    return true;
  });
}

async function applyConditionFilter(
  results: SearchResult[],
  conditions: ExtractedConditions,
  supabase: ReturnType<typeof getSupabaseClient>,
): Promise<SearchResult[]> {
  if (conditions.age === null && !conditions.gender && !conditions.occupation) {
    return results;
  }

  const serviceIds = results.map((r) => r.serviceId);
  if (serviceIds.length === 0) return results;

  const { data: condData, error: condError } = await supabase
    .from('benefit_conditions')
    .select('service_id, age_start, age_end, gender, occupation')
    .in('service_id', serviceIds);

  if (condError) {
    console.error('benefit_conditions 조회 실패:', condError.message);
    return results;
  }

  const parsedConds = z.array(condRowSchema).safeParse(condData);
  if (!parsedConds.success) {
    console.error('benefit_conditions 파싱 실패:', parsedConds.error.message);
    return results;
  }

  const condMap = new Map(parsedConds.data.map((c) => [c.service_id, c]));

  return results.filter((r) => {
    const cond = condMap.get(r.serviceId);
    if (!cond) return true;

    if (conditions.age !== null) {
      if (cond.age_start !== null && cond.age_end !== null) {
        if (conditions.age < cond.age_start || conditions.age > cond.age_end) return false;
      }
    }

    if (conditions.gender) {
      if (cond.gender && cond.gender.length > 0 && !cond.gender.includes(conditions.gender)) {
        return false;
      }
    }

    if (conditions.occupation) {
      if (cond.occupation && cond.occupation.length > 0
        && !cond.occupation.includes(conditions.occupation)
        && !cond.occupation.includes('해당사항없음')) {
        return false;
      }
    }

    return true;
  });
}

/** 대화형 검색: 조건 추출 -> 질문 또는 검색 */
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

  // 2. 하이브리드 검색 실행 (벡터 + 키워드 + RRF)
  const conditions = analysis.conditions;
  const searchText = conditions.region
    ? conditions.keywords.join(' ') || conditions.searchQuery
    : conditions.searchQuery;
  const [queryEmbedding] = await embedTexts([searchText]);

  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('match_benefits_hybrid', {
    query_embedding: JSON.stringify(queryEmbedding),
    query_text: searchText,
    region_filter: conditions.region,
    province_filter: conditions.regionProvince,
    match_threshold: matchThreshold,
    match_count: matchCount * 5,
  });

  if (error) {
    throw new Error(`하이브리드 검색 실패: ${error.message}`);
  }

  const parsed = z.array(rpcRowSchema).safeParse(data ?? []);
  if (!parsed.success) {
    throw new Error(`RPC 응답 파싱 실패: ${parsed.error.message}`);
  }

  let results: SearchResult[] = parsed.data.map((row) => ({
    serviceId: row.service_id,
    serviceName: row.service_name,
    servicePurpose: row.service_purpose,
    supportType: row.support_type,
    targetAudience: row.target_audience,
    selectionCriteria: row.selection_criteria,
    supportContent: row.support_content,
    applicationMethod: row.application_method,
    applicationDeadline: row.application_deadline,
    contactAgency: row.contact_agency,
    contactPhone: row.contact_phone,
    onlineApplicationUrl: row.online_application_url,
    detailUrl: row.detail_url,
    managingAgency: row.managing_agency,
    law: row.law,
    similarity: row.similarity,
  }));

  // 3. JA 코드 기반 필터
  results = await applyConditionFilter(results, conditions, supabase);

  // 4. 텍스트 기반 연령/대상 불일치 필터
  if (conditions.age !== null) {
    results = applyAgeTextFilter(results, conditions.age);
  }

  // 5. 컨텍스트 불일치 필터
  results = applyContextFilter(results, query);

  // 6. 서비스명 매칭 부스트
  results = applyNameBoost(results, query);

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
