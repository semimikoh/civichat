// import OpenAI from 'openai';
//
// LLM 기반 조건 추출은 주석 처리.
// 코드 기반 키워드 파싱으로 대체.

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

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

// --- 나이 추출 ---
function extractAge(text: string): number | null {
  // "26살", "26세", "만26세"
  const exact = text.match(/만?\s*(\d{1,3})\s*(살|세)/);
  if (exact) return parseInt(exact[1], 10);

  // "30대" → 35 (대표값)
  const decade = text.match(/(\d)0\s*대/);
  if (decade) return parseInt(decade[1], 10) * 10 + 5;

  // "청년" → 26
  if (/청년/.test(text)) return 26;

  return null;
}

/** 나이를 사용자 입력 형태에 맞게 표시 (30대 입력 → "30대", 26살 입력 → "26세") */
export function formatAgeLabel(age: number, userQuery: string): string {
  if (/(\d)0\s*대/.test(userQuery)) return `${Math.floor(age / 10) * 10}대`;
  if (/청년/.test(userQuery)) return '청년';
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
  if (/여성|여자|엄마|임산부|임신|산모/.test(text)) return '여성';
  if (/남성|남자|아빠/.test(text)) return '남성';
  return null;
}

// --- 직업/상태 추출 ---
const OCCUPATION_MAP: [RegExp, string][] = [
  [/무직|미취업|실업|구직|백수/, '구직자/실업자'],
  [/대학생|대학원생/, '대학생/대학원생'],
  [/고등학생|고딩/, '고등학생'],
  [/중학생/, '중학생'],
  [/초등학생/, '초등학생'],
  [/직장인|회사원|근로자|직장/, '근로자/직장인'],
  [/농업|농민|농부/, '농업인'],
  [/어업|어부/, '어업인'],
  [/임산부|임신/, '임산부'],
  [/장애인/, '장애인'],
  [/국가유공|보훈/, '국가보훈대상자'],
  [/창업|사업자|자영업/, '예비창업자'],
];

function extractOccupation(text: string): string | null {
  for (const [pattern, label] of OCCUPATION_MAP) {
    if (pattern.test(text)) return label;
  }
  return null;
}

// --- 지역 추출 ---
// 동/읍/면 → 시군구 매핑
const SUB_REGION_MAP: Record<string, [string, string]> = {
  '동탄': ['화성시', '경기도'],
  '분당': ['성남시', '경기도'],
  '판교': ['성남시', '경기도'],
  '일산': ['고양시', '경기도'],
  '산본': ['군포시', '경기도'],
  '평촌': ['안양시', '경기도'],
  '광교': ['수원시', '경기도'],
  '위례': ['성남시', '경기도'],
  '미사': ['하남시', '경기도'],
  '강남': ['서울특별시', '서울특별시'],
  '강북': ['서울특별시', '서울특별시'],
  '잠실': ['서울특별시', '서울특별시'],
  '송파': ['서울특별시', '서울특별시'],
  '마포': ['서울특별시', '서울특별시'],
  '영등포': ['서울특별시', '서울특별시'],
  '해운대': ['부산광역시', '부산광역시'],
  '서면': ['부산광역시', '부산광역시'],
  '유성': ['대전광역시', '대전광역시'],
  '제주': ['제주특별자치도', '제주특별자치도'],
  '세종': ['세종특별자치시', '세종특별자치시'],
};

// 시군구 → 광역시도 매핑
const PROVINCE_MAP: Record<string, string> = {
  '서울': '서울특별시', '서울시': '서울특별시', '서울특별시': '서울특별시',
  '부산': '부산광역시', '부산시': '부산광역시', '부산광역시': '부산광역시',
  '대구': '대구광역시', '대구시': '대구광역시', '대구광역시': '대구광역시',
  '인천': '인천광역시', '인천시': '인천광역시', '인천광역시': '인천광역시',
  '광주': '광주광역시', '광주시': '광주광역시', '광주광역시': '광주광역시',
  '대전': '대전광역시', '대전시': '대전광역시', '대전광역시': '대전광역시',
  '울산': '울산광역시', '울산시': '울산광역시', '울산광역시': '울산광역시',
  '경기': '경기도', '경기도': '경기도',
  '강원': '강원특별자치도', '강원도': '강원특별자치도',
  '충북': '충청북도', '충청북도': '충청북도',
  '충남': '충청남도', '충청남도': '충청남도',
  '전북': '전북특별자치도', '전라북도': '전북특별자치도',
  '전남': '전라남도', '전라남도': '전라남도',
  '경북': '경상북도', '경상북도': '경상북도',
  '경남': '경상남도', '경상남도': '경상남도',
  '제주': '제주특별자치도', '제주도': '제주특별자치도',
  '세종': '세종특별자치시', '세종시': '세종특별자치시',
};

