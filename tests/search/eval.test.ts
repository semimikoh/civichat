// @vitest-environment node
/**
 * 검색 품질 평가 테스트
 *
 * CLI eval 명령의 핵심 로직을 vitest로 승격.
 * 실제 Supabase/OpenAI 호출이 필요하므로 CI에서는 환경변수가 있을 때만 실행.
 * 로컬: pnpm test:search-quality
 */
import { config } from 'dotenv';
import { EVAL_QUERIES, evaluateBenefitResults } from '@/core/benefit/eval-queries';
import { searchBenefits } from '@/core/benefit/search';

config({ path: '.env.local' });

const TOP_K = 5;
const MIN_PASS_RATE = 0.8; // 의미 단위 키워드 그룹 기준 80% 이상 통과

// 환경변수가 없으면 테스트 스킵
const hasEnv = Boolean(process.env.OPENAI_API_KEY && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

describe.skipIf(!hasEnv)('검색 품질 평가', () => {
  it(`전체 통과율이 ${MIN_PASS_RATE * 100}% 이상이어야 한다`, async () => {
    const results: { query: string; pass: boolean; reason?: string }[] = [];

    for (const eq of EVAL_QUERIES) {
      const res = await searchBenefits({ query: eq.query, matchCount: TOP_K });

      if (res.type === 'question') {
        results.push({ query: eq.query, pass: false, reason: '질문 모드 진입' });
        continue;
      }

      const match = evaluateBenefitResults(eq, res.results ?? []);
      results.push({
        query: eq.query,
        pass: match.matchedAt !== null,
        reason: match.reason,
      });
    }

    const passed = results.filter((r) => r.pass).length;
    const total = results.length;
    const passRate = passed / total;

    // 실패한 쿼리 출력
    const failed = results.filter((r) => !r.pass);
    if (failed.length > 0) {
      console.log('\n실패한 쿼리:');
      failed.forEach((f) => console.log(`  - "${f.query}": ${f.reason}`));
    }
    console.log(`\n통과율: ${passed}/${total} (${(passRate * 100).toFixed(0)}%)`);

    expect(passRate).toBeGreaterThanOrEqual(MIN_PASS_RATE);
  }, 120_000); // 타임아웃 2분
});
