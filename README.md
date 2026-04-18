# CiviChat

정부 복지 혜택 10,919개와 법령 조문 31,066개를 자연어로 검색하는 대화형 AI 서비스입니다.

조건 추출은 LLM 호출 없이 정규식으로 즉시 처리하고, 검색 결과 요약에는 LLM SSE 스트리밍을 적용했습니다. 벡터 검색과 키워드 검색을 RRF로 결합한 하이브리드 검색 위에 조건/지역/키워드 기반 재정렬을 적용해 정확도를 높이고, 검색 결과 이벤트를 먼저 전송해 사용자가 응답 시작을 즉시 인지할 수 있도록 설계했습니다.

> 이런 질문을 자연어로 입력하면 맞춤 복지 혜택과 관련 법령을 찾아줍니다.

- "26살 무직인데 받을 수 있는 지원금" -- 나이 + 직업 조건 검색
- "서울 1인가구 주거 지원" -- 지역 + 키워드 검색
- "임산부 혜택 알려줘" -- 특정 대상 검색
- "장애인 고용 의무 법령" -- 법령 조문 검색
- "청년 주거 지원 법" -- 법령 키워드 검색

---

## Why

기존 정보 서비스는 메뉴 탐색 중심이라
사용자가 원하는 답을 빠르게 찾기 어려운 경우가 많았습니다.

CiviChat은 검색창 대신 대화형 인터페이스를 통해
사용자가 자연스럽게 질문하고 필요한 정보를 얻을 수 있도록 기획했습니다.
생성형 AI 응답을 프론트엔드에서 어떻게 수신하고 단계별로 렌더링할지, 검색 결과를 대화 흐름 안에서 어떻게 보여줄지를 설계하는 과정이 이 프로젝트의 핵심입니다.

---

## Demo

