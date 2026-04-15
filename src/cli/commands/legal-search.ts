import { Command } from 'commander';
import { searchLawArticles } from '@/core/legal/search';

export const legalSearchCommand = new Command('legal-search')
  .description('법령 조문 검색')
  .argument('<query>', '검색어 (자연어)')
  .option('-n, --count <number>', '결과 수', '10')
  .action(async (query: string, opts: { count: string }) => {
    console.log(`법령 검색: "${query}"\n`);

    const response = await searchLawArticles({
      query,
      matchCount: parseInt(opts.count, 10),
    });

    console.log(response.message, '\n');

    if (response.results.length === 0) return;

    for (const [i, r] of response.results.entries()) {
      console.log(`--- [${i + 1}] ${r.lawTitle} ${r.articleNumber} (${r.articleTitle}) ---`);
      console.log(`  유사도: ${(r.similarity * 100).toFixed(1)}%`);
      console.log(`  법령구분: ${r.lawType}`);
      if (r.chapter) console.log(`  장: ${r.chapter}`);
      console.log(`  내용: ${r.articleContent.slice(0, 200)}...`);
      if (r.sourceUrl) console.log(`  출처: ${r.sourceUrl}`);
      console.log('');
    }
  });
