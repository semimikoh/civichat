import {
  applyRelevanceRerank,
  scoreBenefitRelevance,
} from "@/core/benefit/ranking";
import type { ExtractedConditions } from "@/core/benefit/extract";

const baseConditions: ExtractedConditions = {
  age: 26,
  gender: null,
  occupation: "구직자/실업자",
  region: "서울특별시",
  regionProvince: "서울특별시",
  income: null,
  maritalStatus: null,
  householdSize: null,
  employmentType: null,
  residenceDuration: null,
  housingType: null,
  insuranceType: null,
  education: null,
  nationality: null,
  keywords: ["취업", "구직활동", "일자리"],
  searchQuery: "서울특별시 취업 구직활동 일자리 미취업 청년 구직활동 지원",
};

const baseBenefit = {
  servicePurpose: "",
  supportType: "",
  targetAudience: "",
  selectionCriteria: "",
  supportContent: "",
  applicationDeadline: "",
  managingAgency: "",
  similarity: 0.45,
  score: 0.45,
};

describe("benefit ranking", () => {
  it("점수 breakdown으로 지역, 조건, 의도 boost를 설명할 수 있다", () => {
    const score = scoreBenefitRelevance(
      {
        ...baseBenefit,
        serviceName: "서울 청년 구직활동 지원",
        servicePurpose: "미취업 청년의 구직활동과 취업 준비를 지원",
        targetAudience: "서울 거주 미취업 청년",
        managingAgency: "서울특별시",
      },
      "서울 청년 취업 지원",
      baseConditions,
    );

    expect(score.region).toBeGreaterThan(0);
    expect(score.condition).toBeGreaterThan(0);
    expect(score.intent).toBeGreaterThan(0);
    expect(score.keyword).toBeGreaterThan(0);
    expect(score.final).toBeGreaterThan(score.base);
  });

  it("낮은 원점수라도 질의와 조건이 맞는 혜택을 위로 올린다", () => {
    const [top] = applyRelevanceRerank(
      [
        {
          ...baseBenefit,
          serviceName: "타지역 일반 문화 행사",
          servicePurpose: "문화 체험 제공",
          targetAudience: "전 국민",
          managingAgency: "부산광역시",
          similarity: 0.62,
        },
        {
          ...baseBenefit,
          serviceName: "서울 청년 구직활동 지원",
          servicePurpose: "미취업 청년의 구직활동과 취업 준비를 지원",
          targetAudience: "서울 거주 미취업 청년",
          managingAgency: "서울특별시",
          similarity: 0.45,
        },
      ],
      "서울 청년 취업 지원",
      baseConditions,
    );

    expect(top.serviceName).toBe("서울 청년 구직활동 지원");
  });

  it("재정렬은 score만 바꾸고 원본 similarity는 보존한다", () => {
    const [top] = applyRelevanceRerank(
      [{
        ...baseBenefit,
        serviceName: "서울 청년 구직활동 지원",
        targetAudience: "서울 거주 미취업 청년",
        managingAgency: "서울특별시",
      }],
      "서울 청년 취업 지원",
      baseConditions,
    );

    expect(top.similarity).toBe(0.45);
    expect(top.score).toBeGreaterThan(top.similarity);
  });
});
