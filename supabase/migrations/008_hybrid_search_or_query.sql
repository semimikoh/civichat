-- 하이브리드 검색 보정 (반환 컬럼과 파라미터는 004/007과 동일)
-- 1) 키워드 검색: plainto_tsquery는 단어를 AND(&)로 묶는다. 확장 키워드가 여러 개 붙는 검색어로는
--    모든 단어를 동시에 가진 행이 거의 없어 키워드 쪽 결과가 비고, 사실상 벡터 단독 검색이 됐다.
--    → 단어를 OR(|)로 묶고, 'simple' 사전은 형태소 분석을 하지 않으므로 접두 매칭(:*)을 건다
--      ("청년"이 "청년에게"와 매칭되도록).
-- 2) 벡터 검색: HNSW는 ef_search(기본 40)개 후보를 뽑은 뒤 WHERE(지역 필터·임계값)를 적용한다.
--    그래서 지역 필터가 있으면 match_count를 크게 요청해도 후보가 수십 건으로 줄어든다.
--    → 요청 건수에 맞춰 ef_search를 트랜잭션 범위에서 올린다.
--    (pgvector 0.8+라면 hnsw.iterative_scan = relaxed_order로 대체할 수 있다)

create or replace function build_or_prefix_tsquery(query_text text)
returns tsquery
language sql
immutable
as $$
  -- quote_literal은 백슬래시가 있으면 E'...' 형태를 만들어 tsquery 문법이 깨지므로 직접 감싼다
  select string_agg('''' || replace(replace(lexeme, '\', ''), '''', '''''') || ''':*', ' | ')::tsquery
  from unnest(tsvector_to_array(to_tsvector('simple', coalesce(query_text, '')))) as lexeme;
$$;

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
  ts_query := build_or_prefix_tsquery(query_text);
  perform set_config('hnsw.ef_search', least(greatest(match_count * 4, 100), 1000)::text, true);

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
      ts_query is not null
      and b.search_tsv @@ ts_query
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
    greatest(c.cosine_sim, 0) * 0.7 + (c.rrf_score * 30) * 0.3 as similarity
  from combined c
  join benefits b on b.service_id = c.sid
  order by c.rrf_score desc
  limit match_count;
end;
$$;

create or replace function match_law_articles_hybrid(
  query_embedding vector(1536),
  query_text text,
  match_threshold float default 0.3,
  match_count int default 20
)
returns table (
  id bigint,
  law_title text,
  law_type text,
  chapter text,
  article_number text,
  article_title text,
  article_content text,
  source_url text,
  similarity float
)
language plpgsql
as $$
declare
  rrf_k constant int := 60;
  ts_query tsquery;
begin
  ts_query := build_or_prefix_tsquery(query_text);
  perform set_config('hnsw.ef_search', least(greatest(match_count * 4, 100), 1000)::text, true);

  return query
  with vector_results as (
    select
      la.id as rid,
      row_number() over (order by la.embedding <=> query_embedding) as rank_v,
      1 - (la.embedding <=> query_embedding) as cosine_sim
    from law_articles la
    where 1 - (la.embedding <=> query_embedding) > match_threshold
    order by la.embedding <=> query_embedding
    limit match_count
  ),
  keyword_results as (
    select
      la.id as rid,
      row_number() over (order by ts_rank_cd(la.search_tsv, ts_query) desc) as rank_k,
      ts_rank_cd(la.search_tsv, ts_query) as ts_score
    from law_articles la
    where ts_query is not null and la.search_tsv @@ ts_query
    order by ts_rank_cd(la.search_tsv, ts_query) desc
    limit match_count
  ),
  combined as (
    select
      coalesce(v.rid, k.rid) as rid,
      coalesce(v.cosine_sim, 0) as cosine_sim,
      coalesce(1.0 / (rrf_k + v.rank_v), 0) + coalesce(1.0 / (rrf_k + k.rank_k), 0) as rrf_score
    from vector_results v
    full outer join keyword_results k on v.rid = k.rid
  )
  select
    la.id,
    la.law_title,
    la.law_type,
    la.chapter,
    la.article_number,
    la.article_title,
    la.article_content,
    la.source_url,
    greatest(c.cosine_sim, 0) * 0.7 + (c.rrf_score * 30) * 0.3 as similarity
  from combined c
  join law_articles la on la.id = c.rid
  order by c.rrf_score desc
  limit match_count;
end;
$$;
