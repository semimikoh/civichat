# CiviChat

> "26살 무직인데 받을 수 있는 지원금 있어?" -- 자연어로 정부 복지 혜택을 찾아주는 RAG 검색 챗봇

## 소개

나이, 직업, 지역 등 자신의 상황을 자연어로 입력하면 맞춤 복지 혜택을 찾아주는 RAG(Retrieval-Augmented Generation) 기반 검색 웹앱입니다.

- "26살 무직인데 받을 수 있는 지원금" -- 나이 + 직업 조건 검색
- "서울 1인가구 주거 지원" -- 지역 + 키워드 검색
- "임산부 혜택 알려줘" -- 특정 대상 검색
- "청년 창업 지원금" -- 분야별 검색

벡터 검색(의미 유사도)과 구조화 필터(JA 코드 기반 나이/성별/직업)를 결합하여, 하나의 검색창으로 10,919개 정부 서비스에서 맞춤 결과를 제공합니다.

---

## 기술 스택

| 영역 | 기술 | 선택 이유 |
| --- | --- | --- |
| 프레임워크 | Next.js 16 (App Router) | RSC + API Route로 프론트/백엔드 통합 |
| UI | Mantine v9 | 시맨틱 컴포넌트 + 다크모드 + 반응형 |
| 벡터 DB | Supabase (pgvector + HNSW) | 별도 벡터 DB 인프라 없이 RDB + 벡터 검색 통합 |
| 임베딩 | OpenAI text-embedding-3-small (1536차원) | 비용 효율 + 한국어 성능 |
| 조건 추출 | 코드 기반 키워드 파싱 | LLM 호출 없이 즉시 조건 추출 (지연 0ms) |
| 가상화 | @tanstack/react-virtual | 메시지 목록 가상 스크롤, DOM 없이 높이 사전 계산 |
| CLI | Commander + tsx | 백엔드 로직을 터미널에서 직접 검증 |
| 테스트 | Vitest | 유닛 테스트 46개 |
| 배포 | Vercel + Supabase Cloud | 프론트엔드/DB 각각 관리형 서비스 |

---

## 데이터

| 소스 | 건수 | 수집 방법 |
| --- | --- | --- |
| 보조금24 서비스 목록 | 10,919건 | 행정안전부 공공서비스(혜택) 정보 OpenAPI |
| 서비스 상세 정보 | 10,919건 | 동일 API (serviceDetail) |
| 지원 조건 (JA 코드) | 10,919건 | 동일 API (supportConditions) |

각 서비스의 **지원대상, 지원내용, 서비스목적** 텍스트를 임베딩하여, 의미 기반 검색과 구조화 필터링을 동시에 지원합니다.

**공식 API만 사용합니다.** 민간 플랫폼 크롤링은 의도적으로 피했습니다.

---

## 디렉토리 구조

```
src/
├── core/                # 백엔드 로직 (React/Next 무관, 순수 TypeScript)
│   ├── search/          #   벡터 검색 + 조건 추출 + LLM 요약
│   ├── embeddings/      #   OpenAI text-embedding-3-small
│   ├── gov/             #   보조금24 API 연동
│   ├── benefit/         #   JA 코드 매핑 + 데이터 정규화
│   ├── db/              #   Supabase 클라이언트 (단일 인스턴스)
│   └── types/           #   공유 타입 정의
│
├── cli/                 # CLI 진입점 (core를 터미널에서 실행)
│   └── commands/        #   fetch, embed, search
│
├── app/                 # Next.js App Router
│   ├── api/search/      #   SSE 스트리밍 검색 API
│   ├── layout.tsx       #   루트 레이아웃
│   └── page.tsx         #   홈 페이지
│
├── components/          # React 컴포넌트
│   ├── chat/            #   ChatContainer, MessageList, BenefitCard, StaggeredResults
│   └── providers/       #   Mantine Provider 래퍼
│
└── lib/
    └── text-layout/     #   자체 텍스트 측정 모듈 (아래 상세)
```

**핵심 설계 원칙: `src/core/`에 비즈니스 로직 격리**

- `core/`는 React/Next.js에 의존하지 않는 순수 TypeScript
- CLI와 API Route가 같은 함수를 공유
- 새 기능은 항상 **CLI에서 먼저 검증** 후 UI에 연결

---

## 검색 파이프라인

```
사용자 입력 ("26살 무직인데 서울에서 받을 수 있는 지원금")
  |
  v
조건 추출 (코드 기반, LLM 호출 없음)
  -> age: 26, occupation: "구직자", region: "서울"
  -> 조건 부족 시 추가 질문 반환 ("성별도 알려주시면 더 정확해요!")
  |
  v
POST /api/search (SSE 스트리밍)
  |
  +---> 벡터 검색: text-embedding-3-small -> pgvector 코사인 유사도
  |     (지역 있으면 match_benefits_by_region RPC로 필터)
  |
  +---> JA 코드 필터: benefit_conditions 테이블에서 나이/성별/직업 매칭
  |
  +---> 컨텍스트 필터: 언급하지 않은 특수 대상 서비스 제외
  |     (임산부, 장애인, 보훈, 다문화 등)
  |
  v
LLM 요약 스트리밍 -> 결과 카드 순차 표시
```

### 조건 추출 상세

LLM 호출 없이 정규식 기반으로 조건을 즉시 추출합니다:

