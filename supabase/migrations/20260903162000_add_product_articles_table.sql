-- Create product_articles table
CREATE TABLE IF NOT EXISTS public.product_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    colours JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.product_articles ENABLE ROW LEVEL SECURITY;

-- Policies for product_articles
CREATE POLICY "Enable read access for all authenticated users" ON public.product_articles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON public.product_articles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON public.product_articles
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON public.product_articles
    FOR DELETE USING (auth.role() = 'authenticated');

-- Function to automatically set updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set updated_at
CREATE TRIGGER set_product_articles_updated_at
    BEFORE UPDATE ON public.product_articles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Index on product_id for fast cascading and lookups
CREATE INDEX IF NOT EXISTS product_articles_product_id_idx ON public.product_articles(product_id);
