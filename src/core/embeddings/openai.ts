import OpenAI from 'openai';

const MODEL = 'text-embedding-3-small';
const DIMENSIONS = 1536;
const BATCH_SIZE = 100;

let openaiClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (openaiClient) return openaiClient;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다.');
  }

  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

/** 텍스트 배열을 배치로 임베딩 생성 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const client = getClient();
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const response = await client.embeddings.create({
      model: MODEL,
      input: batch,
      dimensions: DIMENSIONS,
    });

    const batchEmbeddings = response.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);

    allEmbeddings.push(...batchEmbeddings);

    if (i + BATCH_SIZE < texts.length) {
      console.log(`임베딩 ${Math.min(i + BATCH_SIZE, texts.length)}/${texts.length}건 완료`);
    }
  }

  return allEmbeddings;
}

export { MODEL, DIMENSIONS, BATCH_SIZE };