[Live Demo](https://civichat-kappa.vercel.app)

### Screenshots

<p>
  <img src="docs/screenshots/benefit-search.gif" alt="복지 검색" width="360" />
  <img src="docs/screenshots/legal-search.gif" alt="법령 검색" width="360" />
</p>

---

## Features

- 자연어 질문으로 복지 혜택 검색 (10,919개 정부 서비스)
- 법령 조문 검색 (687개 법령, 31,066개 조문)
- 대화 히스토리 기반 멀티턴 검색 (이전 조건 누적)
- 조건 초기화 명령어 (`초기화`, `리셋`, `처음부터`) 지원
- LLM 요약 SSE 스트리밍 + 어절 단위 타이프라이터
- 로딩 / 에러 상태 처리 (Error Boundary, 스피너)
- API 오류 트래킹 (Sentry 직접 capture)
- 검색 쿼리 임베딩 LRU 캐시
- 검색 결과 카드 순차 애니메이션
- 가상 스크롤 (DOM 렌더 전 Canvas 기반 텍스트 너비 측정 + 높이 사전 계산)
- 반응형 UI
- 접근성 (시맨틱 마크업, ARIA, Skip Link)
- 검색 품질 평가 테스트 + GitHub Actions CI
- GitHub Actions 데이터 갱신 파이프라인

**공식 API와 공개 데이터만 사용합니다.** 민간 플랫폼 크롤링은 의도적으로 피했습니다.

---

## Tech Stack

| 영역       | 기술                                     | 선택 이유                                        |
| ---------- | ---------------------------------------- | ------------------------------------------------ |
| 프레임워크 | Next.js 16 (App Router)                  | RSC + API Route로 프론트/백엔드 통합             |
| 언어       | TypeScript (strict)                      | 타입 안전성 + 런타임 에러 방지                   |
| UI         | Mantine v9                               | 시맨틱 컴포넌트 + 다크모드 + 반응형              |
| 벡터 DB    | Supabase (pgvector + HNSW)               | 별도 벡터 DB 인프라 없이 RDB + 벡터 검색 통합    |
| 임베딩     | OpenAI text-embedding-3-small (1536차원) | 비용 효율 + 한국어 성능                          |
| LLM 요약   | GPT-4o-mini (SSE 스트리밍)               | 검색 결과를 쉬운 말로 요약                       |
| 가상화     | @tanstack/react-virtual                  | 메시지 목록 가상 스크롤, `estimateSize`에 사전 계산 높이 전달 |
| 모니터링   | Sentry                                   | API Route 검색/요약 실패 수집                  |
| CLI        | Commander + tsx                          | 백엔드 로직을 터미널에서 직접 검증               |
| 테스트     | Vitest + React Testing Library            | 유닛/컴포넌트 테스트 71개 + 검색 품질 평가       |
| 배포       | Vercel + Supabase Cloud                  | 프론트엔드/DB 각각 관리형 서비스                 |
| CI/CD      | GitHub Actions                           | lint/test/build, 검색 품질 평가, 데이터 갱신     |

---

## Architecture

```
User Input (자연어 질문)
  → 조건 추출 (정규식 기반, LLM 호출 없음)
  → 하이브리드 검색 (벡터 + 키워드 RRF)
  → 조건/지역/키워드 기반 재정렬
  → LLM 요약 스트리밍
  → Chat UI 렌더링
```

```
Client (Chat UI)
   ↓
API Route (SSE 스트리밍)
   ↓
core/ (순수 TypeScript, React 무관)
   ↓
Supabase (pgvector) + OpenAI
   ↓
Response Stream
   ↓
UI Update (타이프라이터 + 카드 순차 표시)
```

### 핵심 설계 원칙: `src/core/`에 비즈니스 로직 격리

- `core/`는 React/Next.js에 의존하지 않는 순수 TypeScript
- CLI와 API Route가 같은 함수를 공유
- 새 기능은 항상 CLI에서 먼저 검증 후 UI에 연결

### 디렉토리 구조

```
src/
├── core/                # 백엔드 로직 (React/Next 무관, 순수 TypeScript)
│   ├── benefit/         #   복지 검색 + 조건 추출 + LLM 요약
│   │   ├── extract-patterns.ts # 조건 추출 정규식 설정
│   ├── legal/           #   법령 파싱 + 검색 + LLM 요약
│   ├── embeddings/      #   OpenAI text-embedding-3-small
│   ├── gov/             #   보조금24 API 연동
│   ├── db/              #   Supabase 클라이언트 (단일 인스턴스)
│   └── types/           #   공유 타입 정의 (benefit, law, gov24, sse)
│
├── cli/                 # CLI 진입점 (core를 터미널에서 실행)
│   └── commands/        #   fetch, embed, search, legal-fetch, legal-embed, legal-search
│
├── app/                 # Next.js App Router
│   ├── api/benefit/     #   복지 검색 SSE 스트리밍 API
│   ├── api/legal/       #   법령 검색 SSE 스트리밍 API
│   ├── benefit/         #   복지 탭 페이지
│   ├── legal/           #   법령 탭 페이지
│   ├── layout.tsx       #   루트 레이아웃
│   └── page.tsx         #   홈 (탭 라우팅)
│
├── components/          # React 컴포넌트
│   ├── benefit/         #   ChatContainer, MessageList, BenefitCard, StaggeredResults
│   ├── legal/           #   ChatContainer, LawArticleCard (아코디언)
│   ├── home/            #   TabNav
│   └── providers/       #   Mantine Provider 래퍼
│
└── lib/
    ├── text-layout/     #   자체 텍스트 측정 모듈 (O(log n) 줄바꿈)
    ├── sentry.ts        #   API Route 에러 수집 래퍼
    ├── use-chat-search-stream.ts # 복지/법령 공통 검색 스트림 훅
    ├── use-sse-stream.ts #  SSE 스트림 파싱 유틸
    └── use-typewriter.ts #  어절 단위 타이프라이터 훅
```

---

## Engineering Decisions

### 1. 대화형 UI에서 비동기 상태 분리

SSE 스트리밍 응답을 검색 결과 이벤트와 요약 스트림으로 분리했습니다. 서버는 검색 결과 이벤트를 먼저 보내고, 이어서 LLM 요약 청크를 스트리밍합니다. 클라이언트는 공통 `useChatSearchStream` 훅에서 로딩/결과/요약/에러 상태를 처리해 복지와 법령 검색의 흐름을 같은 방식으로 관리합니다.

### 2. DOM 렌더 전 텍스트 너비 측정과 높이 사전 계산

Canvas 기반 워드프로세서 개발 경험([블로그 글](https://velog.io/@semimi/%EC%95%8C%EA%B3%A0%EB%A6%AC%EC%A6%98-%EA%B3%BC%EC%97%B0-%EC%82%AC%EC%9A%A9%ED%95%A0-%EC%9D%BC%EC%9D%B4-%EC%97%86%EC%9D%84%EA%B9%8C%EC%9A%94))에서 구현한 O(log n) 줄바꿈 최적화를 적용했습니다.

메시지 텍스트를 DOM에 넣기 전에 Canvas로 문자 폭을 측정하고, 컨테이너 폭 기준으로 줄바꿈 위치를 계산합니다. 이후 줄 수와 카드/아코디언 높이를 합산해 메시지 높이를 추정하고, 이 값을 `@tanstack/react-virtual`의 `estimateSize`에 전달합니다. 실제 DOM 렌더 전에도 스크롤 높이를 예측할 수 있어, 긴 대화와 스트리밍 타이핑 중에도 스크롤 위치가 흔들리지 않습니다.

`getBoundingClientRect` 기반 DOM 측정 방식과 비교했을 때, 스트리밍 중 높이 측정의 스크립팅 비용이 85% 감소했습니다 (1,282ms → 193ms, Chrome DevTools Performance 기준).

### 3. 비즈니스 로직과 UI의 완전 분리

`src/core/`에 검색/추출/요약 로직을 순수 TypeScript로 격리했습니다. CLI와 API Route가 동일한 함수를 호출하므로, 새 기능은 터미널에서 먼저 검증한 후 UI에 연결합니다. React/Next.js 의존이 없어 테스트도 빠릅니다.

### 4. LLM 호출 없는 조건 추출

나이/성별/직업/지역을 정규식 기반으로 즉시 추출합니다. LLM 호출 대비 지연 시간이 0에 가깝고, 대화 히스토리에서 이전 조건을 누적하여 멀티턴 검색을 지원합니다. 조건이 부족하면 추가 질문을 반환하고, `초기화`, `리셋`, `처음부터` 같은 명령어로 누적 조건을 비울 수 있습니다. 정규식 패턴은 `extract-patterns.ts`에 분리해 새 조건을 추가하기 쉽게 구성했습니다.

### 5. 하이브리드 검색 (벡터 + 키워드 RRF)

벡터 검색만으로는 "서울 청년" 같은 구조적 조건 매칭이 약하고, 키워드 검색만으로는 서술형 검색이 불가능합니다. 두 결과를 RRF(Reciprocal Rank Fusion)로 합산하고, JA 코드 구조화 필터 + 연령/컨텍스트 후처리 + 조건/지역/키워드 기반 최종 재정렬로 정확도를 높였습니다. 지역 필터 검색과 전국 후보 검색을 함께 수행해 중앙부처/전국형 혜택이 누락되지 않도록 했습니다.

---

<details>
<summary><h2 style="display:inline">검색 파이프라인 상세</h2></summary>

### 복지 검색: 조건 추출 + 하이브리드 검색 + 후처리 재정렬

```
사용자 입력 ("26살 무직인데 서울에서 받을 수 있는 지원금")
  |
  v
조건 추출 (코드 기반, LLM 호출 없음)
  -> age: 26, occupation: "구직자", region: "서울"
  -> 대화 히스토리에서 이전 조건 누적 (멀티턴)
  -> 조건 부족 시 추가 질문 반환 ("성별도 알려주시면 더 정확해요!")
  |
  v
POST /api/benefit/search (SSE 스트리밍)
  |
  +---> 하이브리드 검색 (match_benefits_hybrid RPC)
  |     벡터 검색 (pgvector 코사인 유사도)
  |     + 키워드 검색 (tsvector, 서비스명 A가중치)
  |     + RRF 합산 (rrf_k=60)
  |     + 지역 후보와 전국 후보 병합
  |
  +---> 후처리 필터 + 최종 재정렬
  |     1. JA 코드 필터: 나이/성별/직업 구조화 조건 매칭
  |     2. 연령 텍스트 필터: "노인"/"아동" 등 연령 부적합 서비스 제외
  |     3. 컨텍스트 필터: 미언급 특수 대상(임산부/장애인/보훈) 제외
  |     4. 키워드 부스트: 쿼리/추출 키워드와 서비스명/본문 매칭
  |     5. 지역 부스트: 시군구/광역시도/전국형 서비스 반영
  |     6. 조건 부스트: 구직자, 임산부, 소상공인, 한부모, 저소득, 신혼 등 대상 매칭
  |     7. 마감/종료 서비스 감점
  |
  v
검색 결과 이벤트 선전송 -> LLM 요약 스트리밍 (gpt-4o-mini) -> 결과 카드 표시
```

### 법령 검색: 하이브리드 검색 + LLM 요약

```
사용자 입력 ("장애인 고용 의무")
  |
  v
POST /api/legal/search (SSE 스트리밍)
  |
  +---> 하이브리드 검색 (match_law_articles_hybrid RPC)
  |     벡터 검색 (pgvector 코사인 유사도)
  |     + 키워드 검색 (tsvector, 법령명/조문제목 A가중치)
  |     + RRF 합산
  |
  v
LLM 요약 스트리밍 (법률 용어 → 일상 언어) -> 아코디언 조문 목록
```

### 조건 추출 상세

LLM 호출 없이 정규식 기반으로 조건을 즉시 추출합니다:

```typescript
"26살 여자 대학생인데 서울 혜택"
  -> age: 26          // "26살" 패턴 매칭
  -> gender: "여성"    // "여자" -> 여성 매핑
  -> occupation: "대학생" // 주요 직업/상태 레이블 매칭
  -> region: "서울특별시" // 광역시도 매핑
  -> keywords: ["혜택"]
```

대화 히스토리에서 이전에 언급한 **나이, 성별, 직업, 지역, 키워드**를 모두 누적하여 멀티턴 검색을 지원합니다.
`취준생`, `소상공인`, `한부모`, `차상위`, `기초수급자`, `에너지 바우처` 같은 표현도 정규식 패턴으로 구조화합니다.

### 하이브리드 검색 상세

벡터 검색만으로는 "서울 청년"같은 구조적 조건 매칭이 약하고, 키워드 검색만으로는 "취업이 어려운 사람을 위한 지원"같은 서술형 검색이 불가능합니다. 두 결과를 **RRF(Reciprocal Rank Fusion)** 로 합산합니다:

```sql
-- RRF: 벡터 순위 + 키워드 순위 기반 점수 합산
coalesce(1.0 / (rrf_k + rank_v), 0) + coalesce(1.0 / (rrf_k + rank_k), 0) as rrf_score

-- 최종 유사도: 코사인 유사도 70% + RRF 정규화 30%
greatest(cosine_sim, 0) * 0.7 + (rrf_score * 30) * 0.3 as similarity
```

DB에서 가져온 후보는 애플리케이션 레이어에서 한 번 더 재정렬합니다:

```typescript
finalScore =
  similarity
  + keywordBoost       // 서비스명/본문 키워드 매칭
  + regionBoost        // 시군구/광역시도/전국형 서비스
  + conditionBoost     // 대상 조건 매칭
  + closedPenalty;     // 마감/종료 감점
```

</details>

---

## 자체 텍스트 측정 모듈

```
src/lib/text-layout/
├── cache.ts          # LRU 캐시 (font + text -> width, 최대 2000항목)
├── measure.ts        # Canvas measureText + 누적 폭 배열 (Float64Array)
├── prepared.ts       # 이진탐색 줄바꿈 + 마크다운 파싱 + 복합 높이 추정
└── use-message-height.ts  # React 훅 + @tanstack/react-virtual 연동
```

1. **누적 폭 배열 (O(n))**: Canvas `measureText`로 각 문자의 폭을 측정, `Float64Array`에 누적합 저장. 임의 구간 `text[a..b]`의 폭을 `arr[b] - arr[a]`로 O(1) 계산
2. **이진탐색 줄바꿈 (O(log n) per line)**: 한 줄에 들어가는 최대 문자 인덱스를 누적 폭 배열에서 이진탐색. 선형 탐색 O(n) 대비 개선

```typescript
while (lo < hi) {
  const mid = (lo + hi + 1) >>> 1;
  const lineWidth = cumWidths[mid] - cumWidths[lineStart];
  if (lineWidth <= availableWidth) lo = mid;
  else hi = mid - 1;
}
// -> 띄어쓰기/CJK 경계로 후퇴하여 자연스러운 줄바꿈
```

3. **DOM 렌더 전 높이 추정**: 메시지를 DOM에 넣기 전에 컨테이너 폭 기준 줄 수를 계산하고, 마크다운 텍스트 높이 + 도메인별 추가 높이(`extraHeight`)를 합산
4. **virtualizer 연동**: 사전 계산한 메시지 높이를 `@tanstack/react-virtual`의 `estimateSize`에 전달. 화면 밖 메시지도 실제 렌더 전 높이를 예측해 긴 대화에서 스크롤 위치를 안정화

### TypeWriter: 어절 단위 타이핑 애니메이션

LLM 스트리밍 응답을 어절(띄어쓰기) 단위로 순차 표시합니다. 텍스트 측정 모듈로 최종 높이를 미리 계산하여 타이핑 중 레이아웃 점프를 줄입니다. 한글은 글자 단위보다 어절 단위가 읽는 리듬과 맞아 자연스럽습니다.

---

## 법령 데이터 파이프라인

legalize-kr Git 저장소의 마크다운 법령 데이터를 구조화된 조문 단위로 변환합니다.

```
data/legalize-kr/kr/유아교육법/법률.md
  |
  v
YAML frontmatter 파싱 (제목, 소관부처, 공포일자, 시행일자, 상태)
  + 마크다운 본문 -> "##### 제X조 (제목)" 패턴으로 조문 분리
  + 항 번호(①②③) / 호 번호(1. 2. 3.) 줄바꿈 유지
  + (법령명, 법령구분, 조문번호) 기준 중복 제거
  |
  v
복지 서비스 법령 필드 파싱
  "유아교육법(제24조)||영유아보육법(제34조)" -> [{lawName, articleRef}, ...]
  -> legalize-kr 디렉토리 매칭 (시행령/시행규칙도 처리)
  -> 7,398건 참조 중 7,359건 매칭 (99.5%), 미매칭 8종
  |
  v
OpenAI 임베딩 + Supabase 적재 (rate limit 재시도, --skip-existing)
```

GitHub Actions의 `Data Pipeline` 워크플로우로 매주 갱신하거나 수동 실행할 수 있습니다. `benefit`, `legal`, `all` 중 갱신 대상을 선택합니다.

---

## 데이터

| 소스                                 | 건수     | 수집 방법                              |
| ------------------------------------ | -------- | -------------------------------------- |
| 복지 서비스 (목록 + 상세 + 지원조건) | 10,919건 | 행정안전부 보조금24 OpenAPI            |
| 법령 조문                            | 31,066건 | legalize-kr 마크다운 파싱 (687개 법령) |

---

## 접근성

대화형 AI 서비스는 비동기 상태 변화가 잦아, 스크린 리더 사용자가 응답 시작과 완료를 인지하기 어렵습니다. 시맨틱 마크업과 ARIA 속성으로 상태 변화를 전달하도록 설계했습니다.

- **시맨틱 구조**: `role="main"`, `role="search"`, `role="log"`, `role="article"`
- **ARIA 속성**: `aria-live="polite"`, `aria-busy`, `aria-label`
- **Skip Link**: "검색 입력으로 건너뛰기"
- **로딩 상태**: `role="status"` + `aria-label="검색 중"`
- **외부 링크**: `rel="noopener noreferrer"` + `aria-label`
- **키 관리**: 리스트 key에 안정적인 도메인 id 사용 (index 사용 금지)
- **다크모드**: Mantine 시맨틱 컬러 (하드코딩 없음)

---

## 성능 측정 결과

Lighthouse 및 Chrome DevTools Performance로 측정한 결과입니다.

### Lighthouse (라이브 배포 기준)

<img src="docs/screenshots/lighthouse.png" alt="Lighthouse 스코어: Performance 99, Accessibility 89, Best Practices 100, SEO 100" width="480" />

| 항목 | 점수 |
| --- | --- |
| Performance | 99 |
| Accessibility | 89 |
| Best Practices | 100 |
| SEO | 100 |
| CLS | 0 |

### SSE 스트리밍 응답 시간

| 항목 | 시간 |
| --- | --- |
| TTFB (첫 토큰 도달) | ~6.2s |
| 전체 응답 (스트리밍 포함) | ~9.6s |

서버 사이드(임베딩 검색 + LLM 호출) 처리 시간이 대부분이며, SSE로 검색 결과 이벤트를 먼저 전달하고 이후 요약 청크를 스트리밍해 체감 지연을 완화했습니다.

### 텍스트 높이 측정 방식 비교 (Chrome DevTools Performance)

| 지표 | getBoundingClientRect | Canvas measureText | 차이 |
| --- | --- | --- | --- |
| Scripting | 1,282ms | 193ms | **85% 감소** |
| Rendering | 35ms | 27ms | 23% 감소 |
| Painting | 18ms | 13ms | 28% 감소 |

`getBoundingClientRect`는 매번 숨겨진 DOM 요소에 텍스트를 넣고 reflow를 발생시켜 높이를 측정합니다. Canvas 방식은 DOM 밖에서 문자 폭을 계산하므로 reflow 없이 높이를 추정합니다.

---

## 테스트

```bash
pnpm test
pnpm test:search-quality
```

| 모듈                 | 테스트 항목                                                      | 건수   |
| -------------------- | ---------------------------------------------------------------- | ------ |
| search/extract       | 나이/성별/직업/지역 추출, 키워드 분류, 대화 누적, 검색/질문 판단 | 33     |
| text-layout/cache    | LRU 동작, 용량 초과, set/get/clear                               | 6      |
| text-layout/prepared | 이진탐색 줄바꿈, 마크다운 파싱, 복합 높이 추정                   | 12     |
| ChatInput            | 빈 입력 차단, 공백 차단, trim 제출, disabled 상태, 버튼 클릭     | 5      |
| BenefitCard          | 서비스명/유사도, 지원유형 배지, 조건 태그, 외부 링크, fallback   | 10     |
| TabNav               | 탭 렌더링, 경로별 활성 탭, 탭 클릭 라우팅                        | 5      |
| **전체**             |                                                                  | **71** |

`pnpm test`는 빠른 유닛/컴포넌트 테스트만 실행합니다. `pnpm test:search-quality`는 OpenAI/Supabase를 호출하는 검색 품질 평가로, CI에서는 `main` push 시 별도 job에서 실행합니다.

---

## 로컬 실행

```bash
# 의존성 설치
pnpm install

# 환경변수 설정
cp .env.example .env.local
# SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, GOV24_API_KEY
# 선택: NEXT_PUBLIC_SENTRY_DSN

# 개발 서버
pnpm run dev

# CLI 검색
pnpm run cli search "26살 무직 지원금"
pnpm run cli legal-search "청년 주거 지원 법령"
pnpm run cli eval
```

### 데이터 파이프라인

```bash
# 복지 데이터
pnpm run cli fetch list         # 보조금24에서 서비스 목록 수집
pnpm run cli fetch details      # 서비스 상세 정보 수집
pnpm run cli fetch conditions   # 지원 조건 수집
pnpm run cli embed benefits     # 임베딩 생성 + Supabase 적재
pnpm run cli embed conditions   # 지원 조건 DB 적재

# 법령 데이터
git clone https://github.com/legalize-kr/legalize-kr.git data/legalize-kr
pnpm run cli legal-fetch parse  # 마크다운 파싱 -> 조문 JSON
pnpm run cli legal-fetch match  # 복지 서비스 법령 필드 매칭 확인
pnpm run cli legal-embed articles # 임베딩 생성 + Supabase 적재
```
