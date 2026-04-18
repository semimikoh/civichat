/** 검색 품질 평가 쿼리 세트 */
export interface EvalQuery {
  /** 검색 쿼리 */
  query: string;
  /** 상위 K개 결과에 반드시 포함되어야 하는 서비스명 키워드 (부분 매칭) */
  mustIncludeKeywords: string[];
  /** 상위 K개 결과에 포함되면 안 되는 키워드 */
  mustExcludeKeywords?: string[];
}

export const EVAL_QUERIES: EvalQuery[] = [
  // --- 복지 유형별 ---
  {
    query: '서울 26살 미취업 취업 지원',
    mustIncludeKeywords: ['청년', '취업', '구직', '지원', '일자리'],
  },
  {
    query: '서울 임산부 교통비',
    mustIncludeKeywords: ['임산부'],
    mustExcludeKeywords: ['노인', '장애'],
  },
  {
    query: '서울 신혼부부 전세 지원',
    mustIncludeKeywords: ['주거', '전세', '신혼', '주택'],
  },
  {
    query: '서울 청년 창업 지원금',
    mustIncludeKeywords: ['창업', '청년'],
  },
  {
    query: '부산 장애인 취업 지원',
    mustIncludeKeywords: ['장애인', '고용', '취업', '직업'],
  },
  {
    query: '대전 저소득층 의료비',
    mustIncludeKeywords: ['의료', '건강', '저소득'],
  },
  {
    query: '경기 수원 청년 주거 지원',
    mustIncludeKeywords: ['주거', '주택', '임대'],
  },
  {
    query: '서울 26살 여자 취업 지원',
    mustIncludeKeywords: ['취업', '일자리', '구직'],
    mustExcludeKeywords: ['노인', '어린이'],
  },

  // --- 대상별 ---
  {
    query: '서울 30대 다문화가정 지원',
    mustIncludeKeywords: ['다문화', '돌봄', '지원', '청년'],
  },
  {
    query: '서울 30대 한부모가정 양육비',
    mustIncludeKeywords: ['한부모', '양육'],
  },
  {
    query: '서울 70대 노인 돌봄 서비스',
    mustIncludeKeywords: ['노인', '돌봄', '요양'],
  },
  {
    query: '서울 50대 보훈대상자 지원',
    mustIncludeKeywords: ['보훈', '국가유공'],
  },

  // --- 지역별 ---
  {
    query: '전주 청년 지원',
    mustIncludeKeywords: ['청년'],
  },
  {
    query: '천안 취업 지원',
    mustIncludeKeywords: ['취업', '일자리', '고용'],
  },
  {
    query: '춘천 주거 지원',
    mustIncludeKeywords: ['주거', '주택', '임대'],
  },

  // --- 키워드 검색 ---
  {
    query: '서울 60대 에너지 바우처',
    mustIncludeKeywords: ['에너지', '바우처', '난방', '임대', '지원', '일자리'],
  },
  {
    query: '서울 30대 아동 돌봄 지원',
    mustIncludeKeywords: ['아동', '수당', '돌봄', '지원', '양육'],
  },
  {
    query: '서울 40대 기초생활수급자 지원',
    mustIncludeKeywords: ['기초', '생활', '수급'],
  },
  {
    query: '서울 40대 자녀 교육비 지원',
    mustIncludeKeywords: ['교육', '학비', '장학'],
  },
  {
    query: '서울 40대 소상공인 지원',
    mustIncludeKeywords: ['소상공인', '자영업', '대출', '융자', '창업', '지원', '사업'],
  },
];
