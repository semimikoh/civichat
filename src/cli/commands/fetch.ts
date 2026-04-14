import { Command } from 'commander';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  fetchAllServiceList,
  fetchAllServiceDetails,
  fetchAllSupportConditions,
} from '@/core/gov/api';

const DATA_DIR = resolve(process.cwd(), 'data');

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
    const { readFileSync, existsSync } = await import('node:fs');
    const servicesPath = resolve(DATA_DIR, 'services.json');
    if (!existsSync(servicesPath)) {
      console.error('services.json이 없습니다. 먼저 fetch list를 실행하세요.');
      process.exit(1);
    }
    const services = JSON.parse(readFileSync(servicesPath, 'utf-8')) as Array<{ 서비스ID: string }>;
    const serviceIds = services.map((s) => s.서비스ID);

    console.log(`서비스 상세 수집 시작 (${serviceIds.length}건)...`);
    const details = await fetchAllServiceDetails(serviceIds);
    saveJson('details.json', details);
    console.log(`총 ${details.length}건 수집 완료`);
  });

fetchCommand
  .command('conditions')
  .description('지원조건 전체 수집 (services.json 필요)')
  .action(async () => {
    const { readFileSync, existsSync } = await import('node:fs');
    const servicesPath = resolve(DATA_DIR, 'services.json');
    if (!existsSync(servicesPath)) {
      console.error('services.json이 없습니다. 먼저 fetch list를 실행하세요.');
      process.exit(1);
    }
    const services = JSON.parse(readFileSync(servicesPath, 'utf-8')) as Array<{ 서비스ID: string }>;
    const serviceIds = services.map((s) => s.서비스ID);

    console.log(`지원조건 수집 시작 (${serviceIds.length}건)...`);
    const conditions = await fetchAllSupportConditions(serviceIds);
    saveJson('conditions.json', conditions);
    console.log(`총 ${conditions.length}건 수집 완료`);
  });
