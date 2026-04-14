import { getSupabaseClient } from '@/core/db/supabase';
import { embedTexts } from '@/core/embeddings/openai';

export interface SearchResult {
  serviceId: string;
  serviceName: string;
  servicePurpose: string;
  supportType: string;
  targetAudience: string;
  selectionCriteria: string;
  supportContent: string;
  applicationMethod: string;
  applicationDeadline: string;
  contactAgency: string;
  contactPhone: string;
  onlineApplicationUrl: string;
  detailUrl: string;
  managingAgency: string;
  law: string;
  similarity: number;
}

export interface SearchOptions {
  query: string;
  matchCount?: number;
  matchThreshold?: number;
  ageFilter?: number;
  genderFilter?: string;
}

/** 벡터 검색 + JA 필터 조합 */
export async function searchBenefits(options: SearchOptions): Promise<SearchResult[]> {
  const {
    query,
    matchCount = 10,
    matchThreshold = 0.3,
    ageFilter,
    genderFilter,
  } = options;

  // 1. 쿼리 임베딩
  const [queryEmbedding] = await embedTexts([query]);

  // 2. 벡터 검색 (RPC)
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('match_benefits', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: matchThreshold,
    match_count: matchCount * 3, // 필터 적용 후 줄어들 수 있으므로 여유분
  });

  if (error) {
    throw new Error(`벡터 검색 실패: ${error.message}`);
  }

  let results: SearchResult[] = (data ?? []).map((row: Record<string, unknown>) => ({
    serviceId: row.service_id as string,
    serviceName: row.service_name as string,
    servicePurpose: row.service_purpose as string,
    supportType: row.support_type as string,
    targetAudience: row.target_audience as string,
    selectionCriteria: row.selection_criteria as string,
    supportContent: row.support_content as string,
    applicationMethod: row.application_method as string,
    applicationDeadline: row.application_deadline as string,
    contactAgency: row.contact_agency as string,
    contactPhone: row.contact_phone as string,
    onlineApplicationUrl: row.online_application_url as string,
    detailUrl: row.detail_url as string,
    managingAgency: row.managing_agency as string,
    law: row.law as string,
    similarity: row.similarity as number,
  }));

  // 3. JA 코드 기반 필터 (조건 테이블 조인)
  if (ageFilter !== undefined || genderFilter) {
    const serviceIds = results.map((r) => r.serviceId);

    if (serviceIds.length > 0) {
      const { data: conditions } = await supabase
        .from('benefit_conditions')
        .select('service_id, age_start, age_end, gender')
        .in('service_id', serviceIds);

      if (conditions) {
        const condMap = new Map(
          conditions.map((c: Record<string, unknown>) => [c.service_id as string, c]),
        );

        results = results.filter((r) => {
          const cond = condMap.get(r.serviceId) as Record<string, unknown> | undefined;
          if (!cond) return true; // 조건 정보 없으면 포함

          if (ageFilter !== undefined) {
            const ageStart = cond.age_start as number | null;
            const ageEnd = cond.age_end as number | null;
            if (ageStart !== null && ageEnd !== null) {
              if (ageFilter < ageStart || ageFilter > ageEnd) return false;
            }
          }

          if (genderFilter) {
            const gender = cond.gender as string[] | null;
            if (gender && gender.length > 0 && !gender.includes(genderFilter)) {
              return false;
            }
          }

          return true;
        });
      }
    }
  }

  return results.slice(0, matchCount);
}
