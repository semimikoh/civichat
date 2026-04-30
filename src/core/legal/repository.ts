import { z } from 'zod';
import { getOrCreateSupabaseClient } from '@/core/db/supabase';
import {
  lawArticleRpcRowSchema,
  type LawArticleRpcRow,
} from '@/core/legal/mapper';

export type LawRepository = ReturnType<typeof createLawRepository>;

export function createLawRepository() {
  const supabase = getOrCreateSupabaseClient();

  return {
    async searchArticles(params: {
      queryEmbedding: number[];
      queryText: string;
      matchThreshold: number;
      matchCount: number;
    }): Promise<LawArticleRpcRow[]> {
      const { data, error } = await supabase.rpc('match_law_articles_hybrid', {
        query_embedding: JSON.stringify(params.queryEmbedding),
        query_text: params.queryText,
        match_threshold: params.matchThreshold,
        match_count: params.matchCount,
      });

      if (error) {
        throw new Error(`법령 검색 실패: ${error.message}`);
      }

      const parsed = z.array(lawArticleRpcRowSchema).safeParse(data ?? []);
      if (!parsed.success) {
        throw new Error(`RPC 응답 파싱 실패: ${parsed.error.message}`);
      }

      return parsed.data;
    },

    async getArticlesByTitle(lawTitle: string): Promise<LawArticleRpcRow[]> {
      const { data, error } = await supabase.rpc('get_law_articles_by_title', {
        target_law_title: lawTitle,
      });

      if (error) {
        throw new Error(`법령 조회 실패: ${error.message}`);
      }

      const rowSchema = lawArticleRpcRowSchema.omit({ similarity: true });
      const parsed = z.array(rowSchema).safeParse(data ?? []);
      if (!parsed.success) {
        throw new Error(`RPC 응답 파싱 실패: ${parsed.error.message}`);
      }

      return parsed.data.map((row) => ({ ...row, similarity: 1 }));
    },
  };
}
