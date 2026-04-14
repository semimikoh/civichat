import type { SearchResult } from '@/core/search/benefit';
import { getOpenAIClient } from '@/core/embeddings/openai';

const SYSTEM_PROMPT = `너는 정부 복지 혜택 검색 결과를 요약해주는 도우미야.
검색 결과를 보고 사용자에게 친근하게 요약해줘.

규칙:
- 각 혜택을 번호로 나열하되, 핵심만 짧게 1~2줄로
- 서비스명을 **굵게** 표시
- 금액이 있으면 반드시 포함
- 지역이 특정되면 지역명 포함
- 신청방법이 온라인이면 간단히 언급
- 마지막에 "자세한 내용은 각 항목을 펼쳐서 확인해보세요." 한 줄 추가
- 전체 5줄 이내로 요약 (결과가 많으면 상위 3~5개만)
- 마크다운 사용 가능 (**굵게**)`;

function buildUserPrompt(query: string, results: SearchResult[], conditionText: string): string {
  const resultsText = results.slice(0, 5).map((r, i) => (
    `${i + 1}. ${r.serviceName} (${r.managingAgency})\n` +
    `   지원: ${(r.supportContent || '').slice(0, 150)}\n` +
    `   대상: ${(r.targetAudience || '').slice(0, 100)}\n` +
    `   신청: ${r.applicationMethod || '-'}`
  )).join('\n\n');

  return `사용자 질문: "${query}"\n추출된 조건: ${conditionText}\n\n검색 결과:\n${resultsText}`;
}

/** 일반 요약 (한번에 반환) */
export async function summarizeResults(
  query: string,
  results: SearchResult[],
  conditionText: string,
): Promise<string> {
  if (results.length === 0) {
    return '조건에 맞는 혜택을 찾지 못했습니다. 다른 키워드로 검색해보세요.';
  }

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(query, results, conditionText) },
    ],
    temperature: 0.3,
    max_tokens: 400,
  });

  return response.choices[0].message.content ?? '요약 생성 중 오류가 발생했습니다.';
}

/** 스트리밍 요약 (청크 단위 반환) */
export async function summarizeResultsStream(
  query: string,
  results: SearchResult[],
  conditionText: string,
) {
  const openai = getOpenAIClient();
  return openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(query, results, conditionText) },
    ],
    temperature: 0.3,
    max_tokens: 400,
    stream: true,
  });
}
