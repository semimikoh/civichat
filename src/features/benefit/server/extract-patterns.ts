/**
 * 조건 추출 패턴 설정
 *
 * 새 패턴 추가 시 이 파일만 수정하면 됩니다.
 * [정규식, 매칭 시 반환할 라벨] 형태의 튜플 배열.
 */

// --- 성별 ---
export const GENDER_PATTERNS: [RegExp, '남성' | '여성'][] = [
  [/여성|여자|엄마|임산부|임신|산모/, '여성'],
  [/남성|남자|아빠/, '남성'],
];

// --- 직업/상태 라벨 상수 ---
export const OccupationLabel = {
  JOB_SEEKER: '구직자/실업자',
  COLLEGE_STUDENT: '대학생/대학원생',
  HIGH_SCHOOL: '고등학생',
  MIDDLE_SCHOOL: '중학생',
  ELEMENTARY: '초등학생',
  WORKER: '근로자/직장인',
  FARMER: '농업인',
  FISHER: '어업인',
  PREGNANT: '임산부',
  DISABLED: '장애인',
  VETERAN: '국가보훈대상자',
  PRE_ENTREPRENEUR: '예비창업자',
  SMALL_BUSINESS: '소상공인/자영업자',
  SINGLE_PARENT: '한부모가정/조손가정',
} as const;

// --- 직업/상태 ---
export const OCCUPATION_PATTERNS: [RegExp, string][] = [
  [/무직|미취업|실업|구직|백수|취준|취업\s*준비|취준생/, OccupationLabel.JOB_SEEKER],
  [/대학생|대학원생/, OccupationLabel.COLLEGE_STUDENT],
  [/고등학생|고딩/, OccupationLabel.HIGH_SCHOOL],
  [/중학생/, OccupationLabel.MIDDLE_SCHOOL],
  [/초등학생/, OccupationLabel.ELEMENTARY],
  [/직장인|회사원|근로자|직장/, OccupationLabel.WORKER],
  [/농업|농민|농부/, OccupationLabel.FARMER],
  [/어업|어부/, OccupationLabel.FISHER],
  [/임산부|임신/, OccupationLabel.PREGNANT],
  [/장애인/, OccupationLabel.DISABLED],
  [/국가유공|보훈/, OccupationLabel.VETERAN],
  [/창업|예비\s*창업/, OccupationLabel.PRE_ENTREPRENEUR],
  [/소상공인|자영업|자영업자|개인\s*사업|사업자|가게|점포/, OccupationLabel.SMALL_BUSINESS],
  [/한부모|싱글맘|싱글대디|미혼모|미혼부/, OccupationLabel.SINGLE_PARENT],
];

// --- 결혼 상태 ---
export const MARITAL_PATTERNS: [RegExp, string][] = [
  [/신혼|신혼부부|결혼\s*예정/, '신혼'],
  [/기혼|결혼\s*했|유부/, '기혼'],
  [/미혼|비혼|독신|결혼\s*안/, '미혼'],
  [/이혼/, '이혼'],
  [/사별|배우자\s*사망/, '사별'],
];

// --- 고용 형태 ---
export const EMPLOYMENT_PATTERNS: [RegExp, string][] = [
  [/비정규직|비정규/, '비정규직'],
  [/계약직/, '계약직'],
  [/정규직/, '정규직'],
  [/프리랜서|프리/, '프리랜서'],
  [/파견직|파견/, '파견직'],
  [/일용직|일용/, '일용직'],
  [/아르바이트|알바/, '아르바이트'],
];

// --- 주거 형태 ---
export const HOUSING_PATTERNS: [RegExp, string][] = [
  [/무주택/, '무주택'],
  [/전세/, '전세'],
  [/월세/, '월세'],
  [/자가|자기\s*집|내\s*집/, '자가'],
  [/기숙사/, '기숙사'],
  [/고시원|고시텔/, '고시원'],
];

// --- 건강보험 유형 ---
export const INSURANCE_PATTERNS: [RegExp, string][] = [
  [/의료급여|의료\s*수급/, '의료급여'],
  [/지역\s*가입자|지역\s*건보/, '지역가입자'],
  [/직장\s*가입자|직장\s*건보/, '직장가입자'],
];

// --- 학력 ---
export const EDUCATION_PATTERNS: [RegExp, string][] = [
  [/중졸|중학교\s*졸/, '중졸'],
  [/고졸|고등학교\s*졸/, '고졸'],
  [/대졸|대학교?\s*졸|학사/, '대졸'],
  [/석사|대학원\s*졸/, '석사'],
  [/박사/, '박사'],
];

