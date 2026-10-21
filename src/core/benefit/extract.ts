// 코드 기반 키워드 파싱.
// 패턴 정의는 extract-patterns.ts에 분리.
import { isContextReset } from '@/core/conversation/reset';
import type { ConversationMessage } from '@/core/types/conversation';
import * as Patterns from './extract-patterns';
import { CITY_TO_PROVINCE, PROVINCE_MAP, SUB_REGION_MAP } from './region-data';

export interface ExtractedConditions {
  age: number | null;
  gender: '남성' | '여성' | null;
  occupation: string | null;
  region: string | null;
  regionProvince: string | null;
  income: number | null; // 연 소득 (만원 단위)
  maritalStatus: string | null;
  householdSize: number | null;
  employmentType: string | null;
  residenceDuration: number | null; // 거주 기간 (개월)
  housingType: string | null;
  insuranceType: string | null;
  education: string | null;
  nationality: string | null;
  keywords: string[];
  searchQuery: string;
}

export interface AnalysisResult {
  action: 'search' | 'ask';
  conditions: ExtractedConditions;
  followUpQuestion?: string;
}

// --- 나이 추출 ---
function extractAge(text: string): number | null {
  for (const match of text.matchAll(Patterns.AGE_EXACT_PATTERN)) {
    const before = text.slice(0, match.index);
    const after = text.slice(match.index + match[0].length);
    const isOthersAge = Patterns.AGE_OF_OTHER_BEFORE_PATTERN.test(before)
      || Patterns.AGE_OF_OTHER_AFTER_PATTERN.test(after);
    if (!isOthersAge) return parseInt(match[1], 10);
  }

  const decade = text.match(Patterns.AGE_DECADE_PATTERN);
  if (decade) return parseInt(decade[1], 10) * 10 + 5;

  if (Patterns.AGE_YOUTH_KEYWORD.test(text)) return 26;

  return null;
}

/** 나이를 사용자 입력 형태에 맞게 표시 */
export function formatAgeLabel(age: number, userQuery: string): string {
  if (Patterns.AGE_DECADE_PATTERN.test(userQuery)) return `${Math.floor(age / 10) * 10}대`;
  if (Patterns.AGE_YOUTH_KEYWORD.test(userQuery)) return '청년';
  return `${age}세`;
}

/** 추출된 조건을 표시용 텍스트로 조립 */
export function formatConditionText(conditions: ExtractedConditions, userQuery: string): string {
  const parts: string[] = [];
  if (conditions.age !== null) parts.push(formatAgeLabel(conditions.age, userQuery));
  if (conditions.gender) parts.push(conditions.gender);
  if (conditions.maritalStatus) parts.push(conditions.maritalStatus);
  if (conditions.occupation) parts.push(conditions.occupation);
  if (conditions.employmentType) parts.push(conditions.employmentType);
  if (conditions.income !== null) parts.push(`연 ${conditions.income}만원`);
  if (conditions.householdSize !== null) parts.push(`${conditions.householdSize}인 가구`);
  if (conditions.housingType) parts.push(conditions.housingType);
  if (conditions.education) parts.push(conditions.education);
  if (conditions.insuranceType) parts.push(conditions.insuranceType);
  if (conditions.nationality) parts.push(conditions.nationality);
  if (conditions.region) parts.push(conditions.region);
  if (conditions.residenceDuration !== null) parts.push(`거주 ${conditions.residenceDuration}개월`);
  return parts.join(' / ');
}

// --- 성별 추출 ---
function extractGender(text: string): '남성' | '여성' | null {
  for (const [pattern, label] of Patterns.GENDER_PATTERNS) {
    if (pattern.test(text)) return label;
  }
  return null;
}

// --- 직업/상태 추출 ---
function extractOccupation(text: string): string | null {
  for (const [pattern, label] of Patterns.OCCUPATION_PATTERNS) {
    if (pattern.test(text)) return label;
  }
  return null;
}

