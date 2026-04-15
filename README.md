# CiviChat

> "26살 무직인데 받을 수 있는 지원금 있어?" -- 자연어로 정부 복지 혜택과 관련 법령을 찾아주는 RAG 검색 챗봇

## 소개

나이, 직업, 지역 등 자신의 상황을 자연어로 입력하면 맞춤 복지 혜택 검색과 법령 조문 검색을 함께 제공하는 RAG(Retrieval-Augmented Generation) 기반 검색 웹앱입니다.

- "26살 무직인데 받을 수 있는 지원금" -- 나이 + 직업 조건 검색
- "서울 1인가구 주거 지원" -- 지역 + 키워드 검색
- "임산부 혜택 알려줘" -- 특정 대상 검색
- "장애인 고용 의무 법령" -- 법령 조문 검색
- "청년 주거 지원 법" -- 법령 키워드 검색

**복지 검색**은 벡터 검색 + 키워드 검색(RRF) + 구조화 필터(JA 코드)를 결합하여 10,919개 정부 서비스에서 맞춤 결과를 제공합니다.
**법령 검색**은 legalize-kr의 31,066개 법령 조문에서 하이브리드 검색(벡터 + 키워드 RRF)으로 관련 법조문을 찾아줍니다.

**공식 API와 공개 데이터만 사용합니다.** 민간 플랫폼 크롤링은 의도적으로 피했습니다.

---

## 기술 스택

| 영역 | 기술 | 선택 이유 |
| --- | --- | --- |
| 프레임워크 | Next.js 16 (App Router) | RSC + API Route로 프론트/백엔드 통합 |
| UI | Mantine v9 | 시맨틱 컴포넌트 + 다크모드 + 반응형 |
| 벡터 DB | Supabase (pgvector + HNSW) | 별도 벡터 DB 인프라 없이 RDB + 벡터 검색 통합 |
| 임베딩 | OpenAI text-embedding-3-small (1536차원) | 비용 효율 + 한국어 성능 |
| 조건 추출 | 코드 기반 키워드 파싱 | LLM 호출 없이 로컬 정규식 파싱 |
| LLM 요약 | GPT-4o-mini (SSE 스트리밍) | 검색 결과를 쉬운 말로 요약 |
| 가상화 | @tanstack/react-virtual | 메시지 목록 가상 스크롤, DOM 없이 높이 사전 계산 |
| CLI | Commander + tsx | 백엔드 로직을 터미널에서 직접 검증 |
| 테스트 | Vitest | 유닛 테스트 47개 |
| 배포 | Vercel + Supabase Cloud | 프론트엔드/DB 각각 관리형 서비스 |

---

## 데이터

| 소스 | 건수 | 수집 방법 |
| --- | --- | --- |
| 복지 서비스 (목록 + 상세 + 지원조건) | 10,919건 | 행정안전부 보조금24 OpenAPI |
| 법령 조문 | 31,066건 | legalize-kr 마크다운 파싱 (687개 법령) |

복지 서비스의 **지원대상, 지원내용, 서비스목적** 텍스트를 임베딩하여 의미 기반 검색을 지원합니다.
법령 조문은 **법령명, 조문 제목, 조문 내용**을 임베딩하여 법률 용어 검색을 지원합니다.

---

## 디렉토리 구조

```
src/
├── core/                # 백엔드 로직 (React/Next 무관, 순수 TypeScript)
│   ├── benefit/         #   복지 검색 + 조건 추출 + LLM 요약
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
    ├── use-sse-stream.ts #  SSE 스트림 파싱 유틸
    └── use-typewriter.ts #  어절 단위 타이프라이터 훅
```

**핵심 설계 원칙: `src/core/`에 비즈니스 로직 격리**

- `core/`는 React/Next.js에 의존하지 않는 순수 TypeScript
- CLI와 API Route가 같은 함수를 공유
- 검색/데이터 파이프라인은 **CLI에서 먼저 검증**할 수 있도록 구성

---

## 검색 파이프라인