// --- 국적/체류자격 ---
export const NATIONALITY_PATTERNS: [RegExp, string][] = [
  [/결혼\s*이민|결혼\s*이주/, '결혼이민자'],
  [/외국인|외국\s*국적/, '외국인'],
  [/다문화/, '다문화가족'],
  [/탈북|북한\s*이탈|새터민/, '북한이탈주민'],
  [/귀화/, '귀화자'],
];

// --- 토픽 키워드 ---
export const TOPIC_PATTERNS: [RegExp, string[]][] = [
  [/취업|구직|일자리|면접|취준|취업\s*준비/, ['취업', '구직활동', '일자리']],
  [/주거|집|전세|월세|주택/, ['주거', '주택', '전세']],
  [/출산|아기|육아|보육/, ['출산', '육아', '보육']],
  [/임산부|임신|산모/, ['임산부', '임신', '출산']],
  [/의료|병원|건강|진료|의료비|치료비/, ['의료', '건강', '진료']],
  [/교육|학비|장학/, ['교육', '학비', '장학금']],
  [/창업|사업|자영|소상공인|점포|가게/, ['창업', '사업', '소상공인']],
  [/지원금|보조금|수당|혜택/, ['지원금', '혜택']],
  [/대출|융자|이자/, ['대출', '융자']],
  [/한부모|양육비|미혼모|미혼부/, ['한부모', '양육']],
  [/기초\s*생활|기초수급|수급자|차상위|저소득|중위소득/, ['저소득', '기초생활', '생계']],
  [/돌봄|요양|간병/, ['돌봄', '요양']],
  [/에너지|바우처|난방|전기요금|가스요금/, ['에너지', '바우처', '난방']],
];

// --- 나이 ---
export const AGE_EXACT_PATTERN = /만?\s*(\d{1,3})\s*(살|세)(?!대)/g;
/** 나이 뒤에 오면 본인이 아니라 자녀·가족의 나이로 본다 (예: "5살 아이") */
export const AGE_OF_OTHER_AFTER_PATTERN = /^\s*(?:된|인)?\s*(?:아이|아기|애기?|자녀|딸|아들|동생|조카|손자|손녀|아동)/;
/** 나이 앞에 오면 본인이 아니라 자녀·가족의 나이로 본다 (예: "아이가 5살") */
export const AGE_OF_OTHER_BEFORE_PATTERN = /(?:아이|아기|애기?|자녀|딸|아들|동생|조카|손자|손녀|아동)(?:가|는|이|은)?\s*$/;
export const AGE_DECADE_PATTERN = /(\d)0\s*대/;
export const AGE_YOUTH_KEYWORD = /청년/;

// --- 소득 ---
/** "연봉 3000", "연 소득 2400만원" — 단위 없는 "연 2회" 같은 표현은 제외 */
export const INCOME_ANNUAL_PATTERN = /(?<![가-힣\d])(?:연봉\s*(\d{1,5})|연\s*(?:소득|수입)?\s*(\d{1,5})\s*만\s*원?)/;
/** "월급 200", "월 소득 150만원" — "10월 1일" 같은 날짜는 제외 */
export const INCOME_MONTHLY_PATTERN = /(?<![가-힣\d])월\s*(?:(?:급여?|소득|수입)\s*(\d{1,4})|(\d{1,4})\s*만\s*원?)/;
export const INCOME_MINIMUM_WAGE_PATTERN = /최저임금|최저시급/;
export const MINIMUM_WAGE_ANNUAL = 2400; // 만원 단위
export const LOW_INCOME_PATTERN = /기초\s*생활|기초수급|수급자|차상위|저소득|중위소득/;
/** 저소득 키워드 매칭 시 income 필드에 할당할 기본값 (만원) */
export const LOW_INCOME_DEFAULT_ANNUAL = 1800;
/** 점수 부스팅 임계값 — 이 이하 소득이면 저소득 콘텐츠 boost (만원) */
export const LOW_INCOME_BOOST_THRESHOLD = 1800;

// --- 가구원 수 ---
export const HOUSEHOLD_SIZE_PATTERN = /(\d)\s*인\s*가(?:구|족)|가(?:구|족)\s*(\d)\s*(?:명|인)/;
export const HOUSEHOLD_SINGLE_PATTERN = /혼자\s*살|혼자\s*거주|1인\s*가구/;

// --- 거주 기간 ---
export const RESIDENCE_YEARS_PATTERN = /(?:거주|전입|살[아았]온?)\s*(\d{1,2})\s*년|(\d{1,2})\s*년\s*(?:거주|전입|살[아았])/;
export const RESIDENCE_MONTHS_PATTERN = /(?:거주|전입)\s*(\d{1,3})\s*개월|(\d{1,3})\s*개월\s*(?:거주|전입)/;
