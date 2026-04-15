import type { LawSearchResult } from '@/core/legal/search';
import { getOpenAIClient } from '@/core/embeddings/openai';

const SYSTEM_PROMPT = `너는 법령 검색 결과를 요약해주는 도우미야.
검색된 법령 조문을 보고 사용자에게 친근하게 설명해줘.

규칙:
- 각 조문을 번호로 나열하되, 핵심 내용을 1~2줄로 쉽게 풀어서 설명
- 법령명과 조문번호를 **굵게** 표시
- 법률 용어를 일상 언어로 바꿔서 설명
- 사용자의 질문과 직접 관련된 내용 위주로
- 마지막에 "각 조문을 펼쳐서 원문을 확인해보세요." 한 줄 추가
- 전체 5줄 이내로 요약 (결과가 많으면 상위 3~5개만)
- 마크다운 사용 가능 (**굵게**)`;

function buildUserPrompt(query: string, results: LawSearchResult[]): string {
  const resultsText = results.slice(0, 5).map((r, i) => (
    `${i + 1}. ${r.lawTitle} ${r.articleNumber} (${r.articleTitle})\n` +
    `   내용: ${r.articleContent.slice(0, 200)}`
  )).join('\n\n');

  return `사용자 질문: "${query}"\n\n검색된 법령 조문:\n${resultsText}`;
}

/** 스트리밍 요약 (청크 단위 반환) */
export async function summarizeLawResultsStream(
  query: string,
  results: LawSearchResult[],
) {
  const openai = getOpenAIClient();
  return openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(query, results) },
    ],
    temperature: 0.3,
    max_tokens: 400,
    stream: true,
  });
}
