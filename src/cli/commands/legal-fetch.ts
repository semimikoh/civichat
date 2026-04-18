import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command } from 'commander';
import { parseLawsByNames, parseLawReferences, findLawFilePath } from '@/core/legal/parse';
import { DATA_DIR } from '@/cli/commands/shared';
import type { LawArticle } from '@/core/types/law';

/** details.json에서 고유 법령명 목록을 추출한다. */
function extractLawNames(): string[] {
  const detailsPath = resolve(DATA_DIR, 'details.json');
  if (!existsSync(detailsPath)) {
    console.error('details.json이 없습니다. 먼저 fetch details를 실행하세요.');
    process.exit(1);
  }
  const details = JSON.parse(readFileSync(detailsPath, 'utf-8')) as Array<{ 법령: string }>;
  const names = new Set<string>();
  for (const d of details) {
    if (!d.법령 || !d.법령.trim()) continue;
    for (const ref of parseLawReferences(d.법령)) {
      names.add(ref.lawName);
    }
  }
  return [...names];
}

export const legalFetchCommand = new Command('legal-fetch')
  .description('legalize-kr 법령 데이터 파싱');

legalFetchCommand
  .command('parse')
  .description('복지 서비스가 참조하는 법령만 파싱 → 조문 단위 JSON 저장')
  .action(() => {
    const lawNames = extractLawNames();
    console.log(`복지 서비스에서 참조하는 법령: ${lawNames.length}종`);
    console.log('법령 파싱 시작...');

    const { totalLaws, totalArticles, articles } = parseLawsByNames(lawNames);
    console.log(`파싱 완료 - 법령 파일: ${totalLaws}개, 조문: ${totalArticles}개`);

    mkdirSync(DATA_DIR, { recursive: true });
    const outPath = resolve(DATA_DIR, 'law-articles.json');
    writeFileSync(outPath, JSON.stringify(articles, null, 2), 'utf-8');
    console.log(`저장 완료: ${outPath}`);
  });

legalFetchCommand
  .command('match')
  .description('복지 서비스의 법령 필드 → legalize-kr 매칭 확인')
  .action(() => {
    const detailsPath = resolve(DATA_DIR, 'details.json');
    const details = JSON.parse(readFileSync(detailsPath, 'utf-8')) as Array<{ 서비스명: string; 법령: string }>;
    const withLaw = details.filter((d) => d.법령 && d.법령.trim());

    let matched = 0;
    let unmatched = 0;
    const unmatchedNames = new Set<string>();

    for (const detail of withLaw) {
      const refs = parseLawReferences(detail.법령);
      for (const ref of refs) {
        const path = findLawFilePath(ref.lawName);
        if (path) {
          matched++;
        } else {
          unmatched++;
          unmatchedNames.add(ref.lawName);
        }
      }
    }

    console.log(`법령 참조 매칭 결과:`);
    console.log(`  매칭 성공: ${matched}건`);
    console.log(`  매칭 실패: ${unmatched}건`);
    if (unmatchedNames.size > 0) {
      console.log(`  미매칭 법령 (${unmatchedNames.size}종):`);
      for (const name of unmatchedNames) {
        console.log(`    - ${name}`);
      }
    }
  });

legalFetchCommand
  .command('stats')
  .description('파싱된 조문 데이터 통계')
  .action(() => {
    const articlesPath = resolve(DATA_DIR, 'law-articles.json');
    if (!existsSync(articlesPath)) {
      console.error('law-articles.json이 없습니다. 먼저 legal-fetch parse를 실행하세요.');
      process.exit(1);
    }
    const articles = JSON.parse(readFileSync(articlesPath, 'utf-8')) as LawArticle[];

    const lawTitles = new Set(articles.map((a) => a.lawTitle));
    const lawTypes = new Map<string, number>();
    let totalTextLength = 0;

    for (const a of articles) {
      lawTypes.set(a.lawType, (lawTypes.get(a.lawType) ?? 0) + 1);
      totalTextLength += a.embeddingText.length;
    }

    console.log(`조문 통계:`);
    console.log(`  법령 수: ${lawTitles.size}개`);
    console.log(`  조문 수: ${articles.length}개`);
    console.log(`  평균 임베딩 텍스트 길이: ${Math.round(totalTextLength / articles.length)}자`);
    console.log(`  법령 구분별:`);
    for (const [type, count] of [...lawTypes.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${type || '(미분류)'}: ${count}개`);
    }
  });
