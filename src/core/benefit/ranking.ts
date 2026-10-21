import type { ExtractedConditions } from '@/core/benefit/extract';
import { captureError } from '@/core/monitoring/sentry';
import { OccupationLabel, LOW_INCOME_BOOST_THRESHOLD } from '@/core/benefit/extract-patterns';
import type { BenefitRepository } from '@/core/benefit/repository';
import type { SearchResult } from '@/core/benefit/types';
import {
  CLOSED_PATTERN,
  INTENT_RULES,
  RANKING_WEIGHT,
  REGION_NATIONWIDE_PATTERN,
  TARGET_RULES,
  TOPIC_FILTERS,
} from '@/core/benefit/ranking-rules';

interface RankableBenefit {
  serviceName: string;
  servicePurpose: string;
  supportType: string;
  targetAudience: string;
  selectionCriteria: string;
  supportContent: string;
  applicationDeadline: string;
  managingAgency: string;
  similarity: number;
}

export interface RelevanceScoreBreakdown {
  base: number;
  keyword: number;
  region: number;
  condition: number;
  intent: number;
  target: number;
  closed: number;
  final: number;
}

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

function getSearchableText(result: RankableBenefit, includeSupportType = true): string {
  return [
    result.serviceName,
    result.servicePurpose,
    result.targetAudience,
    result.selectionCriteria,
    result.supportContent,
    includeSupportType ? result.supportType : '',
  ].join(' ');
}

function calcRegionBoost(result: RankableBenefit, conditions: ExtractedConditions): number {
  if (!conditions.region) return 0;

  const agency = result.managingAgency;
  if (agency.includes(conditions.region)) return RANKING_WEIGHT.regionCityMatch;
  if (conditions.regionProvince && agency.includes(conditions.regionProvince)) return RANKING_WEIGHT.regionProvinceMatch;
  if (REGION_NATIONWIDE_PATTERN.test(agency)) return RANKING_WEIGHT.regionNationwide;

  return RANKING_WEIGHT.regionMismatch;
}

function calcConditionBoost(result: RankableBenefit, conditions: ExtractedConditions): number {
  const text = getSearchableText(result);
  let score = 0;

  if (conditions.occupation && text.includes(conditions.occupation.split('/')[0])) score += RANKING_WEIGHT.occupationLabelMatch;
  if (conditions.occupation === OccupationLabel.JOB_SEEKER && /미취업|구직|취업|일자리|청년/.test(text)) score += RANKING_WEIGHT.jobSeekerMatch;
  if (conditions.occupation === OccupationLabel.PREGNANT && /임산부|임신|산모|출산/.test(text)) score += RANKING_WEIGHT.pregnantMatch;
  if (conditions.occupation === OccupationLabel.SMALL_BUSINESS && /소상공인|자영업|사업자|경영|창업/.test(text)) score += RANKING_WEIGHT.smallBusinessMatch;
  if (conditions.occupation === OccupationLabel.SINGLE_PARENT && /한부모|양육|미혼모|미혼부/.test(text)) score += RANKING_WEIGHT.singleParentMatch;
  if (conditions.maritalStatus === '신혼' && /신혼|부부|혼인|전세|주택/.test(text)) score += RANKING_WEIGHT.newlywedMatch;
  if (conditions.housingType && text.includes(conditions.housingType)) score += RANKING_WEIGHT.housingTypeMatch;
  if (conditions.income !== null && conditions.income <= LOW_INCOME_BOOST_THRESHOLD && /저소득|기초생활|수급|차상위|중위소득/.test(text)) score += RANKING_WEIGHT.lowIncomeMatch;
  if (conditions.age !== null && conditions.age < 40 && /청년|청소년|대학생/.test(text)) score += RANKING_WEIGHT.youthMatch;
  if (conditions.age !== null && conditions.age >= 60 && /노인|어르신|고령|시니어/.test(text)) score += RANKING_WEIGHT.seniorMatch;

  return score;
}

function calcPatternBoost(result: RankableBenefit, userQuery: string, rules: { queryPattern: RegExp; textPattern: RegExp }[], hit: number, miss: number): number {
  const text = getSearchableText(result);
  let score = 0;

  for (const rule of rules) {
    if (!rule.queryPattern.test(userQuery)) continue;
    score += rule.textPattern.test(text) ? hit : miss;
  }

  return score;
}

