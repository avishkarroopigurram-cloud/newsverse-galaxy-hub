
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS is_original boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS articles_is_original_idx ON public.articles (is_original, published_at DESC) WHERE is_original = true;
