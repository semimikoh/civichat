import { z } from 'zod';
import { getOrCreateSupabaseClient } from '@/server/supabase';
import { benefitRpcRowSchema, type BenefitRpcRow } from '@/features/benefit/server/mapper';

export type BenefitRepository = ReturnType<typeof createBenefitRepository>;

export type BenefitRpcParams = {
  query_embedding: string;
  query_text: string;
  region_filter: string | null;
  province_filter: string | null;
  match_threshold: number;
  match_count: number;
};

export type BenefitConditionRow = {
  service_id: string;
  age_start: number | null;
  age_end: number | null;
  gender: string[] | null;
  occupation: string[] | null;
};

const conditionRowSchema = z.object({
  service_id: z.string(),
  age_start: z.number().nullable(),
  age_end: z.number().nullable(),
  gender: z.array(z.string()).nullable(),
  occupation: z.array(z.string()).nullable(),
});

export function createBenefitRepository() {
  const supabase = getOrCreateSupabaseClient();

  return {
    async searchCandidates(params: BenefitRpcParams): Promise<BenefitRpcRow[]> {
      const { data, error } = await supabase.rpc('match_benefits_hybrid', params);

      if (error) {
        throw new Error(`하이브리드 검색 실패: ${error.message}`);
      }

      const parsed = z.array(benefitRpcRowSchema).safeParse(data ?? []);
      if (!parsed.success) {
        throw new Error(`RPC 응답 파싱 실패: ${parsed.error.message}`);
      }

      return parsed.data;
    },

    async getConditionRows(serviceIds: string[]): Promise<BenefitConditionRow[]> {
      if (serviceIds.length === 0) return [];

      const { data, error } = await supabase
        .from('benefit_conditions')
        .select('service_id, age_start, age_end, gender, occupation')
        .in('service_id', serviceIds);

      if (error) {
        throw new Error(`benefit_conditions 조회 실패: ${error.message}`);
      }

      const parsed = z.array(conditionRowSchema).safeParse(data);
      if (!parsed.success) {
        throw new Error(`benefit_conditions 파싱 실패: ${parsed.error.message}`);
      }

      return parsed.data;
    },
  };
}