```typescript
"26살 여자 대학생인데 서울 동작구 혜택"
  -> age: 26          // "26살" 패턴 매칭
  -> gender: "여성"    // "여자" -> 여성 매핑
  -> occupation: "대학생" // 26개 직업 레이블 매칭
  -> region: "서울특별시 동작구" // 시군구 + 광역시도 매핑
  -> keywords: ["혜택"]
```

대화 히스토리에서 이전에 언급한 조건을 누적하여, "나이는 26살이야" → "서울에서 받을 수 있는 거" 같은 멀티턴 검색을 지원합니다.

### 하이브리드 필터링

벡터 유사도만으로는 나이/성별 조건을 정확히 걸러낼 수 없습니다. 3단계 필터링으로 정밀도를 높입니다:

1. **벡터 검색**: 의미 유사도 상위 N건 추출
2. **JA 코드 필터**: benefit_conditions 테이블의 구조화된 조건으로 부적합 서비스 제외
3. **컨텍스트 필터**: 사용자가 언급하지 않은 특수 대상(임산부, 장애인 등) 서비스 제외

---

## 자체 텍스트 측정 모듈

> Canvas 기반 워드프로세서 개발 경험에서 구현한 O(log n) 줄바꿈 최적화를 RAG 챗봇 도메인에 적용했습니다.

### 문제

채팅 메시지의 높이를 알아야 가상 스크롤(virtualization)이 동작합니다. 일반적인 접근법은 DOM에 렌더링한 뒤 높이를 측정하는 것인데, 이 방식은:

1. **reflow 비용** -- 메시지 추가/리사이즈마다 브라우저 layout 재계산
2. **가상화 불가** -- 화면 밖 메시지의 높이를 모르면 스크롤 위치 계산 불가

### 해결: DOM 없이 텍스트 높이 사전 계산

```
src/lib/text-layout/
├── cache.ts          # LRU 캐시 (font + text -> width, 최대 2000항목)
├── measure.ts        # Canvas measureText + 누적 폭 배열 (Float64Array)
├── prepared.ts       # 이진탐색 줄바꿈 + 마크다운 파싱 + 복합 높이 추정
└── use-message-height.ts  # React 훅 + @tanstack/react-virtual 연동
```

**1단계: 누적 폭 배열 생성 -- O(n)**

Canvas `measureText` API로 각 문자의 폭을 측정하고, 누적합을 `Float64Array`에 저장합니다. 임의 구간 `text[a..b]`의 폭을 `arr[b] - arr[a]`로 O(1)에 계산할 수 있습니다.

**2단계: 이진탐색으로 줄바꿈 -- O(log n) per line**

한 줄에 들어가는 최대 문자 인덱스를 누적 폭 배열에서 이진탐색합니다. 선형 탐색(한 글자씩 폭 체크)이 O(n)인 반면, 이 방식은 **O(log n)** 입니다.

```typescript
// 이진탐색: containerWidth 안에 들어가는 최대 인덱스
while (lo < hi) {
  const mid = (lo + hi + 1) >>> 1;
  const lineWidth = cumWidths[mid] - cumWidths[lineStart];
  if (lineWidth <= availableWidth) lo = mid;
  else hi = mid - 1;
}
// -> 띄어쓰기/CJK 경계로 후퇴하여 자연스러운 줄바꿈
```

**3단계: 복합 메시지 높이 계산**

채팅 메시지는 마크다운 텍스트 + 혜택 카드가 복합적으로 들어갑니다. 각 요소의 높이를 합산하여 DOM 없이 전체 높이를 추정합니다.

---

## 접근성

- **시맨틱 구조**: `role="main"`, `role="search"`, `role="log"`, `role="article"`
- **ARIA 속성**: `aria-live="polite"`, `aria-busy`, `aria-label`
- **Skip Link**: "검색 입력으로 건너뛰기"
- **로딩 상태**: `role="status"` + `aria-label="검색 중"`
- **외부 링크**: `rel="noopener noreferrer"` + `aria-label`
- **키 관리**: 리스트 key에 `serviceId` 사용 (index 사용 금지)

---

## 테스트

```bash
pnpm test
```

| 모듈 | 테스트 항목 | 건수 |
| --- | --- | --- |
| search/extract | 나이/성별/직업/지역 추출, 키워드 분류, 대화 누적, 검색/질문 판단 | 33 |
| text-layout/cache | LRU 동작, 용량 초과, set/get/clear | 5 |
| text-layout/prepared | 이진탐색 줄바꿈, 마크다운 파싱, 복합 높이 추정 | 8 |
| **전체** | | **46** |

---

## 로컬 실행

```bash
# 의존성 설치
pnpm install

# 환경변수 설정
cp .env.example .env.local
# SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, GOV_API_KEY

# 개발 서버
pnpm run dev

# CLI 검색
pnpm run cli search "26살 무직 지원금"
```

### 데이터 파이프라인

```bash
pnpm run cli fetch list         # 보조금24에서 서비스 목록 수집
pnpm run cli fetch details      # 서비스 상세 정보 수집
pnpm run cli fetch conditions   # 지원 조건 수집
pnpm run cli embed benefits     # 임베딩 생성 + Supabase 적재
pnpm run cli embed conditions   # 지원 조건 DB 적재
```
