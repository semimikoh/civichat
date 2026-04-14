import type { Benefit } from '@/core/types/benefit';
import type { ServiceDetail, ServiceListItem } from '@/core/types/gov24';

/** 줄바꿈, 캐리지 리턴, 다중 공백 정리 */
function cleanText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** 임베딩용 텍스트 조합: 서비스명 + 지원대상 + 선정기준 + 지원내용 */
function buildEmbeddingText(detail: ServiceDetail): string {
  const parts = [
    detail.서비스명,
    detail.지원대상,
    detail.선정기준,
    detail.지원내용,
  ]
    .map(cleanText)
    .filter(Boolean);

  return parts.join('\n\n');
}

/** API 상세 데이터 -> 정제된 Benefit 변환 */
export function transformDetail(detail: ServiceDetail, detailUrl?: string): Benefit {
  return {
    serviceId: detail.서비스ID,
    serviceName: cleanText(detail.서비스명),
    servicePurpose: cleanText(detail.서비스목적),
    supportType: cleanText(detail.지원유형),
    targetAudience: cleanText(detail.지원대상),
    selectionCriteria: cleanText(detail.선정기준),
    supportContent: cleanText(detail.지원내용),
    applicationMethod: cleanText(detail.신청방법),
    applicationDeadline: cleanText(detail.신청기한),
    requiredDocuments: cleanText(detail.구비서류),
    contactAgency: cleanText(detail.접수기관명),
    contactPhone: cleanText(detail.문의처),
    onlineApplicationUrl: cleanText(detail.온라인신청사이트URL),
    managingAgency: cleanText(detail.소관기관명),
    managingAgencyType: '',
    serviceCategory: '',
    law: cleanText(detail.법령),
    administrativeRule: cleanText(detail.행정규칙),
    localRegulation: cleanText(detail.자치법규),
    detailUrl: detailUrl ?? '',
    embeddingText: buildEmbeddingText(detail),
    updatedAt: detail.수정일시,
  };
}

/** 전체 상세 데이터 일괄 변환 (services.json에서 URL 매핑) */
export function transformAllDetails(
  details: ServiceDetail[],
  services?: ServiceListItem[],
): Benefit[] {
  const urlMap = new Map<string, string>();
  if (services) {
    for (const s of services) {
      urlMap.set(s.서비스ID, s.상세조회URL ?? '');
    }
  }
  return details.map((d) => transformDetail(d, urlMap.get(d.서비스ID)));
}
