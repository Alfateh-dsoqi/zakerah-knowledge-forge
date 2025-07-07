-- Add title column back to knowledge_entries for generated titles
ALTER TABLE public.knowledge_entries
ADD COLUMN title text;
