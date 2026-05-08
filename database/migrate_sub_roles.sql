-- ============================================================
-- Sub-Role Migration: sub_roles table + users.sub_role_id
-- Run once after migrate_rbac.sql.
-- Safe: uses IF NOT EXISTS / idempotent guards.
-- ============================================================

-- 1. Create sub_roles table
CREATE TABLE IF NOT EXISTS public.sub_roles (
    sub_role_id        SERIAL PRIMARY KEY,
    name               VARCHAR(100) NOT NULL UNIQUE,
    label              VARCHAR(150) NOT NULL,
    description        TEXT,
    base_role          VARCHAR(50) NOT NULL REFERENCES public.roles(role_name) ON DELETE RESTRICT,
    page_access        TEXT[] NOT NULL DEFAULT '{}',
    field_restrictions JSONB  NOT NULL DEFAULT '{}',
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add sub_role_id column to users (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'sub_role_id'
    ) THEN
        ALTER TABLE public.users
            ADD COLUMN sub_role_id INTEGER
                REFERENCES public.sub_roles(sub_role_id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Keep updated_at current on updates
CREATE OR REPLACE FUNCTION public.fn_sub_roles_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sub_roles_updated_at ON public.sub_roles;
CREATE TRIGGER trg_sub_roles_updated_at
    BEFORE UPDATE ON public.sub_roles
    FOR EACH ROW EXECUTE FUNCTION public.fn_sub_roles_updated_at();
