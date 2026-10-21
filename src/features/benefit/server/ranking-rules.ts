export const RANKING_WEIGHT = {
  keywordName: 0.08,
  keywordBody: 0.025,
  keywordMaxBoost: 0.22,
  intentMatch: 0.18,
  intentMismatch: -0.12,
  targetMatch: 0.08,
  targetMismatch: -0.03,
  closedPenalty: -0.08,
  regionCityMatch: 0.12,
  regionProvinceMatch: 0.08,
  regionNationwide: 0.03,
  regionMismatch: -0.06,
  occupationLabelMatch: 0.08,
  jobSeekerMatch: 0.1,
  pregnantMatch: 0.12,
  smallBusinessMatch: 0.12,
  singleParentMatch: 0.12,
  newlywedMatch: 0.1,
  housingTypeMatch: 0.06,
  lowIncomeMatch: 0.1,
  youthMatch: 0.06,
  seniorMatch: 0.1,
} as const;

export const REGION_NATIONWIDE_PATTERN = /전국|공통|중앙|보건복지부|고용노동부|여성가족부|국토교통부|중소벤처기업부/;
export const CLOSED_PATTERN = /마감|종료|폐지|중단|만료/;

export const INTENT_RULES: { queryPattern: RegExp; textPattern: RegExp }[] = [
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

export const TARGET_RULES: { queryPattern: RegExp; textPattern: RegExp }[] = [
  { queryPattern: /청년|취준생|20대|30대/, textPattern: /청년|대학생|미취업/ },
  { queryPattern: /다문화|이주|외국인/, textPattern: /다문화|이주|외국인|결혼이민/ },
  { queryPattern: /한부모|싱글맘|싱글대디|미혼모|미혼부/, textPattern: /한부모|미혼모|미혼부/ },
  { queryPattern: /임산부|임신|산모|출산/, textPattern: /임산부|임신|산모|출산/ },
  { queryPattern: /장애/, textPattern: /장애/ },
  { queryPattern: /보훈|국가유공/, textPattern: /보훈|국가유공/ },
  { queryPattern: /신혼|신혼부부|결혼\s*예정/, textPattern: /신혼|부부|혼인|출산가구/ },
  { queryPattern: /노인|어르신|고령|70대|60대/, textPattern: /노인|어르신|고령|요양/ },
];

export const TOPIC_FILTERS: { queryPattern: RegExp; textPattern: RegExp }[] = [
  { queryPattern: /임산부|임신|산모|출산|아기|난임/, textPattern: /임산부|임신|산모|산전|산후|난임|분만/ },
  { queryPattern: /장애/, textPattern: /장애인|장애아/ },
  { queryPattern: /보훈|국가유공/, textPattern: /보훈|국가유공/ },
  { queryPattern: /결혼|혼인|기혼|신혼|웨딩/, textPattern: /결혼|혼인|신혼/ },
  { queryPattern: /자립|보호종료|아동복지시설|퇴소|가정위탁|위탁/, textPattern: /자립준비|자립지원|보호종료|가정위탁|보호아동/ },
  { queryPattern: /다문화|이주|외국인/, textPattern: /다문화|이주여성/ },
  { queryPattern: /농업|어업|축산|임업|농민|어민/, textPattern: /농업인|어업인|축산|임산물/ },
  { queryPattern: /군인|병사|전역|제대/, textPattern: /병사|전역|군인/ },
];
