ALTER TABLE public.knowledge_entries DROP COLUMN title;

CREATE OR REPLACE FUNCTION public.match_knowledge_embeddings(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  user_id uuid
)
RETURNS TABLE (
  id uuid,
  content_chunk text,
  similarity float,
  entry_id uuid,
  scope_name text
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.content_chunk,
    (e.embedding <#> query_embedding) * -1 as similarity,
    e.entry_id,
    ks.name as scope_name
  FROM embeddings e
  JOIN knowledge_entries ke ON e.entry_id = ke.id
  JOIN knowledge_scopes ks ON ke.scope_id = ks.id
  WHERE 
    e.user_id = match_knowledge_embeddings.user_id
    AND (e.embedding <#> query_embedding) * -1 > match_threshold
  ORDER BY e.embedding <#> query_embedding
  LIMIT match_count;
END;
$$;