-- Migration: Add pip_start_date to employee_master_pro
-- Supports PIP (Performance Improvement Plan) and Resigned employee statuses
--
-- Run inside postgres container:
--   docker exec -i <container_name> psql -U postgres -d <db_name> < database/migrate_pip_resign_status.sql

ALTER TABLE public.employee_master_pro
    ADD COLUMN IF NOT EXISTS pip_start_date DATE DEFAULT NULL;

ALTER TABLE public.employee_master_pro
    ADD COLUMN IF NOT EXISTS notice_start_date DATE DEFAULT NULL;

ALTER TABLE public.employee_master_pro
    ADD COLUMN IF NOT EXISTS notice_end_date DATE DEFAULT NULL;

COMMENT ON COLUMN public.employee_master_pro.pip_start_date
    IS 'Set when employee_status = ''PIP''. Records when the PIP was initiated.';

COMMENT ON COLUMN public.employee_master_pro.notice_start_date
    IS 'Set when employee_status = ''Notice period''. Records when the notice period started.';

COMMENT ON COLUMN public.employee_master_pro.notice_end_date
    IS 'Set when employee_status = ''Notice period''. When this date passes, employee is auto-transitioned to Resigned.';

COMMENT ON COLUMN public.employee_master.date_of_resign
    IS 'When set, employee is treated as Resigned. Populated automatically when notice_end_date passes.';
