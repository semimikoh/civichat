-- 하이브리드 검색: tsvector + 벡터 검색 RRF 합산

-- 한국어 full-text search용 tsvector 컬럼
alter table benefits add column if not exists search_tsv tsvector;

-- tsvector 생성: 서비스명(가중치 A) + 지원대상 + 지원내용 + 서비스목적(가중치 B)
update benefits set search_tsv =
  setweight(to_tsvector('simple', coalesce(service_name, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(target_audience, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(support_content, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(service_purpose, '')), 'B');

-- GIN 인덱스
create index if not exists benefits_search_tsv_idx on benefits using gin(search_tsv);

-- tsvector 자동 갱신 트리거
create or replace function benefits_search_tsv_trigger() returns trigger as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('simple', coalesce(new.service_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.target_audience, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.support_content, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.service_purpose, '')), 'B');
  return new;
end;
$$ language plpgsql;

drop trigger if exists benefits_search_tsv_update on benefits;
create trigger benefits_search_tsv_update
  before insert or update on benefits
  for each row execute function benefits_search_tsv_trigger();

-- 하이브리드 검색 RPC: 벡터 + 키워드 + RRF 합산
create or replace function match_benefits_hybrid(
  query_embedding vector(1536),
  query_text text,
  region_filter text default null,
  province_filter text default null,
  match_threshold float default 0.3,
  match_count int default 50
)
returns table (
  id bigint,
  service_id text,
  service_name text,
  service_purpose text,
  support_type text,
  target_audience text,
  selection_criteria text,
  support_content text,
  application_method text,
  application_deadline text,
  contact_agency text,
  contact_phone text,
  online_application_url text,
  detail_url text,
  managing_agency text,
  law text,
  similarity float
)
language plpgsql
as $$
declare
  rrf_k constant int := 60;
  ts_query tsquery;
begin
  -- 공백을 | (OR)로 연결하여 tsquery 생성
  ts_query := plainto_tsquery('simple', query_text);

  return query
  with vector_results as (
    select
      b.service_id as sid,
      row_number() over (order by b.embedding <=> query_embedding) as rank_v,
      1 - (b.embedding <=> query_embedding) as cosine_sim
    from benefits b
    where
      1 - (b.embedding <=> query_embedding) > match_threshold
      and (
        region_filter is null
        or b.managing_agency ilike '%' || region_filter || '%'
        or (province_filter is not null and b.managing_agency = province_filter)
      )
    order by b.embedding <=> query_embedding
    limit match_count
  ),
  keyword_results as (
    select
      b.service_id as sid,
      row_number() over (order by ts_rank_cd(b.search_tsv, ts_query) desc) as rank_k,
      ts_rank_cd(b.search_tsv, ts_query) as ts_score
    from benefits b
    where
      b.search_tsv @@ ts_query
      and (
        region_filter is null
        or b.managing_agency ilike '%' || region_filter || '%'
        or (province_filter is not null and b.managing_agency = province_filter)
      )
    order by ts_rank_cd(b.search_tsv, ts_query) desc
    limit match_count
  ),
  combined as (
    select
      coalesce(v.sid, k.sid) as sid,
      coalesce(v.cosine_sim, 0) as cosine_sim,
      -- RRF 점수: 벡터 순위 + 키워드 순위 기반
      coalesce(1.0 / (rrf_k + v.rank_v), 0) + coalesce(1.0 / (rrf_k + k.rank_k), 0) as rrf_score
    from vector_results v
    full outer join keyword_results k on v.sid = k.sid
  )
  select
    b.id,
    b.service_id,
    b.service_name,
    b.service_purpose,
    b.support_type,
    b.target_audience,
    b.selection_criteria,
    b.support_content,
    b.application_method,
    b.application_deadline,
    b.contact_agency,
    b.contact_phone,
    b.online_application_url,
    b.detail_url,
    b.managing_agency,
    b.law,
    -- 최종 similarity: RRF 기반 스코어를 0~1 스케일로 정규화
    greatest(c.cosine_sim, 0) * 0.7 + (c.rrf_score * 30) * 0.3 as similarity
  from combined c
  join benefits b on b.service_id = c.sid
  order by c.rrf_score desc
  limit match_count;
end;
$$;
