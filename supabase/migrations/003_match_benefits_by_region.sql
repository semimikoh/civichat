-- 지역 필터 + 벡터 유사도 검색 RPC 함수
create or replace function match_benefits_by_region(
  query_embedding vector(1536),
  region_filter text,
  province_filter text default null,
  match_threshold float default 0.3,
  match_count int default 10
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
begin
  return query
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
    1 - (b.embedding <=> query_embedding) as similarity
  from benefits b
  where
    1 - (b.embedding <=> query_embedding) > match_threshold
    and (
      b.managing_agency ilike '%' || region_filter || '%'
      or (province_filter is not null and b.managing_agency = province_filter)
    )
  order by b.embedding <=> query_embedding
  limit match_count;
end;
$$;
