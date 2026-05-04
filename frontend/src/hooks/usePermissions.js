import { useAuth } from '../context/AuthContext';

const ROLE_HIERARCHY = {
    restricted_viewer: 0,
    viewer: 1,
    editor: 2,
    master_admin: 3,
};

const ROLE_PERMISSIONS = {
    master_admin: {
        employee: ['read', 'write', 'delete'],
        employee_pii: ['read'],
        project: ['read', 'write', 'delete'],
        project_commercials: ['read', 'write'],
        allocation: ['read', 'write'],
        client: ['read', 'write', 'delete'],
        dashboard: ['read'],
        settings_admin: ['read', 'write'],
        users: ['read', 'write'],
    },
    editor: {
        employee: ['read', 'write', 'delete'],
        employee_pii: ['read'],
        project: ['read', 'write', 'delete'],
        project_commercials: ['read'],
        allocation: ['read', 'write'],
        client: ['read', 'write', 'delete'],
        dashboard: ['read'],
    },
    viewer: {
        employee: ['read'],
        employee_pii: ['read'],
        project: ['read'],
        project_commercials: ['read'],
        allocation: ['read'],
        client: ['read'],
        dashboard: ['read'],
    },
    restricted_viewer: {
        employee: ['read'],
        project: ['read'],
        allocation: ['read'],
        client: ['read'],
        dashboard: ['read'],
    },
};

export function usePermissions() {
    const { role } = useAuth();
    const effectiveRole = role ?? 'restricted_viewer';

    function can(action, resource) {
        const perms = ROLE_PERMISSIONS[effectiveRole];
        return perms?.[resource]?.includes(action) ?? false;
    }

    function isAtLeast(minRole) {
        return (ROLE_HIERARCHY[effectiveRole] ?? -1) >= (ROLE_HIERARCHY[minRole] ?? 999);
    }

    return { role: effectiveRole, can, isAtLeast };
}
