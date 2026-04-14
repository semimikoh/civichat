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