// 도별 시군 목록 [시군명, 광역시도]
const CITY_TO_PROVINCE: [string, string][] = [
  // 경기도
  ...['수원시', '성남시', '고양시', '용인시', '부천시', '안산시', '안양시', '남양주시',
    '화성시', '평택시', '의정부시', '시흥시', '파주시', '김포시', '광명시', '광주시',
    '군포시', '하남시', '오산시', '이천시', '안성시', '의왕시', '양주시', '구리시',
    '포천시', '여주시', '동두천시', '과천시', '양평군', '가평군', '연천군',
  ].map((c): [string, string] => [c, '경기도']),
  // 전북특별자치도
  ...['전주시', '익산시', '군산시', '정읍시', '남원시', '김제시',
  ].map((c): [string, string] => [c, '전북특별자치도']),
  // 전라남도
  ...['목포시', '여수시', '순천시', '나주시', '광양시',
  ].map((c): [string, string] => [c, '전라남도']),
  // 충청북도
  ...['청주시', '충주시', '제천시',
  ].map((c): [string, string] => [c, '충청북도']),
  // 충청남도
  ...['천안시', '아산시', '서산시', '논산시', '당진시', '공주시',
  ].map((c): [string, string] => [c, '충청남도']),
  // 경상북도
  ...['포항시', '경주시', '구미시', '김천시', '안동시', '영주시', '상주시',
  ].map((c): [string, string] => [c, '경상북도']),
  // 경상남도
  ...['창원시', '김해시', '진주시', '양산시', '거제시', '통영시', '사천시',
  ].map((c): [string, string] => [c, '경상남도']),
  // 강원특별자치도
  ...['춘천시', '원주시', '강릉시', '동해시', '속초시', '삼척시',
  ].map((c): [string, string] => [c, '강원특별자치도']),
];

function extractRegion(text: string): { region: string | null; regionProvince: string | null } {
  // 1. 동/읍/면 단위 매핑
  for (const [sub, [city, province]] of Object.entries(SUB_REGION_MAP)) {
    if (text.includes(sub)) {
      return { region: city, regionProvince: province };
    }
  }

  // 2. 광역시도 매칭 (시군구보다 먼저 — "광주"가 경기도 광주시가 아닌 광주광역시로 매칭되도록)
  for (const [key, province] of Object.entries(PROVINCE_MAP)) {
    if (text.includes(key)) {
      return { region: province, regionProvince: province };
    }
  }

  // 3. 시군구 직접 매칭 (전국)
  for (const [city, province] of CITY_TO_PROVINCE) {
    const short = city.replace(/시$|군$/, '');
    if (text.includes(city) || text.includes(short)) {
      return { region: city, regionProvince: province };
    }
  }

  return { region: null, regionProvince: null };
}

// --- 소득 추출 ---
function extractIncome(text: string): number | null {
  // "연봉 3000만원", "연봉 3000", "연 3000만원"
  const annual = text.match(/연봉?\s*(\d{1,5})\s*만?\s*원?/);
  if (annual) return parseInt(annual[1], 10);

  // "월급 200만원", "월 200만원", "월급여 200"
  const monthly = text.match(/월\s*(?:급여?|소득|수입)?\s*(\d{1,4})\s*만?\s*원?/);
  if (monthly) return parseInt(monthly[1], 10) * 12;

  // "최저임금", "최저시급"
  if (/최저임금|최저시급/.test(text)) return 2400; // 2024 기준 약 2400만원

  return null;
}

// --- 결혼 상태 추출 ---
const MARITAL_MAP: [RegExp, string][] = [
  [/신혼|신혼부부|결혼\s*예정/, '신혼'],
  [/기혼|결혼\s*했|유부/, '기혼'],
  [/미혼|비혼|독신|결혼\s*안/, '미혼'],
  [/이혼/, '이혼'],
  [/사별|배우자\s*사망/, '사별'],
];

function extractMaritalStatus(text: string): string | null {
  for (const [pattern, label] of MARITAL_MAP) {
    if (pattern.test(text)) return label;
  }
  return null;
}