/** 동/읍/면 이름 뒤에 올 수 있는 말. "서면으로"처럼 일반 단어 속에 섞인 경우를 걸러낸다. */
const SUB_REGION_SUFFIX_PATTERN = /^(?:$|[^가-힣]|에|에서|역|동|쪽|근처|사는|살|거주|구)/;

function containsSubRegion(text: string, name: string): boolean {
  let index = text.indexOf(name);
  while (index !== -1) {
    if (SUB_REGION_SUFFIX_PATTERN.test(text.slice(index + name.length))) return true;
    index = text.indexOf(name, index + 1);
  }
  return false;
}

function extractRegion(text: string): { region: string | null; regionProvince: string | null } {
  // 1. 동/읍/면 단위 매핑
  for (const [sub, [city, province]] of Object.entries(SUB_REGION_MAP)) {
    if (containsSubRegion(text, sub)) {
      return { region: city, regionProvince: province };
    }
  }

  const mentionedProvinces = new Set(
    Object.entries(PROVINCE_MAP)
      .filter(([key]) => text.includes(key))
      .map(([, province]) => province),
  );

  // 2. 시군구 매칭. 광역시도가 함께 언급됐다면 그 소속 시군구만 인정한다.
  //    ("경기 수원" → 수원시, "경기 광주" → 광주시, "광주" 단독 → 광주광역시)
  for (const [city, province] of CITY_TO_PROVINCE) {
    const short = city.replace(/시$|군$/, '');
    if (!text.includes(city) && !text.includes(short)) continue;
    if (mentionedProvinces.size === 0 || mentionedProvinces.has(province)) {
      return { region: city, regionProvince: province };
    }
  }

  // 3. 광역시도 매칭
  const [province] = mentionedProvinces;
  if (province) {
    return { region: province, regionProvince: province };
  }

  return { region: null, regionProvince: null };
}

// --- 소득 추출 ---
function extractIncome(text: string): number | null {
  const annual = text.match(Patterns.INCOME_ANNUAL_PATTERN);
  if (annual) return parseInt(annual[1] ?? annual[2], 10);

  const monthly = text.match(Patterns.INCOME_MONTHLY_PATTERN);
  if (monthly) return parseInt(monthly[1] ?? monthly[2], 10) * 12;

  if (Patterns.INCOME_MINIMUM_WAGE_PATTERN.test(text)) return Patterns.MINIMUM_WAGE_ANNUAL;
  if (Patterns.LOW_INCOME_PATTERN.test(text)) return Patterns.LOW_INCOME_DEFAULT_ANNUAL;

  return null;
}

// --- 결혼 상태 추출 ---
function extractMaritalStatus(text: string): string | null {
  for (const [pattern, label] of Patterns.MARITAL_PATTERNS) {
    if (pattern.test(text)) return label;
  }
  return null;
}

// --- 가구원 수 추출 ---
function extractHouseholdSize(text: string): number | null {
  const match = text.match(Patterns.HOUSEHOLD_SIZE_PATTERN);
  if (match) return parseInt(match[1] || match[2], 10);

  if (Patterns.HOUSEHOLD_SINGLE_PATTERN.test(text)) return 1;

  return null;
}

// --- 고용 형태 추출 ---
function extractEmploymentType(text: string): string | null {
  for (const [pattern, label] of Patterns.EMPLOYMENT_PATTERNS) {
    if (pattern.test(text)) return label;
  }
  return null;
}

// --- 거주 기간 추출 ---
function extractResidenceDuration(text: string): number | null {
  const years = text.match(Patterns.RESIDENCE_YEARS_PATTERN);
  if (years) return parseInt(years[1] || years[2], 10) * 12;

  const months = text.match(Patterns.RESIDENCE_MONTHS_PATTERN);
  if (months) return parseInt(months[1] || months[2], 10);

  return null;
}

// --- 주거 형태 추출 ---
function extractHousingType(text: string): string | null {
  for (const [pattern, label] of Patterns.HOUSING_PATTERNS) {
    if (pattern.test(text)) return label;
  }
  return null;
}

