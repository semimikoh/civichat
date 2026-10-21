/** 검색 품질 평가 쿼리 세트 */
export interface EvalQuery {
  /** 검색 쿼리 */
  query: string;
  /** 상위 K개 결과에 반드시 포함되어야 하는 서비스명 키워드 (부분 매칭). legacy fallback. */
  mustIncludeKeywords: string[];
  /** 상위 K개 결과 중 하나가 각 그룹에서 최소 1개 키워드를 모두 포함해야 한다. */
  mustMatchKeywordGroups?: string[][];
  /** 상위 K개 결과에 포함되면 안 되는 키워드 */
  mustExcludeKeywords?: string[];
}

export interface EvalSearchResult {
  serviceName: string;
  servicePurpose: string;
  targetAudience: string;
  selectionCriteria: string;
  supportContent: string;
  supportType: string;
  managingAgency: string;
}

export interface EvalMatch {
  matchedAt: number | null;
  reason?: string;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '');
}

function resultText(result: EvalSearchResult): string {
  return normalize([
    result.serviceName,
    result.servicePurpose,
    result.targetAudience,
    result.selectionCriteria,
    result.supportContent,
    result.supportType,
    result.managingAgency,
  ].join(' '));
}

function hasAnyKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(normalize(kw)));
}

function checkExclude(results: EvalSearchResult[], keywords: string[]): string | null {
  for (const result of results) {
    const text = resultText(result);
    for (const kw of keywords) {
      if (text.includes(normalize(kw))) {
        return `"${result.serviceName}"에 제외 키워드 "${kw}" 포함`;
      }
    }
  }
  return null;
}

export function evaluateBenefitResults(
  eq: EvalQuery,
  results: EvalSearchResult[],
): EvalMatch {
  const excludeReason = eq.mustExcludeKeywords
    ? checkExclude(results, eq.mustExcludeKeywords)
    : null;
  if (excludeReason) return { matchedAt: null, reason: excludeReason };

  const groups = eq.mustMatchKeywordGroups ?? [eq.mustIncludeKeywords];
  for (let i = 0; i < results.length; i++) {
    const text = resultText(results[i]);
    if (groups.every((group) => hasAnyKeyword(text, group))) {
      return { matchedAt: i + 1 };
    }
  }

  const groupText = groups.map((group) => `[${group.join(', ')}]`).join(' + ');
  return { matchedAt: null, reason: `키워드 그룹 ${groupText}를 모두 만족하는 결과 없음` };
}