// --- 가구원 수 추출 ---
function extractHouseholdSize(text: string): number | null {
  // "3인 가구", "3인가구", "가족 3명"
  const match = text.match(/(\d)\s*인\s*가(?:구|족)|가(?:구|족)\s*(\d)\s*(?:명|인)/);
  if (match) return parseInt(match[1] || match[2], 10);

  // "혼자 살", "1인 가구"
  if (/혼자\s*살|혼자\s*거주|1인\s*가구/.test(text)) return 1;

  return null;
}

// --- 고용 형태 추출 ---
const EMPLOYMENT_MAP: [RegExp, string][] = [
  [/비정규직|비정규/, '비정규직'],
  [/계약직/, '계약직'],
  [/정규직/, '정규직'],
  [/프리랜서|프리/, '프리랜서'],
  [/파견직|파견/, '파견직'],
  [/일용직|일용/, '일용직'],
  [/아르바이트|알바/, '아르바이트'],
];

function extractEmploymentType(text: string): string | null {
  for (const [pattern, label] of EMPLOYMENT_MAP) {
    if (pattern.test(text)) return label;
  }
  return null;
}

// --- 거주 기간 추출 ---
function extractResidenceDuration(text: string): number | null {
  // "거주 3년", "3년 거주", "전입 3년"
  const years = text.match(/(?:거주|전입|살[아았]온?)\s*(\d{1,2})\s*년|(\d{1,2})\s*년\s*(?:거주|전입|살[아았])/);
  if (years) return parseInt(years[1] || years[2], 10) * 12;

  // "거주 6개월", "전입 6개월"
  const months = text.match(/(?:거주|전입)\s*(\d{1,3})\s*개월|(\d{1,3})\s*개월\s*(?:거주|전입)/);
  if (months) return parseInt(months[1] || months[2], 10);

  return null;
}

// --- 주거 형태 추출 ---
const HOUSING_MAP: [RegExp, string][] = [
  [/무주택/, '무주택'],
  [/전세/, '전세'],
  [/월세/, '월세'],
  [/자가|자기\s*집|내\s*집/, '자가'],
  [/기숙사/, '기숙사'],
  [/고시원|고시텔/, '고시원'],
];

function extractHousingType(text: string): string | null {
  for (const [pattern, label] of HOUSING_MAP) {
    if (pattern.test(text)) return label;
  }
  return null;
}

// --- 건강보험 유형 추출 ---
const INSURANCE_MAP: [RegExp, string][] = [
  [/의료급여|의료\s*수급/, '의료급여'],
  [/지역\s*가입자|지역\s*건보/, '지역가입자'],
  [/직장\s*가입자|직장\s*건보/, '직장가입자'],
];

function extractInsuranceType(text: string): string | null {
  for (const [pattern, label] of INSURANCE_MAP) {
    if (pattern.test(text)) return label;
  }
  return null;
}

// --- 학력 추출 ---
const EDUCATION_MAP: [RegExp, string][] = [
  [/중졸|중학교\s*졸/, '중졸'],
  [/고졸|고등학교\s*졸/, '고졸'],
  [/대졸|대학교?\s*졸|학사/, '대졸'],
  [/석사|대학원\s*졸/, '석사'],
  [/박사/, '박사'],
];

function extractEducation(text: string): string | null {
  for (const [pattern, label] of EDUCATION_MAP) {
    if (pattern.test(text)) return label;
  }
  return null;
}

// --- 국적/체류자격 추출 ---
const NATIONALITY_MAP: [RegExp, string][] = [
  [/결혼\s*이민|결혼\s*이주/, '결혼이민자'],
  [/외국인|외국\s*국적/, '외국인'],
  [/다문화/, '다문화가족'],
  [/탈북|북한\s*이탈|새터민/, '북한이탈주민'],
  [/귀화/, '귀화자'],
];

function extractNationality(text: string): string | null {
  for (const [pattern, label] of NATIONALITY_MAP) {
    if (pattern.test(text)) return label;
  }
  return null;
}

// --- 키워드 추출 ---
const TOPIC_KEYWORDS: [RegExp, string[]][] = [
  [/취업|구직|일자리|면접/, ['취업', '구직활동', '일자리']],
  [/주거|집|전세|월세|주택/, ['주거', '주택', '전세']],
  [/출산|아기|육아|보육/, ['출산', '육아', '보육']],
  [/임산부|임신|산모/, ['임산부', '임신', '출산']],
  [/의료|병원|건강|진료/, ['의료', '건강', '진료']],
  [/교육|학비|장학/, ['교육', '학비', '장학금']],
  [/창업|사업|자영/, ['창업', '사업']],
  [/지원금|보조금|수당|혜택/, ['지원금', '혜택']],
  [/대출|융자|이자/, ['대출', '융자']],
];

