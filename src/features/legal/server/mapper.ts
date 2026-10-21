import { z } from 'zod';
import type { LawSearchResult } from '@/features/legal/types';

export const lawArticleRpcRowSchema = z.object({
  id: z.number(),
  law_title: z.string(),
  law_type: z.string(),
  chapter: z.string().nullable(),
  article_number: z.string(),
  article_title: z.string(),
  article_content: z.string(),
  source_url: z.string().nullable(),
  similarity: z.number(),
});

export type LawArticleRpcRow = z.infer<typeof lawArticleRpcRowSchema>;

export function mapLawArticleRpcRow(row: LawArticleRpcRow): LawSearchResult {
  return {
    id: row.id,
    lawTitle: row.law_title,
    lawType: row.law_type,
    chapter: row.chapter ?? '',
    articleNumber: row.article_number,
    articleTitle: row.article_title,
    articleContent: row.article_content,
    sourceUrl: row.source_url ?? '',
    similarity: row.similarity,
  };
}
