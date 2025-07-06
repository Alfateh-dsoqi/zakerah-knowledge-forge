-- Fix function search path security warnings
-- Update handle_new_user function to have immutable search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

-- Update update_updated_at_column function to have immutable search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update match_knowledge_embeddings function to have immutable search_path
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
  title text,
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
    ke.title,
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