export const EVAL_QUERIES: EvalQuery[] = [
  // --- 복지 유형별 ---
  {
    query: '서울 26살 미취업 취업 지원',
    mustIncludeKeywords: ['청년', '취업', '구직', '지원', '일자리'],
    mustMatchKeywordGroups: [['청년', '26'], ['취업', '구직', '일자리', '미취업']],
  },
  {
    query: '서울 임산부 교통비',
    mustIncludeKeywords: ['임산부'],
    mustMatchKeywordGroups: [['임산부', '임신', '산모'], ['교통', '이동', '택시']],
    mustExcludeKeywords: ['노인', '장애'],
  },
  {
    query: '서울 신혼부부 전세 지원',
    mustIncludeKeywords: ['주거', '전세', '신혼', '주택'],
    mustMatchKeywordGroups: [['신혼', '부부'], ['전세', '주거', '주택']],
  },
  {
    query: '서울 청년 창업 지원금',
    mustIncludeKeywords: ['창업', '청년'],
    mustMatchKeywordGroups: [['청년'], ['창업', '사업']],
  },
  {
    query: '부산 장애인 취업 지원',
    mustIncludeKeywords: ['장애인', '고용', '취업', '직업'],
    mustMatchKeywordGroups: [['장애인', '장애'], ['취업', '고용', '직업', '일자리']],
  },
  {
    query: '대전 저소득층 의료비',
    mustIncludeKeywords: ['의료', '건강', '저소득'],
    mustMatchKeywordGroups: [['저소득', '기초', '차상위'], ['의료', '건강', '진료', '병원']],
  },
  {
    query: '경기 수원 청년 주거 지원',
    mustIncludeKeywords: ['주거', '주택', '임대'],
    mustMatchKeywordGroups: [['청년'], ['주거', '주택', '임대', '전세', '월세']],
  },
  {
    query: '서울 26살 여자 취업 지원',
    mustIncludeKeywords: ['취업', '일자리', '구직'],
    mustMatchKeywordGroups: [['취업', '일자리', '구직', '고용'], ['청년', '여성', '여자']],
    mustExcludeKeywords: ['노인', '어린이'],
  },

  // --- 대상별 ---
  {
    query: '서울 30대 다문화가정 지원',
    mustIncludeKeywords: ['다문화', '돌봄', '지원', '청년'],
    mustMatchKeywordGroups: [['다문화', '이주', '외국인'], ['가정', '가족', '지원', '돌봄']],
  },
  {
    query: '서울 30대 한부모가정 양육비',
    mustIncludeKeywords: ['한부모', '양육'],
    mustMatchKeywordGroups: [['한부모', '미혼모', '미혼부'], ['양육', '아동', '자녀']],
  },
  {
    query: '서울 70대 노인 돌봄 서비스',
    mustIncludeKeywords: ['노인', '돌봄', '요양'],
    mustMatchKeywordGroups: [['노인', '어르신', '고령'], ['돌봄', '요양', '간병']],
  },
  {
    query: '서울 50대 보훈대상자 지원',
    mustIncludeKeywords: ['보훈', '국가유공'],
    mustMatchKeywordGroups: [['보훈', '국가유공'], ['지원', '수당', '위문']],
  },

  // --- 지역별 ---
  {
    query: '전주 청년 지원',
    mustIncludeKeywords: ['청년'],
    mustMatchKeywordGroups: [['전주', '전북'], ['청년']],
  },
  {
    query: '천안 취업 지원',
    mustIncludeKeywords: ['취업', '일자리', '고용'],
    mustMatchKeywordGroups: [['천안', '충남'], ['취업', '일자리', '고용', '채용']],
  },
  {
    query: '춘천 주거 지원',
    mustIncludeKeywords: ['주거', '주택', '임대'],
    mustMatchKeywordGroups: [['춘천', '강원'], ['주거', '주택', '임대', '전세']],
  },

  // --- 키워드 검색 ---
  {
    query: '서울 60대 에너지 바우처',
    mustIncludeKeywords: ['에너지', '바우처', '난방', '임대', '지원', '일자리'],
    mustMatchKeywordGroups: [['에너지', '난방', '전기', '가스', '공동관리비'], ['바우처', '지원', '감면']],
  },
  {
    query: '서울 30대 아동 돌봄 지원',
    mustIncludeKeywords: ['아동', '수당', '돌봄', '지원', '양육'],
    mustMatchKeywordGroups: [['아동', '아이', '자녀'], ['돌봄', '양육', '보육']],
  },
  {
    query: '서울 40대 기초생활수급자 지원',
    mustIncludeKeywords: ['기초', '생활', '수급'],
    mustMatchKeywordGroups: [['기초', '수급', '저소득'], ['생계', '생활', '급여', '지원']],
  },
  {
    query: '서울 40대 자녀 교육비 지원',
    mustIncludeKeywords: ['교육', '학비', '장학'],
    mustMatchKeywordGroups: [['교육', '학비', '장학', '입학'], ['자녀', '학생', '초', '중', '고']],
  },
  {
    query: '서울 40대 소상공인 지원',
    mustIncludeKeywords: ['소상공인', '자영업', '대출', '융자', '창업', '지원', '사업'],
    mustMatchKeywordGroups: [['소상공인', '자영업', '사업자'], ['지원', '대출', '융자', '경영', '창업']],
  },
  {
    query: '서울 취준생 면접 비용 지원',
    mustIncludeKeywords: ['취업', '구직', '면접', '청년', '일자리'],
    mustMatchKeywordGroups: [['취업', '구직', '일자리', '채용'], ['면접', '자격', '활동비', '수당']],
    mustExcludeKeywords: ['노인', '임산부'],
  },
  {
    query: '부산 자영업자 경영 자금 대출',
    mustIncludeKeywords: ['소상공인', '자영업', '대출', '융자', '경영', '사업'],
    mustMatchKeywordGroups: [['자영업', '소상공인', '사업자'], ['경영', '자금', '대출', '융자', '사업']],
  },
  {
    query: '인천 한부모 양육비 지원',
    mustIncludeKeywords: ['한부모', '양육', '가족'],
    mustMatchKeywordGroups: [['한부모', '미혼모', '미혼부'], ['양육', '가족', '자녀']],
    mustExcludeKeywords: ['노인', '장애'],
  },
  {
    query: '서울 차상위 의료비 지원',
    mustIncludeKeywords: ['차상위', '저소득', '의료', '건강', '지원'],
    mustMatchKeywordGroups: [['차상위', '저소득', '기초'], ['의료', '건강', '진료', '병원']],
  },
  {
    query: '경기도 무주택 신혼부부 월세 지원',
    mustIncludeKeywords: ['신혼', '주거', '월세', '주택', '전세'],
    mustMatchKeywordGroups: [['신혼', '부부'], ['무주택', '월세', '전세', '주거', '주택']],
  },
  {
    query: '대구 1인 가구 주거 지원',
    mustIncludeKeywords: ['1인', '주거', '주택', '월세', '지원'],
    mustMatchKeywordGroups: [['1인', '청년'], ['주거', '주택', '월세', '전세', '이사']],
  },
  {
    query: '광주 청년 월세 지원',
    mustIncludeKeywords: ['청년', '월세', '주거', '주택'],
    mustMatchKeywordGroups: [['청년'], ['월세', '주거', '주택', '임차']],
  },
  {
    query: '충남 천안 소상공인 창업 지원',
    mustIncludeKeywords: ['소상공인', '창업', '사업', '지원'],
    mustMatchKeywordGroups: [['천안', '충남', '소상공인'], ['창업', '사업']],
  },
  {
    query: '서울 기초수급자 생계 지원',
    mustIncludeKeywords: ['기초', '생활', '수급', '생계'],
    mustMatchKeywordGroups: [['기초', '수급', '저소득'], ['생계', '생활', '급여']],
  },
  {
    query: '제주 임신 출산 지원',
    mustIncludeKeywords: ['임산부', '임신', '출산', '산모'],
    mustMatchKeywordGroups: [['제주'], ['임신', '출산', '산모', '임산부']],
    mustExcludeKeywords: ['노인', '장애'],
  },
];
