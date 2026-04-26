-- Invoice number sequence + column on jobs
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1000;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS invoice_number INTEGER UNIQUE DEFAULT nextval('public.invoice_number_seq');

-- Backfill existing rows that may have null invoice_number (defensive)
UPDATE public.jobs SET invoice_number = nextval('public.invoice_number_seq') WHERE invoice_number IS NULL;

-- Job line items table for "Work Performed"
CREATE TABLE IF NOT EXISTS public.job_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_line_items_job_id ON public.job_line_items(job_id);

ALTER TABLE public.job_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on job_line_items"
ON public.job_line_items
FOR ALL
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_job_line_items_updated_at
BEFORE UPDATE ON public.job_line_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();