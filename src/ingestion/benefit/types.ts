/** 임베딩 + DB 적재용 정제된 복지 서비스 데이터 */
export interface Benefit {
  serviceId: string;
  serviceName: string;
  servicePurpose: string;
  supportType: string;
  targetAudience: string;
  selectionCriteria: string;
  supportContent: string;
  applicationMethod: string;
  applicationDeadline: string;
  requiredDocuments: string;
  contactAgency: string;
  contactPhone: string;
  onlineApplicationUrl: string;
  managingAgency: string;
  managingAgencyType: string;
  serviceCategory: string;
  law: string;
  administrativeRule: string;
  localRegulation: string;
  /** 정부24 상세조회 URL */
  detailUrl: string;
  /** 임베딩용 텍스트 (서비스명 + 지원대상 + 선정기준 + 지원내용) */
  embeddingText: string;
  updatedAt: string;
}

/** JA 코드 카테고리 */
export type JaCategory =
  | 'gender'
  | 'age'
  | 'income'
  | 'family'
  | 'occupation'
  | 'socialStatus'
  | 'business'
  | 'businessType'
  | 'orgType'
  | 'orgBusinessType'
  | 'vulnerability';

/** JA 코드 메타데이터 */
export interface JaCodeMeta {
  code: string;
  label: string;
  category: JaCategory;
}

/** 정제된 지원조건 */
export interface BenefitCondition {
  serviceId: string;
  serviceName: string;
  gender: string[];
  ageStart: number | null;
  ageEnd: number | null;
  incomeLevel: string[];
  familyStatus: string[];
  occupation: string[];
  socialStatus: string[];
  businessStatus: string[];
  vulnerability: string[];
}
