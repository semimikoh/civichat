import { Command } from 'commander';
import { searchBenefits } from '@/core/search/benefit';

export const searchCommand = new Command('search')
  .description('복지 서비스 검색')
  .argument('<query>', '검색어 (자연어)')
  .option('-n, --count <number>', '결과 수', '10')
  .option('-a, --age <number>', '나이 필터')
  .option('-g, --gender <string>', '성별 필터 (남성/여성)')
  .action(async (query: string, opts: { count: string; age?: string; gender?: string }) => {
    console.log(`검색: "${query}"\n`);

    const results = await searchBenefits({
      query,
      matchCount: parseInt(opts.count, 10),
      ageFilter: opts.age ? parseInt(opts.age, 10) : undefined,
      genderFilter: opts.gender,
    });

    if (results.length === 0) {
      console.log('검색 결과가 없습니다.');
      return;
    }

    console.log(`${results.length}건 검색 결과:\n`);

    for (const [i, r] of results.entries()) {
      console.log(`--- [${i + 1}] ${r.serviceName} (유사도: ${(r.similarity * 100).toFixed(1)}%) ---`);
      console.log(`  지원유형: ${r.supportType || '-'}`);
      console.log(`  지원대상: ${(r.targetAudience || '-').slice(0, 100)}...`);
      console.log(`  지원내용: ${(r.supportContent || '-').slice(0, 100)}...`);
      console.log(`  신청방법: ${r.applicationMethod || '-'}`);
      console.log(`  소관기관: ${r.managingAgency || '-'}`);
      console.log(`  문의: ${r.contactPhone || '-'}`);
      console.log('');
    }
  });
