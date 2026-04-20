import { z } from 'zod';
import { getSupabaseClient } from '@/core/db/supabase';
import { embedQuery } from '@/core/embeddings/openai';
import {
  analyzeQuery,
  formatConditionText,
  type AnalysisResult,
  type ExtractedConditions,
  type ConversationMessage,
} from '@/core/benefit/extract';
import { OccupationLabel, LOW_INCOME_ANNUAL } from '@/core/benefit/extract-patterns';
export { summarizeResults } from '@/core/benefit/summarize';
export type { ConversationMessage } from '@/core/benefit/extract';

const nullableStr = z.string().nullable().transform((v) => v ?? '');

const rpcRowSchema = z.object({
  service_id: z.string(),
  service_name: z.string(),
  service_purpose: nullableStr,
  support_type: nullableStr,
  target_audience: nullableStr,
  selection_criteria: nullableStr,
  support_content: nullableStr,
  application_method: nullableStr,
  application_deadline: nullableStr,
  contact_agency: nullableStr,
  contact_phone: nullableStr,
  online_application_url: nullableStr,
  detail_url: nullableStr,
  managing_agency: nullableStr,
  law: nullableStr,
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

type BenefitRpcParams = {
  query_embedding: string;
  query_text: string;
  region_filter: string | null;
  province_filter: string | null;
  match_threshold: number;
  match_count: number;
};

// --- 최종 재정렬: 검색 점수 + 조건/지역/주제 매칭을 합산 ---

const REGION_NATIONWIDE_PATTERN = /전국|공통|중앙|보건복지부|고용노동부|여성가족부|국토교통부|중소벤처기업부/;
const CLOSED_PATTERN = /마감|종료|폐지|중단|만료/;
const MIN_REGIONAL_CANDIDATES = 120;
const MIN_BROAD_CANDIDATES = 80;

const INTENT_RULES: { queryPattern: RegExp; textPattern: RegExp }[] = [
  { queryPattern: /취업|구직|일자리|고용|채용|직업|면접|취준/, textPattern: /취업|구직|일자리|고용|채용|직업|면접|자격|일경험/ },
  { queryPattern: /교통비|교통|이동|택시/, textPattern: /교통|이동|택시|교통비/ },
  { queryPattern: /의료비|의료|병원|건강|진료|치료비/, textPattern: /의료|병원|건강|진료|치료|입원|유급병가/ },
  { queryPattern: /주거|주택|전세|월세|임대|무주택|이사/, textPattern: /주거|주택|전세|월세|임대|임차|보증금|이사|중개/ },
  { queryPattern: /창업|사업|자영|소상공인|경영|대출|융자/, textPattern: /창업|사업|자영|소상공인|경영|대출|융자|자금|고용보험/ },
  { queryPattern: /교육비|교육|학비|장학|입학/, textPattern: /교육|학비|장학|입학|통학|학생/ },
  { queryPattern: /돌봄|요양|간병/, textPattern: /돌봄|요양|간병|보호/ },
  { queryPattern: /에너지|바우처|난방|전기|가스/, textPattern: /에너지|바우처|난방|전기|가스|공동관리비|태양광/ },
  { queryPattern: /양육비|양육|보육|아동|아이|자녀/, textPattern: /양육|보육|아동|아이|자녀|돌봄/ },
];

const TARGET_RULES: { queryPattern: RegExp; textPattern: RegExp }[] = [
  { queryPattern: /청년|취준생|20대|30대/, textPattern: /청년|대학생|미취업/ },
  { queryPattern: /다문화|이주|외국인/, textPattern: /다문화|이주|외국인|결혼이민/ },
  { queryPattern: /한부모|싱글맘|싱글대디|미혼모|미혼부/, textPattern: /한부모|미혼모|미혼부/ },
  { queryPattern: /임산부|임신|산모|출산/, textPattern: /임산부|임신|산모|출산/ },
  { queryPattern: /장애/, textPattern: /장애/ },
  { queryPattern: /보훈|국가유공/, textPattern: /보훈|국가유공/ },
  { queryPattern: /신혼|신혼부부|결혼\s*예정/, textPattern: /신혼|부부|혼인|출산가구/ },
  { queryPattern: /노인|어르신|고령|70대|60대/, textPattern: /노인|어르신|고령|요양/ },
];

function tokenizeQuery(userQuery: string, conditions: ExtractedConditions): string[] {
  const words = userQuery
    .replace(/[^가-힣a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  return [...new Set([...words, ...conditions.keywords])];
}

function countMatches(text: string, words: string[]): number {
  return words.reduce((count, word) => count + (text.includes(word) ? 1 : 0), 0);
}

function calcRegionBoost(result: SearchResult, conditions: ExtractedConditions): number {
  if (!conditions.region) return 0;

  const agency = result.managingAgency;
  if (agency.includes(conditions.region)) return 0.12;
  if (conditions.regionProvince && agency.includes(conditions.regionProvince)) return 0.08;
  if (REGION_NATIONWIDE_PATTERN.test(agency)) return 0.03;

  return -0.06;
}

function calcConditionBoost(result: SearchResult, conditions: ExtractedConditions): number {
  const text = [
    result.serviceName,
    result.servicePurpose,
    result.targetAudience,
    result.selectionCriteria,
    result.supportContent,
    result.supportType,
  ].join(' ');

  let score = 0;

  if (conditions.occupation && text.includes(conditions.occupation.split('/')[0])) score += 0.08;
  if (conditions.occupation === OccupationLabel.JOB_SEEKER && /미취업|구직|취업|일자리|청년/.test(text)) score += 0.1;
  if (conditions.occupation === OccupationLabel.PREGNANT && /임산부|임신|산모|출산/.test(text)) score += 0.12;
  if (conditions.occupation === OccupationLabel.SMALL_BUSINESS && /소상공인|자영업|사업자|경영|창업/.test(text)) score += 0.12;
  if (conditions.occupation === OccupationLabel.SINGLE_PARENT && /한부모|양육|미혼모|미혼부/.test(text)) score += 0.12;
  if (conditions.maritalStatus === '신혼' && /신혼|부부|혼인|전세|주택/.test(text)) score += 0.1;
  if (conditions.housingType && text.includes(conditions.housingType)) score += 0.06;
  if (conditions.income !== null && conditions.income <= LOW_INCOME_ANNUAL && /저소득|기초생활|수급|차상위|중위소득/.test(text)) score += 0.1;
  if (conditions.age !== null && conditions.age < 40 && /청년|청소년|대학생/.test(text)) score += 0.06;
  if (conditions.age !== null && conditions.age >= 60 && /노인|어르신|고령|시니어/.test(text)) score += 0.1;

  return score;
}

function calcIntentBoost(result: SearchResult, userQuery: string): number {
  const text = [
    result.serviceName,
    result.servicePurpose,
    result.targetAudience,
    result.selectionCriteria,
    result.supportContent,
    result.supportType,
  ].join(' ');

  let score = 0;
  for (const rule of INTENT_RULES) {
    if (!rule.queryPattern.test(userQuery)) continue;
    score += rule.textPattern.test(text) ? 0.18 : -0.12;
  }

  return score;
}

function calcTargetBoost(result: SearchResult, userQuery: string): number {
  const text = [
    result.serviceName,
    result.servicePurpose,
    result.targetAudience,
    result.selectionCriteria,
    result.supportContent,
  ].join(' ');

  let score = 0;
  for (const rule of TARGET_RULES) {
    if (!rule.queryPattern.test(userQuery)) continue;
    score += rule.textPattern.test(text) ? 0.08 : -0.03;
  }

  return score;
}

function applyRelevanceRerank(
  results: SearchResult[],
  userQuery: string,
  conditions: ExtractedConditions,
): SearchResult[] {
  const queryWords = tokenizeQuery(userQuery, conditions);
  if (queryWords.length === 0) return results;

  const reranked = results.map((result) => {
    const nameMatches = countMatches(result.serviceName, queryWords);
    const body = [
      result.servicePurpose,
      result.targetAudience,
      result.selectionCriteria,
      result.supportContent,
    ].join(' ');
    const bodyMatches = countMatches(body, queryWords);
    const keywordBoost = Math.min(nameMatches * 0.08 + bodyMatches * 0.025, 0.22);
    const regionBoost = calcRegionBoost(result, conditions);
    const conditionBoost = calcConditionBoost(result, conditions);
    const intentBoost = calcIntentBoost(result, userQuery);
    const targetBoost = calcTargetBoost(result, userQuery);
    const closedPenalty = CLOSED_PATTERN.test(`${result.applicationDeadline} ${result.serviceName}`) ? -0.08 : 0;
    const finalScore = result.similarity + keywordBoost + regionBoost + conditionBoost + intentBoost + targetBoost + closedPenalty;

    return {
      ...result,
      similarity: Math.max(0, Math.min(finalScore, 1)),
    };
  });

  return reranked.sort((a, b) => b.similarity - a.similarity);
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

async function searchBenefitCandidates(
  supabase: ReturnType<typeof getSupabaseClient>,
  params: BenefitRpcParams,
) {
  const { data, error } = await supabase.rpc('match_benefits_hybrid', params);

  if (error) {
    throw new Error(`하이브리드 검색 실패: ${error.message}`);
  }

  const parsed = z.array(rpcRowSchema).safeParse(data ?? []);
  if (!parsed.success) {
    throw new Error(`RPC 응답 파싱 실패: ${parsed.error.message}`);
  }

  return parsed.data;
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
  const searchText = conditions.searchQuery;
  const queryEmbedding = await embedQuery(searchText);

  const supabase = getSupabaseClient();

  const baseRpcParams = {
    query_embedding: JSON.stringify(queryEmbedding),
    query_text: searchText,
    match_threshold: matchThreshold,
  };

  const regionalRows = await searchBenefitCandidates(supabase, {
    ...baseRpcParams,
    region_filter: conditions.region,
    province_filter: conditions.regionProvince,
    match_count: Math.max(matchCount * 8, MIN_REGIONAL_CANDIDATES),
  });

  const broadRows = conditions.region
    ? await searchBenefitCandidates(supabase, {
      ...baseRpcParams,
      region_filter: null,
      province_filter: null,
      match_count: Math.max(matchCount * 4, MIN_BROAD_CANDIDATES),
    })
    : [];

  const rowMap = new Map<string, z.infer<typeof rpcRowSchema>>();
  for (const row of [...regionalRows, ...broadRows]) {
    const existing = rowMap.get(row.service_id);
    if (!existing || row.similarity > existing.similarity) {
      rowMap.set(row.service_id, row);
    }
  }

  let results: SearchResult[] = Array.from(rowMap.values()).map((row) => ({
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

  // 6. 조건/지역/키워드 기반 최종 재정렬
  results = applyRelevanceRerank(results, query, conditions);

  const finalResults = results.slice(0, matchCount);
  const condText = formatConditionText(conditions, query);

  const message = finalResults.length > 0
    ? `${condText ? condText + ' 기준으로 ' : ''}${finalResults.length}건의 혜택을 찾았습니다.`
    : '조건에 맞는 혜택을 찾지 못했습니다. 다른 키워드로 검색해보세요.';

  return { type: 'results', message, results: finalResults, conditions, condText };
}
