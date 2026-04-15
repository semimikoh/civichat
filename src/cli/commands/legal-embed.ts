import { Command } from 'commander';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getSupabaseClient } from '@/core/db/supabase';
import { embedTexts } from '@/core/embeddings/openai';
import { DATA_DIR } from '@/cli/commands/shared';
import type { LawArticle } from '@/core/types/law';

/** 임베딩 + DB 적재를 동시에 처리하는 청크 크기 */
const CHUNK_SIZE = 100;

export const legalEmbedCommand = new Command('legal-embed')
  .description('법령 조문 임베딩 + DB 적재');

legalEmbedCommand
  .command('articles')
  .description('law-articles.json 임베딩 → law_articles 테이블 적재')
  .option('--skip-existing', '이미 적재된 조문 건너뛰기')
  .action(async (opts: { skipExisting?: boolean }) => {
    const articlesPath = resolve(DATA_DIR, 'law-articles.json');
    if (!existsSync(articlesPath)) {
      console.error('law-articles.json이 없습니다. 먼저 legal-fetch parse를 실행하세요.');
      process.exit(1);
    }

    const articles: LawArticle[] = JSON.parse(readFileSync(articlesPath, 'utf-8'));
    console.log(`${articles.length}건 조문 로드 완료`);

    const supabase = getSupabaseClient();

    // 이미 적재된 건 확인
    let toProcess = articles;
    if (opts.skipExisting) {
      const { count } = await supabase
        .from('law_articles')
        .select('*', { count: 'exact', head: true });
      const existing = count ?? 0;
      console.log(`DB 기존 조문: ${existing}건`);

      if (existing > 0) {
        // 페이지네이션으로 기존 키 조회 (Supabase 1000건 제한 대응)
        const existingKeys = new Set<string>();
        let from = 0;
        const pageSize = 1000;
        while (from < existing) {
          const { data } = await supabase
            .from('law_articles')
            .select('law_title, law_type, article_number')
            .range(from, from + pageSize - 1);
          if (!data || data.length === 0) break;
          for (const e of data) {
            existingKeys.add(`${e.law_title}::${e.law_type}::${e.article_number}`);
          }
          from += data.length;
        }
        toProcess = articles.filter(
          (a) => !existingKeys.has(`${a.lawTitle}::${a.lawType}::${a.articleNumber}`),
        );
        console.log(`신규 조문: ${toProcess.length}건 (기존 ${existingKeys.size}건 제외)`);
      }
    }

    if (toProcess.length === 0) {
      console.log('적재할 신규 조문이 없습니다.');
      return;
    }

    // 청크 단위로 임베딩 → DB 적재 반복 (중간 실패 시 --skip-existing으로 이어서 가능)
    let inserted = 0;
    let failed = 0;

    for (let i = 0; i < toProcess.length; i += CHUNK_SIZE) {
      const chunk = toProcess.slice(i, i + CHUNK_SIZE);
      const texts = chunk.map((a) => a.embeddingText);

      // 임베딩
      const embeddings = await embedTexts(texts);

      // DB 적재
      const rows = chunk.map((a, idx) => ({
        law_title: a.lawTitle,
        law_type: a.lawType,
        chapter: a.chapter,
        article_number: a.articleNumber,
        article_title: a.articleTitle,
        article_content: a.articleContent,
        embedding_text: a.embeddingText,
        source_url: a.sourceUrl,
        embedding: JSON.stringify(embeddings[idx]),
      }));

      const { error } = await supabase
        .from('law_articles')
        .upsert(rows, { onConflict: 'law_title,law_type,article_number' });

      if (error) {
        console.error(`적재 실패 (${i}~${i + chunk.length}):`, error.message);
        failed += chunk.length;
      } else {
        inserted += chunk.length;
      }

      if ((i + CHUNK_SIZE) % 1000 < CHUNK_SIZE || i + CHUNK_SIZE >= toProcess.length) {
        console.log(`진행 ${inserted + failed}/${toProcess.length}건 (성공 ${inserted}, 실패 ${failed})`);
      }
    }

    console.log(`law_articles 테이블 적재 완료: 성공 ${inserted}건, 실패 ${failed}건`);
  });
