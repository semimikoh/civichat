import OpenAI from 'openai';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다.');
  client = new OpenAI({ apiKey });
  return client;
}

export interface ExtractedConditions {
  age: number | null;
  gender: '남성' | '여성' | null;
  occupation: string | null;
  region: string | null;
  keywords: string[];
  searchQuery: string;
}

export interface AnalysisResult {
  action: 'search' | 'ask';
  conditions: ExtractedConditions;
  followUpQuestion?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `너는 정부 복지 혜택 검색 도우미야. 사용자의 메시지와 대화 맥락을 보고 두 가지 중 하나를 결정해.

1. **search**: 검색할 수 있을 만큼 정보가 충분하면 조건을 추출하고 검색 실행
2. **ask**: 정보가 부족하면 친절하게 추가 질문

## 검색 가능한 최소 조건
다음 중 **2개 이상** 있으면 검색 가능:
- 나이 또는 연령대
- 성별
- 직업/고용 상태 (무직, 대학생, 직장인 등)
- 구체적인 혜택 종류 (주거, 취업, 출산, 의료 등)
- 지역

"지원금 알려줘" 처럼 너무 막연하면 질문해.
"임산부 혜택" 처럼 구체적인 주제가 있으면 1개여도 검색해.

## 대화 맥락
이전 대화에서 이미 수집한 정보가 있으면 합산해서 판단해. 예: 이전에 "26살 무직"이라고 했고 이번에 "서울이요"라고 하면, 나이+직업+지역 3개 있으므로 검색.

## JSON 응답 형식
반드시 JSON으로만 응답.

### 검색할 때:
{"action":"search","conditions":{"age":26,"gender":null,"occupation":"구직자/실업자","region":null,"keywords":["구직활동","지원금"],"searchQuery":"미취업 청년 구직활동 지원금 취업지원"}}

### 질문할 때:
{"action":"ask","conditions":{"age":null,"gender":null,"occupation":null,"region":null,"keywords":[],"searchQuery":""},"followUpQuestion":"어떤 종류의 지원을 찾고 계신가요? 예를 들어 취업, 주거, 의료, 출산 등이 있어요."}

## 조건 추출 규칙
- age: 숫자만. "26살" → 26, "30대" → 35, 없으면 null
- gender: "남성" 또는 "여성", 없으면 null
- occupation: "무직" → "구직자/실업자", "대학생" → "대학생/대학원생", "직장인" → "근로자/직장인", 없으면 null
- region: 사용자가 명시적으로 언급한 경우만. 없으면 null
- keywords: 나이/성별/지역 제외한 실질적 검색어
- searchQuery: 벡터 검색에 최적화된 문장. 지역 미언급 시 지역 넣지 마

## 질문 스타일
- 친근하고 짧게
- 선택지를 제시해서 답하기 쉽게
- 한 번에 하나만 질문`;

export async function analyzeQuery(
  userQuery: string,
  history: ConversationMessage[],
): Promise<AnalysisResult> {
  const openai = getClient();

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  // 대화 맥락 추가 (최근 6개)
  const recentHistory = history.slice(-6);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: 'user', content: userQuery });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    response_format: { type: 'json_object' },
    temperature: 0,
    max_tokens: 300,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    return {
      action: 'ask',
      conditions: emptyConditions(),
      followUpQuestion: '어떤 복지 혜택을 찾고 계신가요?',
    };
  }

  const parsed = JSON.parse(content) as Record<string, unknown>;
  const conditions = parseConditions(parsed.conditions as Record<string, unknown> | undefined);

  if (parsed.action === 'search') {
    return { action: 'search', conditions };
  }

  return {
    action: 'ask',
    conditions,
    followUpQuestion: typeof parsed.followUpQuestion === 'string'
      ? parsed.followUpQuestion
      : '조금 더 알려주시면 정확한 혜택을 찾아드릴게요!',
  };
}

function emptyConditions(): ExtractedConditions {
  return { age: null, gender: null, occupation: null, region: null, keywords: [], searchQuery: '' };
}

function parseConditions(raw: Record<string, unknown> | undefined): ExtractedConditions {
  if (!raw) return emptyConditions();
  return {
    age: typeof raw.age === 'number' ? raw.age : null,
    gender: raw.gender === '남성' || raw.gender === '여성' ? raw.gender : null,
    occupation: typeof raw.occupation === 'string' ? raw.occupation : null,
    region: typeof raw.region === 'string' ? raw.region : null,
    keywords: Array.isArray(raw.keywords) ? raw.keywords.map(String) : [],
    searchQuery: typeof raw.searchQuery === 'string' ? raw.searchQuery : '',
  };
}
