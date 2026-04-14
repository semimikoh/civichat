-- pgvector 확장 활성화
create extension if not exists vector;

-- 복지 서비스 테이블
create table if not exists benefits (
  id bigserial primary key,
  service_id text unique not null,
  service_name text not null,
  service_purpose text,
  support_type text,
  target_audience text,
  selection_criteria text,
  support_content text,
  application_method text,
  application_deadline text,
  required_documents text,
  contact_agency text,
  contact_phone text,
  online_application_url text,
  managing_agency text,
  managing_agency_type text,
  service_category text,
  law text,
  administrative_rule text,
  local_regulation text,
  detail_url text,
  embedding_text text,
  embedding vector(1536),
  updated_at text,
  created_at timestamptz default now()
);

-- 지원조건 테이블
create table if not exists benefit_conditions (
  id bigserial primary key,
  service_id text unique not null references benefits(service_id),
  service_name text,
  gender text[],
  age_start integer,
  age_end integer,
  income_level text[],
  family_status text[],
  occupation text[],
  social_status text[],
  business_status text[],
  vulnerability text[],
  created_at timestamptz default now()
);

-- 벡터 검색용 HNSW 인덱스
create index if not exists benefits_embedding_idx
  on benefits
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- 서비스ID 검색용 인덱스
create index if not exists benefits_service_id_idx on benefits(service_id);
create index if not exists benefit_conditions_service_id_idx on benefit_conditions(service_id);
