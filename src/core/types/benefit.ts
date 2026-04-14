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
  /** 임베딩용 텍스트 (서비스명 + 지원대상 + 선정기준 + 지원내용) */
  embeddingText: string;
  updatedAt: string;
}
