-- 법령 조문 벡터 검색 RPC
create or replace function match_law_articles(
  query_embedding vector(1536),
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
begin
  return query
  select
    la.id,
    la.law_title,
    la.law_type,
    la.chapter,
    la.article_number,
    la.article_title,
    la.article_content,
    la.source_url,
    1 - (la.embedding <=> query_embedding) as similarity
  from law_articles la
  where 1 - (la.embedding <=> query_embedding) > match_threshold
  order by la.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 법령명으로 조문 검색 (복지 서비스 → 법령 연결용)
create or replace function get_law_articles_by_title(
  target_law_title text
)
returns table (
  id bigint,
  law_title text,
  law_type text,
  chapter text,
  article_number text,
  article_title text,
  article_content text,
  source_url text
)
language plpgsql
as $$
begin
  return query
  select
    la.id,
    la.law_title,
    la.law_type,
    la.chapter,
    la.article_number,
    la.article_title,
    la.article_content,
    la.source_url
  from law_articles la
  where la.law_title = target_law_title
  order by la.article_number;
end;
$$;
