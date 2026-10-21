import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const DATA_DIR = resolve(process.cwd(), 'data');

/** services.json에서 서비스 ID 목록을 로드한다. 파일이 없으면 프로세스 종료. */
export function loadServiceIds(): string[] {
  const servicesPath = resolve(DATA_DIR, 'services.json');
  if (!existsSync(servicesPath)) {
    console.error('services.json이 없습니다. 먼저 fetch list를 실행하세요.');
    process.exit(1);
  }
  const services = JSON.parse(readFileSync(servicesPath, 'utf-8')) as Array<{ 서비스ID: string }>;
  return services.map((s) => s.서비스ID);
}
