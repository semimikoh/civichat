import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command } from 'commander';
import {
  fetchAllServiceList,
  fetchAllServiceDetails,
  fetchAllSupportConditions,
} from '@/core/gov/api';
import { DATA_DIR, loadServiceIds } from '@/cli/commands/shared';

function saveJson(filename: string, data: unknown): void {
  mkdirSync(DATA_DIR, { recursive: true });
  const path = resolve(DATA_DIR, filename);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`저장 완료: ${path}`);
}

export const fetchCommand = new Command('fetch')
  .description('보조금24 API 데이터 수집');

fetchCommand
  .command('list')
  .description('서비스 목록 전체 수집')
  .action(async () => {
    console.log('서비스 목록 수집 시작...');
    const services = await fetchAllServiceList();
    saveJson('services.json', services);
    console.log(`총 ${services.length}건 수집 완료`);
  });

fetchCommand
  .command('details')
  .description('서비스 상세 전체 수집 (services.json 필요)')
  .action(async () => {
    const serviceIds = loadServiceIds();
    console.log(`서비스 상세 수집 시작 (${serviceIds.length}건)...`);
    const { results, failedIds } = await fetchAllServiceDetails(serviceIds);
    saveJson('details.json', results);
    console.log(`총 ${results.length}건 수집 완료${failedIds.length > 0 ? ` (실패 ${failedIds.length}건)` : ''}`);
  });

fetchCommand
  .command('conditions')
  .description('지원조건 전체 수집 (services.json 필요)')
  .action(async () => {
    const serviceIds = loadServiceIds();
    console.log(`지원조건 수집 시작 (${serviceIds.length}건)...`);
    const { results, failedIds } = await fetchAllSupportConditions(serviceIds);
    saveJson('conditions.json', results);
    console.log(`총 ${results.length}건 수집 완료${failedIds.length > 0 ? ` (실패 ${failedIds.length}건)` : ''}`);
  });
