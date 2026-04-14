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

  // "청년" → 26, "중장년" → 50
  if (/청년/.test(text)) return 26;

  return null;
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
  [/장애인|장애/, '장애인'],
  [/보훈|국가유공/, '국가보훈대상자'],
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
  '동구': ['대구광역시', '대구광역시'],
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

// 경기도 시군 목록 (대표적인 것)
const GYEONGGI_CITIES = [
  '수원시', '성남시', '고양시', '용인시', '부천시', '안산시', '안양시', '남양주시',
  '화성시', '평택시', '의정부시', '시흥시', '파주시', '김포시', '광명시', '광주시',
  '군포시', '하남시', '오산시', '이천시', '안성시', '의왕시', '양주시', '구리시',
  '포천시', '여주시', '동두천시', '과천시', '양평군', '가평군', '연천군',
];

function extractRegion(text: string): { region: string | null; regionProvince: string | null } {
  // 1. 동/읍/면 단위 매핑
  for (const [sub, [city, province]] of Object.entries(SUB_REGION_MAP)) {
    if (text.includes(sub)) {
      return { region: city, regionProvince: province };
    }
  }

  // 2. 시군구 직접 매칭 (경기도 시군)
  for (const city of GYEONGGI_CITIES) {
    const short = city.replace(/시$|군$/, '');
    if (text.includes(city) || text.includes(short)) {
      return { region: city, regionProvince: '경기도' };
    }
  }

  // 3. 광역시도 매칭
  for (const [key, province] of Object.entries(PROVINCE_MAP)) {
    if (text.includes(key)) {
      return { region: province, regionProvince: province };
    }
  }

  return { region: null, regionProvince: null };
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

  return [...new Set(parts)].join(' ');
}

// --- 대화 맥락에서 이전 조건 복원 ---
function extractPreviousConditions(history: ConversationMessage[]): ExtractedConditions {
  const merged = emptyConditions();

  for (const msg of history) {
    if (msg.role !== 'user') continue;
    const age = extractAge(msg.content);
    if (age !== null) merged.age = age;
    const gender = extractGender(msg.content);
    if (gender) merged.gender = gender;
    const occ = extractOccupation(msg.content);
    if (occ) merged.occupation = occ;
    const { region, regionProvince } = extractRegion(msg.content);
    if (region) { merged.region = region; merged.regionProvince = regionProvince; }
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

  const conditions: ExtractedConditions = {
    age,
    gender,
    occupation,
    region,
    regionProvince,
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
  ].filter(Boolean).length >= 2;

  const hasSpecificTopic = specificKeywords.length > 0 || occupation !== null;

  if ((hasEnoughContext || hasSpecificTopic) && region !== null) {
    return { action: 'search', conditions };
  }

  if (region === null) {
    const knownParts: string[] = [];
    if (age !== null) knownParts.push(`${age}세`);
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
  return { age: null, gender: null, occupation: null, region: null, regionProvince: null, keywords: [], searchQuery: '' };
}