### 복지 검색: 조건 추출 + 하이브리드 검색 + 4단계 필터

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
  |
  +---> 4단계 후처리 필터
  |     1. JA 코드 필터: 나이/성별/직업 구조화 조건 매칭
  |     2. 연령 텍스트 필터: "노인"/"아동" 등 연령 부적합 서비스 제외
  |     3. 컨텍스트 필터: 미언급 특수 대상(임산부/장애인/보훈) 제외
  |     4. 서비스명 부스트: 쿼리 키워드 ↔ 서비스명 매칭 시 유사도 가산
  |
  v
LLM 요약 스트리밍 (gpt-4o-mini) -> 결과 카드 순차 표시
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

### 하이브리드 검색 상세

벡터 검색만으로는 "서울 청년"같은 구조적 조건 매칭이 약하고, 키워드 검색만으로는 "취업이 어려운 사람을 위한 지원"같은 서술형 검색이 불가능합니다. 두 결과를 **RRF(Reciprocal Rank Fusion)** 로 합산합니다:

```sql
-- RRF: 벡터 순위 + 키워드 순위 기반 점수 합산
coalesce(1.0 / (rrf_k + rank_v), 0) + coalesce(1.0 / (rrf_k + rank_k), 0) as rrf_score

-- 최종 유사도: 코사인 유사도 70% + RRF 정규화 30%
greatest(cosine_sim, 0) * 0.7 + (rrf_score * 30) * 0.3 as similarity
```

---

## 자체 텍스트 측정 모듈

> Canvas 기반 워드프로세서 개발 경험([블로그 글](https://velog.io/@semimi/%EC%95%8C%EA%B3%A0%EB%A6%AC%EC%A6%98-%EA%B3%BC%EC%97%B0-%EC%82%AC%EC%9A%A9%ED%95%A0-%EC%9D%BC%EC%9D%B4-%EC%97%86%EC%9D%84%EA%B9%8C%EC%9A%94))에서 구현한 O(log n) 줄바꿈 최적화를 RAG 챗봇 도메인에 적용했습니다.

### 문제

채팅 메시지의 높이를 알아야 가상 스크롤(virtualization)이 동작합니다. DOM에 렌더링한 뒤 높이를 측정하면 reflow 비용이 발생하고, 화면 밖 메시지의 높이를 모르면 스크롤 위치 계산이 불가능합니다.

### 해결: DOM 렌더 전 텍스트 높이를 추정

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

3. **복합 높이 추정**: 마크다운 텍스트 높이 + 도메인별 추가 높이(`extraHeight`)를 합산. 각 도메인(복지 카드, 법령 아코디언)이 자체 높이를 계산하여 공유 모듈에 도메인 필드가 침투하지 않음

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

---

## 접근성

- **시맨틱 구조**: `role="main"`, `role="search"`, `role="log"`, `role="article"`
- **ARIA 속성**: `aria-live="polite"`, `aria-busy`, `aria-label`
- **Skip Link**: "검색 입력으로 건너뛰기"
- **로딩 상태**: `role="status"` + `aria-label="검색 중"`
- **외부 링크**: `rel="noopener noreferrer"` + `aria-label`
- **키 관리**: 리스트 key에 안정적인 도메인 id 사용 (index 사용 금지)
- **다크모드**: Mantine 시맨틱 컬러 (하드코딩 없음)

---

## 테스트

```bash
pnpm test
```

| 모듈 | 테스트 항목 | 건수 |
| --- | --- | --- |
| search/extract | 나이/성별/직업/지역 추출, 키워드 분류, 대화 누적, 검색/질문 판단 | 29 |
| text-layout/cache | LRU 동작, 용량 초과, set/get/clear | 6 |
| text-layout/prepared | 이진탐색 줄바꿈, 마크다운 파싱, 복합 높이 추정 | 12 |
| **전체** | | **47** |

---

## 로컬 실행

```bash
# 의존성 설치
pnpm install

# 환경변수 설정
cp .env.example .env.local
# SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, GOV24_API_KEY

# 개발 서버
pnpm run dev

# CLI 검색
pnpm run cli search "26살 무직 지원금"
pnpm run cli legal-search "청년 주거 지원 법령"
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
