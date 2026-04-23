
ALTER TABLE public.suppliers
  ADD COLUMN bank_name text,
  ADD COLUMN account_holder_name text,
  ADD COLUMN branch_code text,
  ADD COLUMN account_type text DEFAULT 'Cheque',
  ADD COLUMN payment_terms text,
  ADD COLUMN credit_limit numeric;
