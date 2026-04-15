/** legalize-kr 마크다운에서 파싱한 법령 메타데이터 */
export interface LawMeta {
  title: string;
  lawMst: string;
  lawId: string;
  lawType: string;
  ministry: string[];
  promulgationDate: string;
  enforcementDate: string;
  status: string;
  sourceUrl: string;
}

/** 조문 단위로 분리된 법령 데이터 */
export interface LawArticle {
  /** 법령명 (예: 유아교육법) */
  lawTitle: string;
  /** 법령 구분 (예: 법률, 시행령, 시행규칙) */
  lawType: string;
  /** 장 제목 (예: 제1장 총칙) */
  chapter: string;
  /** 조문 번호 (예: 제1조) */
  articleNumber: string;
  /** 조문 제목 (예: 목적) */
  articleTitle: string;
  /** 조문 본문 (항 포함) */
  articleContent: string;
  /** 임베딩용 텍스트 (법령명 + 조문 제목 + 본문) */
  embeddingText: string;
  /** legalize-kr 원본 소스 URL */
  sourceUrl: string;
}

/** 복지 서비스의 법령 필드에서 파싱한 법령 참조 */
export interface LawReference {
  /** 법령명 (예: 유아교육법) */
  lawName: string;
  /** 조항 정보 (예: 제24조) */
  articleRef: string;
}
