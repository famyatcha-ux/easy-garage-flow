ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS invoice_ref TEXT;
INSERT INTO public.ref_counters (name, value) VALUES ('job', 0)
ON CONFLICT (name) DO NOTHING;