// --- 건강보험 유형 추출 ---
function extractInsuranceType(text: string): string | null {
  for (const [pattern, label] of Patterns.INSURANCE_PATTERNS) {
    if (pattern.test(text)) return label;
  }
  return null;
}

// --- 학력 추출 ---
function extractEducation(text: string): string | null {
  for (const [pattern, label] of Patterns.EDUCATION_PATTERNS) {
    if (pattern.test(text)) return label;
  }
  return null;
}

// --- 국적/체류자격 추출 ---
function extractNationality(text: string): string | null {
  for (const [pattern, label] of Patterns.NATIONALITY_PATTERNS) {
    if (pattern.test(text)) return label;
  }
  return null;
}

function extractKeywords(text: string): string[] {
  const keywords: string[] = [];
  for (const [pattern, kws] of Patterns.TOPIC_PATTERNS) {
    if (pattern.test(text)) {
      keywords.push(...kws);
    }
  }
  return [...new Set(keywords)];
}

// --- 검색 쿼리 생성 ---
function buildSearchQuery(conditions: ExtractedConditions, originalQuery: string): string {
  const parts: string[] = [];

  if (conditions.region && conditions.region !== conditions.regionProvince) {
    parts.push(conditions.region);
  }
  if (conditions.regionProvince) {
    parts.push(conditions.regionProvince);
  }

  if (conditions.keywords.length > 0) {
    parts.push(...conditions.keywords);
  } else {
    // 키워드가 없으면 원본 쿼리에서 조건 부분 제거한 나머지 사용
    parts.push(originalQuery);
  }

  const OCCUPATION_QUERY_EXPANSIONS: Partial<Record<string, string>> = {
    [Patterns.OccupationLabel.JOB_SEEKER]: '미취업 청년 구직활동 지원',
    [Patterns.OccupationLabel.PREGNANT]: '임산부 임신 출산 지원',
    [Patterns.OccupationLabel.SMALL_BUSINESS]: '소상공인 자영업 사업 대출 경영 지원',
    [Patterns.OccupationLabel.SINGLE_PARENT]: '한부모 가족 양육비 돌봄 지원',
  };
  if (conditions.occupation) {
    const expansion = OCCUPATION_QUERY_EXPANSIONS[conditions.occupation];
    parts.push(expansion ?? `${conditions.occupation} 지원`);
  }

  if (conditions.maritalStatus === '신혼') {
    parts.push('신혼부부 지원');
  }
  if (conditions.housingType === '무주택') {
    parts.push('무주택 주거 지원');
  }
  if (conditions.nationality) {
    parts.push(conditions.nationality, '지원');
  }
  if (conditions.income !== null && conditions.income <= Patterns.LOW_INCOME_DEFAULT_ANNUAL) {
    parts.push('저소득 기초생활 수급자 차상위 지원');
  }

  return [...new Set(parts)].join(' ');
}

// --- 텍스트 한 덩어리에서 조건 추출 ---
type ScalarConditionField = Exclude<keyof ExtractedConditions, 'region' | 'regionProvince' | 'keywords' | 'searchQuery'>;

/** 조건 필드 하나를 추가할 때는 여기(추출)와 formatConditionText(표시)만 손대면 된다. */
const SCALAR_EXTRACTORS: { [K in ScalarConditionField]: (text: string) => ExtractedConditions[K] } = {
  age: extractAge,
  gender: extractGender,
  occupation: extractOccupation,
  income: extractIncome,
  maritalStatus: extractMaritalStatus,
  householdSize: extractHouseholdSize,
  employmentType: extractEmploymentType,
  residenceDuration: extractResidenceDuration,
  housingType: extractHousingType,
  insuranceType: extractInsuranceType,
  education: extractEducation,
  nationality: extractNationality,
};

/** 텍스트에서 발견된 조건만 담아 반환한다. 발견되지 않은 필드는 키 자체가 없다. */
function extractConditionsFromText(text: string): Partial<ExtractedConditions> {
  const found: Partial<ExtractedConditions> = {};

  for (const field of Object.keys(SCALAR_EXTRACTORS) as ScalarConditionField[]) {
    const value = SCALAR_EXTRACTORS[field](text);
    if (value !== null) Object.assign(found, { [field]: value });
  }

  const { region, regionProvince } = extractRegion(text);
  if (region) Object.assign(found, { region, regionProvince });

  const keywords = extractKeywords(text);
  if (keywords.length > 0) found.keywords = keywords;

  return found;
}

