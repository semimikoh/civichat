-- 법령 조문 테이블
create table if not exists law_articles (
  id bigserial primary key,
  law_title text not null,
  law_type text not null,
  chapter text,
  article_number text not null,
  article_title text not null,
  article_content text not null,
  embedding_text text not null,
  source_url text,
  embedding vector(1536),
  created_at timestamptz default now(),
  -- 같은 법령의 같은 조문은 중복 방지
  unique (law_title, law_type, article_number)
);

-- 벡터 검색용 HNSW 인덱스
create index if not exists law_articles_embedding_idx
  on law_articles
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- 법령명 검색용 인덱스
create index if not exists law_articles_law_title_idx on law_articles(law_title);

-- 법령명 + 조문번호 검색용 인덱스
create index if not exists law_articles_title_article_idx on law_articles(law_title, article_number);
