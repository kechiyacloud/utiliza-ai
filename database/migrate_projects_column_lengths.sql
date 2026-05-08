BEGIN;

ALTER TABLE public.projects
    ALTER COLUMN project_name TYPE character varying(100),
    ALTER COLUMN project_type TYPE character varying(50),
    ALTER COLUMN billable TYPE character varying(50);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'projects'
          AND column_name = 'project_status'
    ) THEN
        ALTER TABLE public.projects
            ALTER COLUMN project_status TYPE character varying(50);
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'projects'
          AND column_name = 'status'
    ) THEN
        ALTER TABLE public.projects
            ALTER COLUMN status TYPE character varying(50);
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'projects'
          AND column_name = 'department'
    ) THEN
        ALTER TABLE public.projects
            ALTER COLUMN department TYPE character varying(100);
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'projects'
          AND column_name = 'department_id'
    ) THEN
        ALTER TABLE public.projects
            ALTER COLUMN department_id TYPE character varying(100);
    END IF;
END $$;

COMMIT;
