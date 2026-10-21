import { z } from 'zod';
import type { SearchResult } from '@/features/benefit/types';

const nullableStr = z.string().nullable().transform((value) => value ?? '');

export const benefitRpcRowSchema = z.object({
  service_id: z.string(),
  service_name: z.string(),
  service_purpose: nullableStr,
  support_type: nullableStr,
  target_audience: nullableStr,
  selection_criteria: nullableStr,
  support_content: nullableStr,
  application_method: nullableStr,
  application_deadline: nullableStr,
  contact_agency: nullableStr,
  contact_phone: nullableStr,
  online_application_url: nullableStr,
  detail_url: nullableStr,
  managing_agency: nullableStr,
  law: nullableStr,
  similarity: z.number(),
});

export type BenefitRpcRow = z.infer<typeof benefitRpcRowSchema>;

export function mapBenefitRpcRow(row: BenefitRpcRow): SearchResult {
  return {
    serviceId: row.service_id,
    serviceName: row.service_name,
    servicePurpose: row.service_purpose,
    supportType: row.support_type,
    targetAudience: row.target_audience,
    selectionCriteria: row.selection_criteria,
    supportContent: row.support_content,
    applicationMethod: row.application_method,
    applicationDeadline: row.application_deadline,
    contactAgency: row.contact_agency,
    contactPhone: row.contact_phone,
    onlineApplicationUrl: row.online_application_url,
    detailUrl: row.detail_url,
    managingAgency: row.managing_agency,
    law: row.law,
    similarity: row.similarity,
    score: row.similarity,
  };
}

export function dedupeBenefitRows(rows: BenefitRpcRow[]): BenefitRpcRow[] {
  const rowMap = new Map<string, BenefitRpcRow>();

  for (const row of rows) {
    const existing = rowMap.get(row.service_id);
    if (!existing || row.similarity > existing.similarity) {
      rowMap.set(row.service_id, row);
    }
  }

  return Array.from(rowMap.values());
}
