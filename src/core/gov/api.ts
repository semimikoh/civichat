import type {
  Gov24ApiResponse,
  ServiceListItem,
  ServiceDetail,
  SupportCondition,
} from '@/core/types/gov24';

const BASE_URL = 'https://api.odcloud.kr/api/gov24/v3';

function getApiKey(): string {
  const key = process.env.GOV24_API_KEY;
  if (!key) {
    throw new Error('GOV24_API_KEY 환경변수가 설정되지 않았습니다.');
  }
  return key;
}

async function fetchApi<T>(
  endpoint: string,
  params: Record<string, string | number>,
): Promise<Gov24ApiResponse<T>> {
  const key = getApiKey();
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set('serviceKey', key);
  url.searchParams.set('returnType', 'JSON');

  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString());

  if (!res.ok) {
    throw new Error(`API 호출 실패: ${res.status} ${res.statusText}`);
  }

  const json: unknown = await res.json();
  const body = json as Gov24ApiResponse<T>;

  if (!Array.isArray(body.data)) {
    throw new Error(`API 응답 형식 오류: ${JSON.stringify(json).slice(0, 200)}`);
  }

  return body;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 서비스 목록 1페이지 조회 */
export async function fetchServiceList(
  page: number,
  perPage: number,
): Promise<Gov24ApiResponse<ServiceListItem>> {
  return fetchApi<ServiceListItem>('serviceList', { page, perPage });
}

/** 서비스 상세 조회 (서비스ID로 필터) */
export async function fetchServiceDetail(
  serviceId: string,
): Promise<Gov24ApiResponse<ServiceDetail>> {
  return fetchApi<ServiceDetail>('serviceDetail', {
    page: 1,
    perPage: 1,
    'cond[서비스ID::EQ]': serviceId,
  });
}

/** 지원조건 조회 (서비스ID로 필터) */
export async function fetchSupportConditions(
  serviceId: string,
): Promise<Gov24ApiResponse<SupportCondition>> {
  return fetchApi<SupportCondition>('supportConditions', {
    page: 1,
    perPage: 1,
    'cond[서비스ID::EQ]': serviceId,
  });
}

/** 전체 서비스 목록 수집 (페이지네이션) */
export async function fetchAllServiceList(
  perPage = 500,
  delayMs = 200,
): Promise<ServiceListItem[]> {
  const all: ServiceListItem[] = [];
  let page = 1;

  const first = await fetchServiceList(page, perPage);
  all.push(...first.data);
  const totalCount = first.totalCount;
  const totalPages = Math.ceil(totalCount / perPage);

  console.log(`총 ${totalCount}건, ${totalPages}페이지`);

  while (page < totalPages) {
    page += 1;
    await delay(delayMs);
    const res = await fetchServiceList(page, perPage);
    all.push(...res.data);
    console.log(`${page}/${totalPages} 페이지 완료 (${all.length}/${totalCount}건)`);
  }

  return all;
}

export interface BatchFetchResult<T> {
  results: T[];
  failedIds: string[];
}

/** 전체 서비스 상세 수집 */
export async function fetchAllServiceDetails(
  serviceIds: string[],
  delayMs = 100,
): Promise<BatchFetchResult<ServiceDetail>> {
  const results: ServiceDetail[] = [];
  const failedIds: string[] = [];
  const total = serviceIds.length;

  for (let i = 0; i < total; i++) {
    const id = serviceIds[i];
    try {
      const res = await fetchServiceDetail(id);
      if (res.data.length > 0) {
        results.push(res.data[0]);
      }
    } catch (err) {
      console.error(`상세 조회 실패 (${id}):`, err);
      failedIds.push(id);
    }

    if ((i + 1) % 100 === 0) {
      console.log(`상세 ${i + 1}/${total}건 완료`);
    }
    await delay(delayMs);
  }

  if (failedIds.length > 0) {
    console.warn(`상세 조회 실패 ${failedIds.length}건: ${failedIds.slice(0, 5).join(', ')}${failedIds.length > 5 ? ' ...' : ''}`);
  }

  return { results, failedIds };
}

/** 전체 지원조건 수집 */
export async function fetchAllSupportConditions(
  serviceIds: string[],
  delayMs = 100,
): Promise<BatchFetchResult<SupportCondition>> {
  const results: SupportCondition[] = [];
  const failedIds: string[] = [];
  const total = serviceIds.length;

  for (let i = 0; i < total; i++) {
    const id = serviceIds[i];
    try {
      const res = await fetchSupportConditions(id);
      if (res.data.length > 0) {
        results.push(res.data[0]);
      }
    } catch (err) {
      console.error(`지원조건 조회 실패 (${id}):`, err);
      failedIds.push(id);
    }

    if ((i + 1) % 100 === 0) {
      console.log(`지원조건 ${i + 1}/${total}건 완료`);
    }
    await delay(delayMs);
  }

  if (failedIds.length > 0) {
    console.warn(`지원조건 조회 실패 ${failedIds.length}건: ${failedIds.slice(0, 5).join(', ')}${failedIds.length > 5 ? ' ...' : ''}`);
  }

  return { results, failedIds };
}
