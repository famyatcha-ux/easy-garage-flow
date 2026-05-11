ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_ref TEXT;

CREATE TABLE IF NOT EXISTS public.ref_counters (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ref_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on ref_counters" ON public.ref_counters FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.ref_counters (name, value) VALUES ('booking', 0)
ON CONFLICT (name) DO NOTHING;