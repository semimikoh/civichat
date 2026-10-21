/** 보조금24 API 공통 페이지네이션 응답 */
export interface Gov24ApiResponse<T> {
  currentCount: number;
  matchCount: number;
  totalCount: number;
  page: number;
  perPage: number;
  data: T[];
}

/** 공공서비스 목록 항목 (/gov24/v3/serviceList) */
export interface ServiceListItem {
  서비스ID: string;
  지원유형: string;
  서비스명: string;
  서비스목적요약: string;
  지원대상: string;
  선정기준: string;
  지원내용: string;
  신청방법: string;
  신청기한: string;
  상세조회URL: string;
  소관기관코드: string;
  소관기관명: string;
  부서명: string;
  조회수: number;
  소관기관유형: string;
  사용자구분: string;
  서비스분야: string;
  접수기관: string;
  전화문의: string;
  등록일시: string;
  수정일시: string;
}

/** 공공서비스 상세 항목 (/gov24/v3/serviceDetail) */
export interface ServiceDetail {
  서비스ID: string;
  지원유형: string;
  서비스명: string;
  서비스목적: string;
  신청기한: string;
  지원대상: string;
  선정기준: string;
  지원내용: string;
  신청방법: string;
  구비서류: string;
  접수기관명: string;
  문의처: string;
  온라인신청사이트URL: string;
  수정일시: string;
  소관기관명: string;
  행정규칙: string;
  자치법규: string;
  법령: string;
  공무원확인구비서류: string;
  본인확인필요구비서류: string;
}

/** 공공서비스 지원조건 항목 (/gov24/v3/supportConditions) */
export interface SupportCondition {
  서비스ID: string;
  서비스명: string;
  JA0101: string; // 남성
  JA0102: string; // 여성
  JA0110: number; // 대상연령(시작)
  JA0111: number; // 대상연령(종료)
  JA0201: string; // 중위소득 0~50%
  JA0202: string; // 중위소득 51~75%
  JA0203: string; // 중위소득 76~100%
  JA0204: string; // 중위소득 101~200%
  JA0205: string; // 중위소득 200% 초과
  JA0301: string; // 예비부모/난임
  JA0302: string; // 임산부
  JA0303: string; // 출산/입양
  JA0313: string; // 농업인
  JA0314: string; // 어업인
  JA0315: string; // 축산업인
  JA0316: string; // 임업인
  JA0317: string; // 초등학생
  JA0318: string; // 중학생
  JA0319: string; // 고등학생
  JA0320: string; // 대학생/대학원생
  JA0322: string; // 해당사항없음
  JA0326: string; // 근로자/직장인
  JA0327: string; // 구직자/실업자
  JA0328: string; // 장애인
  JA0329: string; // 국가보훈대상자
  JA0330: string; // 질병/질환자
  JA0401: string; // 다문화가족
  JA0402: string; // 북한이탈주민
  JA0403: string; // 한부모가정/조손가정
  JA0404: string; // 1인가구
  JA0410: string; // 해당사항없음
  JA0411: string; // 다자녀가구
  JA0412: string; // 무주택세대
  JA0413: string; // 신규전입
  JA0414: string; // 확대가족
  JA1101: string; // 예비창업자
  JA1102: string; // 영업중
  JA1103: string; // 생계곤란/폐업예정자
  JA1201: string; // 음식업
  JA1202: string; // 제조업
  JA1299: string; // 기타업종
  JA2101: string; // 중소기업
  JA2102: string; // 사회복지시설
  JA2103: string; // 기관/단체
  JA2201: string; // 제조업
  JA2202: string; // 농업,임업 및 어업
  JA2203: string; // 정보통신업
  JA2299: string; // 기타업종
  [key: string]: string | number;
}
