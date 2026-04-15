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

/** 텍스트 배열을 배치로 임베딩 생성 */
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

export { MODEL, DIMENSIONS, BATCH_SIZE };
