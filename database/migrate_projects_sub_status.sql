-- Migration: Add sub_status column to projects table
-- Run inside the postgres container:
--   docker exec -i project-postgres-local psql -U postgres -d migration_db < database/migrate_projects_sub_status.sql

ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS sub_status character varying(50) DEFAULT NULL;

COMMENT ON COLUMN public.projects.sub_status IS 'Optional sub-status for In Progress projects (e.g. SOW_SIGNED, SOW_NOT_SIGNED)';
