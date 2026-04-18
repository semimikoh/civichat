import OpenAI from 'openai';

const MODEL = 'text-embedding-3-small';
const DIMENSIONS = 1536;
const BATCH_SIZE = 100;

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (openaiClient) return openaiClient;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다.');
  }

  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

const MAX_RETRIES = 5;

/** 단일 배치 임베딩 (rate limit 재시도 포함) */
async function embedBatchWithRetry(client: OpenAI, batch: string[]): Promise<number[][]> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await client.embeddings.create({
        model: MODEL,
        input: batch,
        dimensions: DIMENSIONS,
      });
      return response.data
        .sort((a, b) => a.index - b.index)
        .map((d) => d.embedding);
    } catch (err) {
      const isRateLimit = err instanceof Error && 'status' in err && (err as { status: number }).status === 429;
      if (isRateLimit && attempt < MAX_RETRIES - 1) {
        const waitMs = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.log(`rate limit, ${waitMs}ms 대기 후 재시도 (${attempt + 1}/${MAX_RETRIES})...`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error('임베딩 재시도 횟수 초과');
}

// --- LRU 캐시 (검색 쿼리 임베딩용, 서버 메모리) ---
const CACHE_MAX = 256;
const embeddingCache = new Map<string, number[]>();

/** LRU 갱신: 접근된 항목을 Map 맨 뒤로 이동 */
function accessCachedEmbedding(text: string): number[] | undefined {
  const cached = embeddingCache.get(text);
  if (cached) {
    // LRU: 접근 시 맨 뒤로 이동
    embeddingCache.delete(text);
    embeddingCache.set(text, cached);
  }
  return cached;
}

function setCachedEmbedding(text: string, embedding: number[]) {
  if (embeddingCache.size >= CACHE_MAX) {
    const oldest = embeddingCache.keys().next().value;
    if (oldest !== undefined) embeddingCache.delete(oldest);
  }
  embeddingCache.set(text, embedding);
}

/** 텍스트 배열을 배치로 임베딩 생성 (캐시 없음, CLI 배치 작업용) */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const client = getOpenAIClient();
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const batchEmbeddings = await embedBatchWithRetry(client, batch);
    allEmbeddings.push(...batchEmbeddings);

    if (i + BATCH_SIZE < texts.length) {
      console.log(`임베딩 ${Math.min(i + BATCH_SIZE, texts.length)}/${texts.length}건 완료`);
    }
  }

  return allEmbeddings;
}

/** 단일 검색 쿼리 임베딩 (LRU 캐시 적용) */
export async function embedQuery(text: string): Promise<number[]> {
  const cached = accessCachedEmbedding(text);
  if (cached) return cached;

  const [embedding] = await embedTexts([text]);
  setCachedEmbedding(text, embedding);
  return embedding;
}

export { MODEL, DIMENSIONS, BATCH_SIZE };
