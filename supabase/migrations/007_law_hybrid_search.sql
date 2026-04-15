-- 법령 하이브리드 검색: tsvector + 벡터 검색 RRF 합산

-- 한국어 full-text search용 tsvector 컬럼
alter table law_articles add column if not exists search_tsv tsvector;

-- tsvector 생성: 법령명(가중치 A) + 조문제목(가중치 A) + 조문내용(가중치 B)
update law_articles set search_tsv =
  setweight(to_tsvector('simple', coalesce(law_title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(article_title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(article_content, '')), 'B');

-- GIN 인덱스
create index if not exists law_articles_search_tsv_idx on law_articles using gin(search_tsv);

-- tsvector 자동 갱신 트리거
create or replace function law_articles_search_tsv_trigger() returns trigger as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('simple', coalesce(new.law_title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.article_title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.article_content, '')), 'B');
  return new;
end;
$$ language plpgsql;

drop trigger if exists law_articles_search_tsv_update on law_articles;
create trigger law_articles_search_tsv_update
  before insert or update on law_articles
  for each row execute function law_articles_search_tsv_trigger();

-- 하이브리드 검색 RPC: 벡터 + 키워드 + RRF 합산
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
  ts_query := plainto_tsquery('simple', query_text);

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
    where la.search_tsv @@ ts_query
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
