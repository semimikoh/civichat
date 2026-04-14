import type { JaCodeMeta, JaCategory, BenefitCondition } from '@/core/types/conditions';
import type { SupportCondition } from '@/core/types/gov24';

/** JA 코드 -> 한글 라벨 매핑 테이블 */
export const JA_CODE_MAP: JaCodeMeta[] = [
  // 성별
  { code: 'JA0101', label: '남성', category: 'gender' },
  { code: 'JA0102', label: '여성', category: 'gender' },

  // 연령
  { code: 'JA0110', label: '대상연령(시작)', category: 'age' },
  { code: 'JA0111', label: '대상연령(종료)', category: 'age' },

  // 소득
  { code: 'JA0201', label: '중위소득 0~50%', category: 'income' },
  { code: 'JA0202', label: '중위소득 51~75%', category: 'income' },
  { code: 'JA0203', label: '중위소득 76~100%', category: 'income' },
  { code: 'JA0204', label: '중위소득 101~200%', category: 'income' },
  { code: 'JA0205', label: '중위소득 200% 초과', category: 'income' },

  // 가족
  { code: 'JA0301', label: '예비부모/난임', category: 'family' },
  { code: 'JA0302', label: '임산부', category: 'family' },
  { code: 'JA0303', label: '출산/입양', category: 'family' },

  // 직업
  { code: 'JA0313', label: '농업인', category: 'occupation' },
  { code: 'JA0314', label: '어업인', category: 'occupation' },
  { code: 'JA0315', label: '축산업인', category: 'occupation' },
  { code: 'JA0316', label: '임업인', category: 'occupation' },
  { code: 'JA0317', label: '초등학생', category: 'occupation' },
  { code: 'JA0318', label: '중학생', category: 'occupation' },
  { code: 'JA0319', label: '고등학생', category: 'occupation' },
  { code: 'JA0320', label: '대학생/대학원생', category: 'occupation' },
  { code: 'JA0322', label: '해당사항없음', category: 'occupation' },
  { code: 'JA0326', label: '근로자/직장인', category: 'occupation' },
  { code: 'JA0327', label: '구직자/실업자', category: 'occupation' },

  // 취약계층
  { code: 'JA0328', label: '장애인', category: 'vulnerability' },
  { code: 'JA0329', label: '국가보훈대상자', category: 'vulnerability' },
  { code: 'JA0330', label: '질병/질환자', category: 'vulnerability' },

  // 사회적 지위
  { code: 'JA0401', label: '다문화가족', category: 'socialStatus' },
  { code: 'JA0402', label: '북한이탈주민', category: 'socialStatus' },
  { code: 'JA0403', label: '한부모가정/조손가정', category: 'socialStatus' },
  { code: 'JA0404', label: '1인가구', category: 'socialStatus' },
  { code: 'JA0410', label: '해당사항없음', category: 'socialStatus' },
  { code: 'JA0411', label: '다자녀가구', category: 'socialStatus' },
  { code: 'JA0412', label: '무주택세대', category: 'socialStatus' },
  { code: 'JA0413', label: '신규전입', category: 'socialStatus' },
  { code: 'JA0414', label: '확대가족', category: 'socialStatus' },

  // 창업
  { code: 'JA1101', label: '예비창업자', category: 'business' },
  { code: 'JA1102', label: '영업중', category: 'business' },
  { code: 'JA1103', label: '생계곤란/폐업예정자', category: 'business' },

  // 업종 (개인)
  { code: 'JA1201', label: '음식업', category: 'businessType' },
  { code: 'JA1202', label: '제조업', category: 'businessType' },
  { code: 'JA1299', label: '기타업종', category: 'businessType' },

  // 기관 유형
  { code: 'JA2101', label: '중소기업', category: 'orgType' },
  { code: 'JA2102', label: '사회복지시설', category: 'orgType' },
  { code: 'JA2103', label: '기관/단체', category: 'orgType' },

  // 기관 업종
  { code: 'JA2201', label: '제조업', category: 'orgBusinessType' },
  { code: 'JA2202', label: '농업,임업 및 어업', category: 'orgBusinessType' },
  { code: 'JA2203', label: '정보통신업', category: 'orgBusinessType' },
  { code: 'JA2299', label: '기타업종', category: 'orgBusinessType' },
];

const codeToMeta = new Map(JA_CODE_MAP.map((m) => [m.code, m]));

/** JA 코드로 한글 라벨 조회 */
export function getJaLabel(code: string): string {
  return codeToMeta.get(code)?.label ?? code;
}

/** JA 코드로 카테고리 조회 */
export function getJaCategory(code: string): JaCategory | null {
  return codeToMeta.get(code)?.category ?? null;
}

/** 특정 카테고리에서 Y인 코드들의 라벨 목록 반환 */
function getActiveLabels(
  condition: SupportCondition,
  category: JaCategory,
): string[] {
  return JA_CODE_MAP
    .filter((m) => m.category === category)
    .filter((m) => {
      const val = condition[m.code];
      return val === 'Y' || val === 'y';
    })
    .map((m) => m.label);
}

/** API 지원조건 -> 정제된 BenefitCondition 변환 */
export function transformCondition(raw: SupportCondition): BenefitCondition {
  return {
    serviceId: raw.서비스ID,
    serviceName: raw.서비스명,
    gender: getActiveLabels(raw, 'gender'),
    ageStart: typeof raw.JA0110 === 'number' ? raw.JA0110 : null,
    ageEnd: typeof raw.JA0111 === 'number' ? raw.JA0111 : null,
    incomeLevel: getActiveLabels(raw, 'income'),
    familyStatus: getActiveLabels(raw, 'family'),
    occupation: getActiveLabels(raw, 'occupation'),
    socialStatus: getActiveLabels(raw, 'socialStatus'),
    businessStatus: getActiveLabels(raw, 'business'),
    vulnerability: getActiveLabels(raw, 'vulnerability'),
  };
}
