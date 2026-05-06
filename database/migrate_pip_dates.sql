-- Migration: Add PIP and Notice period columns to employee_master_pro
-- Fixes "column does not exist" errors and adds pip_end_date functionality

ALTER TABLE public.employee_master_pro
    ADD COLUMN IF NOT EXISTS pip_start_date DATE DEFAULT NULL;

ALTER TABLE public.employee_master_pro
    ADD COLUMN IF NOT EXISTS pip_end_date DATE DEFAULT NULL;

ALTER TABLE public.employee_master_pro
    ADD COLUMN IF NOT EXISTS notice_start_date DATE DEFAULT NULL;

ALTER TABLE public.employee_master_pro
    ADD COLUMN IF NOT EXISTS notice_end_date DATE DEFAULT NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.employee_master_pro.pip_start_date IS 'Start date of Performance Improvement Plan';
COMMENT ON COLUMN public.employee_master_pro.pip_end_date IS 'Expected end date of Performance Improvement Plan';
COMMENT ON COLUMN public.employee_master_pro.notice_start_date IS 'Start date of employee notice period';
COMMENT ON COLUMN public.employee_master_pro.notice_end_date IS 'End date of employee notice period';
