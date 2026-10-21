import { z } from 'zod';
import { getOrCreateSupabaseClient } from '@/server/supabase';
import {
  lawArticleRpcRowSchema,
  type LawArticleRpcRow,
} from '@/features/legal/server/mapper';

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
  };
}
