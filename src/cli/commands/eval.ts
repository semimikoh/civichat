import { Command } from 'commander';
import { searchBenefits } from '@/core/benefit/search';
import { EVAL_QUERIES, evaluateBenefitResults, type EvalQuery } from '@/core/benefit/eval-queries';

interface EvalResult {
  query: string;
  pass: boolean;
  matchedAt: number | null;
  topResults: string[];
  reason?: string;
}

async function evaluateQuery(eq: EvalQuery, topK: number): Promise<EvalResult> {
  const topResults: string[] = [];
  try {
    const res = await searchBenefits({ query: eq.query, matchCount: topK });

    if (res.type === 'question') {
      return { query: eq.query, pass: false, matchedAt: null, topResults, reason: '질문 모드 진입 (검색 미실행)' };
    }

    const results = res.results ?? [];
    const names = results.map((r) => r.serviceName);
    topResults.push(...names);

    const match = evaluateBenefitResults(eq, results);
    if (match.matchedAt === null) {
      return { query: eq.query, pass: false, matchedAt: null, topResults, reason: match.reason };
    }

    return { query: eq.query, pass: true, matchedAt: match.matchedAt, topResults };
  } catch (err) {
    return { query: eq.query, pass: false, matchedAt: null, topResults, reason: `에러: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export const evalCommand = new Command('eval')
  .description('검색 품질 평가 (eval set)')
  .option('-k, --top-k <number>', '상위 K개 결과 기준', '5')
  .option('-v, --verbose', '상세 출력')
  .action(async (opts: { topK: string; verbose?: boolean }) => {
    const topK = parseInt(opts.topK, 10);
    console.log(`검색 품질 평가 시작 (${EVAL_QUERIES.length}개 쿼리, top-${topK})\n`);

    const results: EvalResult[] = [];

    for (const eq of EVAL_QUERIES) {
      const result = await evaluateQuery(eq, topK);
      results.push(result);

      const icon = result.pass ? 'PASS' : 'FAIL';
      const hitInfo = result.matchedAt ? `(#${result.matchedAt})` : '';
      console.log(`  ${icon} ${eq.query} ${hitInfo}`);

      if (opts.verbose && result.topResults.length > 0) {
        result.topResults.forEach((name, i) => console.log(`       ${i + 1}. ${name}`));
      }
    }

    // 통계
    const total = results.length;
    const passed = results.filter((r) => r.pass).length;
    const failed = results.filter((r) => !r.pass);

    const top3Hits = results.filter((r) => r.matchedAt !== null && r.matchedAt <= 3).length;
    const top5Hits = results.filter((r) => r.matchedAt !== null && r.matchedAt <= 5).length;

    console.log('\n--- 결과 ---');
    console.log(`전체: ${passed}/${total} 통과 (${(passed / total * 100).toFixed(0)}%)`);
    console.log(`top-3 적중률: ${(top3Hits / total * 100).toFixed(0)}%`);
    console.log(`top-5 적중률: ${(top5Hits / total * 100).toFixed(0)}%`);

    if (failed.length > 0) {
      console.log('\n실패 쿼리:');
      for (const f of failed) {
        console.log(`  - "${f.query}": ${f.reason}`);
        if (f.topResults.length > 0) {
          console.log(`    실제 결과: ${f.topResults.slice(0, 3).join(', ')}`);
        }
      }
    }

    process.exit(failed.length > 0 ? 1 : 0);
  });
