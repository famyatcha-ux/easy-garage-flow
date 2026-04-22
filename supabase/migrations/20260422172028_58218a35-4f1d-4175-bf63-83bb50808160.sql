
-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_name TEXT NOT NULL,
  contact_person TEXT,
  phone_number TEXT,
  email TEXT,
  account_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on suppliers" ON public.suppliers
  FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create supplier_transactions table
CREATE TABLE public.supplier_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL DEFAULT 'Purchase',
  amount NUMERIC NOT NULL DEFAULT 0,
  reference TEXT,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on supplier_transactions" ON public.supplier_transactions
  FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_supplier_transactions_updated_at
  BEFORE UPDATE ON public.supplier_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