function extractKeywords(text: string): string[] {
  const keywords: string[] = [];
  for (const [pattern, kws] of TOPIC_KEYWORDS) {
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

  if (conditions.occupation === '구직자/실업자') {
    parts.push('미취업 청년 구직활동 지원');
  } else if (conditions.occupation === '임산부') {
    parts.push('임산부 임신 출산 지원');
  } else if (conditions.occupation) {
    parts.push(conditions.occupation, '지원');
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

  return [...new Set(parts)].join(' ');
}

// --- 대화 맥락에서 이전 조건 복원 ---
function extractPreviousConditions(history: ConversationMessage[]): ExtractedConditions {
  const merged = emptyConditions();

  for (const msg of history) {
    if (msg.role !== 'user') continue;
    const text = msg.content;
    const age = extractAge(text);
    if (age !== null) merged.age = age;
    const gender = extractGender(text);
    if (gender) merged.gender = gender;
    const occ = extractOccupation(text);
    if (occ) merged.occupation = occ;
    const { region, regionProvince } = extractRegion(text);
    if (region) { merged.region = region; merged.regionProvince = regionProvince; }
    const kw = extractKeywords(text);
    if (kw.length > 0) merged.keywords = kw;
    const inc = extractIncome(text);
    if (inc !== null) merged.income = inc;
    const marital = extractMaritalStatus(text);
    if (marital) merged.maritalStatus = marital;
    const household = extractHouseholdSize(text);
    if (household !== null) merged.householdSize = household;
    const empType = extractEmploymentType(text);
    if (empType) merged.employmentType = empType;
    const resDur = extractResidenceDuration(text);
    if (resDur !== null) merged.residenceDuration = resDur;
    const housing = extractHousingType(text);
    if (housing) merged.housingType = housing;
    const insurance = extractInsuranceType(text);
    if (insurance) merged.insuranceType = insurance;
    const edu = extractEducation(text);
    if (edu) merged.education = edu;
    const nat = extractNationality(text);
    if (nat) merged.nationality = nat;
  }

  return merged;
}

// --- 메인: 코드 기반 분석 ---
export function analyzeQuery(
  userQuery: string,
  history: ConversationMessage[],
): AnalysisResult {
  // 이전 대화에서 조건 복원
  const prev = extractPreviousConditions(history);

  // 현재 메시지에서 조건 추출
  const age = extractAge(userQuery) ?? prev.age;
  const gender = extractGender(userQuery) ?? prev.gender;
  const occupation = extractOccupation(userQuery) ?? prev.occupation;
  const { region: newRegion, regionProvince: newProvince } = extractRegion(userQuery);
  const region = newRegion ?? prev.region;
  const regionProvince = newProvince ?? prev.regionProvince;
  const keywords = extractKeywords(userQuery);
  const income = extractIncome(userQuery) ?? prev.income;
  const maritalStatus = extractMaritalStatus(userQuery) ?? prev.maritalStatus;
  const householdSize = extractHouseholdSize(userQuery) ?? prev.householdSize;
  const employmentType = extractEmploymentType(userQuery) ?? prev.employmentType;
  const residenceDuration = extractResidenceDuration(userQuery) ?? prev.residenceDuration;
  const housingType = extractHousingType(userQuery) ?? prev.housingType;
  const insuranceType = extractInsuranceType(userQuery) ?? prev.insuranceType;
  const education = extractEducation(userQuery) ?? prev.education;
  const nationality = extractNationality(userQuery) ?? prev.nationality;

  const conditions: ExtractedConditions = {
    age,
    gender,
    occupation,
    region,
    regionProvince,
    income,
    maritalStatus,
    householdSize,
    employmentType,
    residenceDuration,
    housingType,
    insuranceType,
    education,
    nationality,
    keywords: keywords.length > 0 ? keywords : prev.keywords,
    searchQuery: '',
  };

  conditions.searchQuery = buildSearchQuery(conditions, userQuery);

  // 검색 가능 여부 판단
  const GENERIC_KEYWORDS = ['지원금', '혜택', '지원', '보조금', '수당'];
  const specificKeywords = keywords.filter((k) => !GENERIC_KEYWORDS.includes(k));

  const hasEnoughContext = [
    age !== null,
    gender !== null,
    occupation !== null,
    specificKeywords.length > 0,
    region !== null,
    income !== null,
    maritalStatus !== null,
    householdSize !== null,
    employmentType !== null,
    housingType !== null,
    nationality !== null,
  ].filter(Boolean).length >= 2;

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

