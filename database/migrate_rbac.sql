-- ============================================================
-- RBAC Migration: roles, permissions, role_permissions
-- Run once against the target database.
-- Safe: uses IF NOT EXISTS / ON CONFLICT where possible.
-- ============================================================

-- 1. Roles table
CREATE TABLE IF NOT EXISTS public.roles (
    role_id    SERIAL PRIMARY KEY,
    role_name  VARCHAR(50)  NOT NULL UNIQUE,
    role_label VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
    permission_id SERIAL PRIMARY KEY,
    resource_name VARCHAR(100) NOT NULL,
    action        VARCHAR(50)  NOT NULL,
    description   TEXT,
    UNIQUE(resource_name, action)
);

-- 3. Role-Permission mapping
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id       INTEGER NOT NULL REFERENCES public.roles(role_id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES public.permissions(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 4. Add role_id to users (if not already present)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role_id'
    ) THEN
        ALTER TABLE public.users ADD COLUMN role_id INTEGER REFERENCES public.roles(role_id);
    END IF;
END $$;

-- 5. Seed roles (idempotent)
INSERT INTO public.roles (role_name, role_label, description) VALUES
  ('master_admin',      'Master Admin',      'Full access including user management, bulk ops, and financial data'),
  ('editor',            'Editor',            'CRUD on employees/projects/allocations/clients; cannot edit financials or manage users'),
  ('viewer',            'Viewer',            'Read-only access to all data including project financials'),
  ('restricted_viewer', 'Restricted Viewer', 'Read-only; employee PII and project financials are hidden')
ON CONFLICT (role_name) DO NOTHING;

-- 6. Seed permissions (idempotent)
INSERT INTO public.permissions (resource_name, action, description) VALUES
  -- employees
  ('employees',           'read',   'List and view employee profiles'),
  ('employees',           'write',  'Create and update employees'),
  ('employees',           'delete', 'Delete employees'),
  -- employee PII (phone, dob, address)
  ('employee_pii',        'read',   'View sensitive personal fields: phone, date_of_birth, address'),
  -- projects
  ('projects',            'read',   'List and view project details'),
  ('projects',            'write',  'Create and update projects'),
  ('projects',            'delete', 'Delete projects'),
  -- project financials
  ('project_commercials', 'read',   'View financial project data (budget, billing, revenue model)'),
  ('project_commercials', 'write',  'Edit financial project data'),
  -- allocations
  ('allocations',         'read',   'View resource allocations'),
  ('allocations',         'write',  'Create and update allocations'),
  ('allocations',         'delete', 'Delete allocations'),
  -- clients
  ('clients',             'read',   'View clients and partners'),
  ('clients',             'write',  'Create and update clients'),
  -- dashboard
  ('dashboard',           'read',   'Access dashboard metrics and analytics'),
  -- settings admin tab (bulk ops, sync, import/export)
  ('settings_admin',      'read',   'View admin settings tab'),
  ('settings_admin',      'write',  'Perform bulk admin operations (sync, import, export)'),
  -- user management
  ('users',               'read',   'View user accounts and their roles'),
  ('users',               'write',  'Create/deactivate users and assign roles')
ON CONFLICT (resource_name, action) DO NOTHING;

-- 7. Wire role_permissions (clear first for idempotency, then re-insert)
DELETE FROM public.role_permissions
WHERE role_id IN (SELECT role_id FROM public.roles);

-- master_admin: everything
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM public.roles r, public.permissions p
WHERE r.role_name = 'master_admin';

-- viewer: all reads except settings_admin and users
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM public.roles r, public.permissions p
WHERE r.role_name = 'viewer'
  AND p.action = 'read'
  AND p.resource_name NOT IN ('settings_admin', 'users');

-- editor: viewer reads + writes on employees/projects/allocations/clients (NOT project_commercials write, NOT admin)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM public.roles r, public.permissions p
WHERE r.role_name = 'editor'
  AND (
    (p.action = 'read'   AND p.resource_name NOT IN ('settings_admin', 'users'))
    OR (p.action = 'write'  AND p.resource_name IN ('employees', 'projects', 'allocations', 'clients'))
    OR (p.action = 'delete' AND p.resource_name IN ('employees', 'projects', 'allocations', 'clients'))
  );

-- restricted_viewer: reads only — no PII, no financials, no admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM public.roles r, public.permissions p
WHERE r.role_name = 'restricted_viewer'
  AND p.action = 'read'
  AND p.resource_name NOT IN ('settings_admin', 'users', 'employee_pii', 'project_commercials');

-- 8. Default all existing users without a role to master_admin (safe rollout)
UPDATE public.users
SET role_id = (SELECT role_id FROM public.roles WHERE role_name = 'master_admin')
WHERE role_id IS NULL;

-- 9. Make role_id NOT NULL after backfilling
ALTER TABLE public.users ALTER COLUMN role_id SET NOT NULL;

-- Verification query (run manually after migration):
-- SELECT u.email, r.role_name FROM users u JOIN roles r ON u.role_id = r.role_id ORDER BY r.role_name;