// --- 대화 맥락에서 이전 조건 복원 ---
function extractPreviousConditions(history: ConversationMessage[]): ExtractedConditions {
  return history
    .filter((msg) => msg.role === 'user')
    .reduce<ExtractedConditions>(
      // reset 메시지를 만나면 이전 조건을 모두 버리고 이후만 누적
      (merged, msg) => isContextReset(msg.content)
        ? emptyConditions()
        : { ...merged, ...extractConditionsFromText(msg.content) },
      emptyConditions(),
    );
}

/** 검색에 충분한 맥락인지 판단할 때 세는 조건들 */
const CONTEXT_FIELDS = [
  'age',
  'gender',
  'occupation',
  'region',
  'income',
  'maritalStatus',
  'householdSize',
  'employmentType',
  'housingType',
  'nationality',
] as const satisfies readonly (keyof ExtractedConditions)[];

const GENERIC_KEYWORDS = ['지원금', '혜택', '지원', '보조금', '수당'];
const SEARCH_CONDITION_THRESHOLD = 2;

// --- 메인: 코드 기반 분석 ---
export function resolveSearchIntent(
  userQuery: string,
  history: ConversationMessage[],
): AnalysisResult {
  // 조건 초기화 감지
  if (isContextReset(userQuery)) {
    return {
      action: 'ask',
      conditions: emptyConditions(),
      followUpQuestion: '조건을 초기화했어요! 어떤 혜택을 찾고 계신가요?',
    };
  }

  // 이전 대화 조건 위에 현재 메시지에서 찾은 조건을 덮어쓴다
  const conditions: ExtractedConditions = {
    ...extractPreviousConditions(history),
    ...extractConditionsFromText(userQuery),
    searchQuery: '',
  };
  conditions.searchQuery = buildSearchQuery(conditions, userQuery);

  const { age, occupation, region } = conditions;
  const specificKeywords = conditions.keywords.filter((k) => !GENERIC_KEYWORDS.includes(k));

  const filledContextCount = CONTEXT_FIELDS.filter((field) => conditions[field] !== null).length
    + (specificKeywords.length > 0 ? 1 : 0);
  const hasEnoughContext = filledContextCount >= SEARCH_CONDITION_THRESHOLD;
  const hasSpecificTopic = specificKeywords.length > 0 || occupation !== null;

  if ((hasEnoughContext || hasSpecificTopic) && region !== null) {
    return { action: 'search', conditions };
  }

  if (region === null) {
    const knownParts: string[] = [];
    if (age !== null) knownParts.push(formatAgeLabel(age, userQuery));
    if (occupation) knownParts.push(occupation);
    if (specificKeywords.length > 0) knownParts.push(specificKeywords.join(', '));

    const prefix = knownParts.length > 0
      ? `${knownParts.join(', ')} 조건은 확인했어요! `
      : '';

    return {
      action: 'ask',
      conditions,
      followUpQuestion: `${prefix}어느 지역에 거주하고 계신가요? (예: 서울, 경기 수원, 부산 등)`,
    };
  }

  return {
    action: 'ask',
    conditions,
    followUpQuestion: '어떤 혜택을 찾고 계신가요? 나이, 현재 상황(취업/미취업 등), 관심 분야(주거, 취업, 출산 등)를 알려주시면 맞춤 검색해드릴게요!',
  };
}

function emptyConditions(): ExtractedConditions {
  return {
    age: null,
    gender: null,
    occupation: null,
    region: null,
    regionProvince: null,
    income: null,
    maritalStatus: null,
    householdSize: null,
    employmentType: null,
    residenceDuration: null,
    housingType: null,
    insuranceType: null,
    education: null,
    nationality: null,
    keywords: [],
    searchQuery: '',
  };
}
