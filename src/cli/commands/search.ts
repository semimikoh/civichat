import { Command } from 'commander';
import { searchBenefits } from '@/core/search/benefit';

export const searchCommand = new Command('search')
  .description('복지 서비스 검색')
  .argument('<query>', '검색어 (자연어)')
  .option('-n, --count <number>', '결과 수', '10')
  .action(async (query: string, opts: { count: string }) => {
    console.log(`검색: "${query}"\n`);

    const response = await searchBenefits({
      query,
      matchCount: parseInt(opts.count, 10),
    });

    if (response.type === 'question') {
      console.log(`[질문] ${response.message}`);
      return;
    }

    console.log(response.message, '\n');

    if (!response.results || response.results.length === 0) return;

    for (const [i, r] of response.results.entries()) {
      console.log(`--- [${i + 1}] ${r.serviceName} (유사도: ${(r.similarity * 100).toFixed(1)}%) ---`);
      console.log(`  지원유형: ${r.supportType || '-'}`);
      console.log(`  지원대상: ${(r.targetAudience || '-').slice(0, 100)}...`);
      console.log(`  지원내용: ${(r.supportContent || '-').slice(0, 100)}...`);
      console.log(`  소관기관: ${r.managingAgency || '-'}`);
      console.log('');
    }
  });
