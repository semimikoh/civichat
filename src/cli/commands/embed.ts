import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command } from 'commander';
import { getSupabaseClient } from '@/core/db/supabase';
import { transformAllDetails } from '@/core/benefit/transform';
import { transformCondition } from '@/core/benefit/conditions';
import { embedTexts } from '@/core/embeddings/openai';
import type { ServiceDetail, ServiceListItem, SupportCondition } from '@/core/types/gov24';
import { DATA_DIR } from '@/cli/commands/shared';

const DB_CHUNK_SIZE = 100;

export const embedCommand = new Command('embed')
  .description('데이터 임베딩 + DB 적재');

embedCommand
  .command('benefits')
  .description('서비스 상세 데이터 임베딩 + benefits 테이블 적재')
  .action(async () => {
    const detailsPath = resolve(DATA_DIR, 'details.json');
    const servicesPath = resolve(DATA_DIR, 'services.json');
    if (!existsSync(detailsPath)) {
      console.error('details.json이 없습니다. 먼저 fetch details를 실행하세요.');
      process.exit(1);
    }
    const details: ServiceDetail[] = JSON.parse(readFileSync(detailsPath, 'utf-8'));
    const services: ServiceListItem[] | undefined = existsSync(servicesPath)
      ? JSON.parse(readFileSync(servicesPath, 'utf-8'))
      : undefined;
    console.log(`${details.length}건 상세 데이터 로드 완료`);

    // 1. transform (services.json에서 상세조회URL 매핑)
    const benefits = transformAllDetails(details, services);
    console.log('데이터 정제 완료');

    // 2. 임베딩 생성
    const texts = benefits.map((b) => b.embeddingText);
    console.log(`임베딩 생성 시작 (${texts.length}건)...`);
    const embeddings = await embedTexts(texts);
    console.log('임베딩 생성 완료');

    // 3. DB 적재
    const supabase = getSupabaseClient();
    let inserted = 0;

    for (let i = 0; i < benefits.length; i += DB_CHUNK_SIZE) {
      const chunk = benefits.slice(i, i + DB_CHUNK_SIZE);
      const chunkEmbeddings = embeddings.slice(i, i + DB_CHUNK_SIZE);

      const rows = chunk.map((b, idx) => ({
        service_id: b.serviceId,
        service_name: b.serviceName,
        service_purpose: b.servicePurpose,
        support_type: b.supportType,
        target_audience: b.targetAudience,
        selection_criteria: b.selectionCriteria,
        support_content: b.supportContent,
        application_method: b.applicationMethod,
        application_deadline: b.applicationDeadline,
        required_documents: b.requiredDocuments,
        contact_agency: b.contactAgency,
        contact_phone: b.contactPhone,
        online_application_url: b.onlineApplicationUrl,
        detail_url: b.detailUrl,
        managing_agency: b.managingAgency,
        managing_agency_type: b.managingAgencyType,
        service_category: b.serviceCategory,
        law: b.law,
        administrative_rule: b.administrativeRule,
        local_regulation: b.localRegulation,
        embedding_text: b.embeddingText,
        embedding: JSON.stringify(chunkEmbeddings[idx]),
        updated_at: b.updatedAt,
      }));

      const { error } = await supabase
        .from('benefits')
        .upsert(rows, { onConflict: 'service_id' });

      if (error) {
        console.error(`적재 실패 (${i}~${i + chunk.length}):`, error.message);
      } else {
        inserted += chunk.length;
        console.log(`적재 ${inserted}/${benefits.length}건 완료`);
      }
    }

    console.log(`benefits 테이블 적재 완료: ${inserted}건`);
  });

embedCommand
  .command('conditions')
  .description('지원조건 데이터 benefit_conditions 테이블 적재')
  .action(async () => {
    const conditionsPath = resolve(DATA_DIR, 'conditions.json');
    if (!existsSync(conditionsPath)) {
      console.error('conditions.json이 없습니다. 먼저 fetch conditions를 실행하세요.');
      process.exit(1);
    }
    const rawConditions: SupportCondition[] = JSON.parse(readFileSync(conditionsPath, 'utf-8'));
    console.log(`${rawConditions.length}건 지원조건 데이터 로드 완료`);

    const conditions = rawConditions.map(transformCondition);
    const supabase = getSupabaseClient();
    let inserted = 0;

    for (let i = 0; i < conditions.length; i += DB_CHUNK_SIZE) {
      const chunk = conditions.slice(i, i + DB_CHUNK_SIZE);

      const rows = chunk.map((c) => ({
        service_id: c.serviceId,
        service_name: c.serviceName,
        gender: c.gender,
        age_start: c.ageStart,
        age_end: c.ageEnd,
        income_level: c.incomeLevel,
        family_status: c.familyStatus,
        occupation: c.occupation,
        social_status: c.socialStatus,
        business_status: c.businessStatus,
        vulnerability: c.vulnerability,
      }));

      const { error } = await supabase
        .from('benefit_conditions')
        .upsert(rows, { onConflict: 'service_id' });

      if (error) {
        console.error(`적재 실패 (${i}~${i + chunk.length}):`, error.message);
      } else {
        inserted += chunk.length;
        console.log(`적재 ${inserted}/${conditions.length}건 완료`);
      }
    }

    console.log(`benefit_conditions 테이블 적재 완료: ${inserted}건`);
  });