/** 가산점을 반영한 score로 재정렬한다. 원본 similarity는 건드리지 않는다. */
export function applyRelevanceRerank<TBenefit extends RankableBenefit & { score: number }>(
  results: TBenefit[],
  userQuery: string,
  conditions: ExtractedConditions,
): TBenefit[] {
  const queryWords = tokenizeQuery(userQuery, conditions);

  return results
    .map((result) => ({
      ...result,
      score: scoreBenefitRelevance(result, userQuery, conditions, queryWords).final,
    }))
    .sort((a, b) => b.score - a.score);
}

export function scoreBenefitRelevance(
  result: RankableBenefit,
  userQuery: string,
  conditions: ExtractedConditions,
  queryWords = tokenizeQuery(userQuery, conditions),
): RelevanceScoreBreakdown {
  const nameMatches = countMatches(result.serviceName, queryWords);
  const body = [
    result.servicePurpose,
    result.targetAudience,
    result.selectionCriteria,
    result.supportContent,
  ].join(' ');
  const bodyMatches = countMatches(body, queryWords);
  const keyword = Math.min(
    nameMatches * RANKING_WEIGHT.keywordName + bodyMatches * RANKING_WEIGHT.keywordBody,
    RANKING_WEIGHT.keywordMaxBoost,
  );
  const region = calcRegionBoost(result, conditions);
  const condition = calcConditionBoost(result, conditions);
  const intent = calcPatternBoost(result, userQuery, INTENT_RULES, RANKING_WEIGHT.intentMatch, RANKING_WEIGHT.intentMismatch);
  const target = calcPatternBoost(result, userQuery, TARGET_RULES, RANKING_WEIGHT.targetMatch, RANKING_WEIGHT.targetMismatch);
  const closed = CLOSED_PATTERN.test(`${result.applicationDeadline} ${result.serviceName}`) ? RANKING_WEIGHT.closedPenalty : 0;
  const rawFinal = result.similarity + keyword + region + condition + intent + target + closed;

  return {
    base: result.similarity,
    keyword,
    region,
    condition,
    intent,
    target,
    closed,
    // 상한을 두지 않는다 — 1로 자르면 가산점을 많이 받은 결과끼리 동점이 되어 순서가 뭉개진다
    final: Math.max(0, rawFinal),
  };
}

export function applyContextFilter<TBenefit extends RankableBenefit>(results: TBenefit[], userQuery: string): TBenefit[] {
  return results.filter((result) => {
    const text = `${result.serviceName} ${result.targetAudience}`;
    return TOPIC_FILTERS.every(({ queryPattern, textPattern }) =>
      queryPattern.test(userQuery) || !textPattern.test(text),
    );
  });
}

/** JA 코드(구조화 조건)를 이용한 필터. DB 조회가 필요해 async. */
export async function applyConditionFilter(
  results: SearchResult[],
  conditions: ExtractedConditions,
  repository: BenefitRepository,
): Promise<SearchResult[]> {
  if (conditions.age === null && !conditions.gender && !conditions.occupation) {
    return results;
  }

  const serviceIds = results.map((r) => r.serviceId);
  if (serviceIds.length === 0) return results;

  let conditionRows;
  try {
    conditionRows = await repository.getConditionRows(serviceIds);
  } catch (err) {
    // 조건 필터는 보조 단계라 실패해도 검색은 계속하되, 조용히 삼키지 않고 보고한다
    captureError(err, { source: 'benefit-condition-filter' });
    return results;
  }

  const condMap = new Map(conditionRows.map((c) => [c.service_id, c]));

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

export function applyAgeTextFilter<TBenefit extends RankableBenefit>(results: TBenefit[], age: number): TBenefit[] {
  return results.filter((result) => {
    const text = `${result.serviceName} ${result.targetAudience}`;
    if (age < 40 && /중장년|노인|만\s*6[0-9]세\s*이상|만\s*65세/.test(text)) return false;
    if (age >= 20 && /어린이|아동/.test(text)) return false;
    if (age >= 20 && /청소년/.test(text) && !/청년/.test(text)) return false;

    const minAgeMatch = text.match(/만\s*(\d{2,3})\s*세\s*이상/);
    if (!minAgeMatch) return true;

    const minAge = parseInt(minAgeMatch[1], 10);
    return age >= minAge;
  });
}
