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

const BASE_FIELD_RESTRICTIONS = {
    restricted_viewer: {
        employees: ['phone', 'phone_number', 'date_of_birth', 'address'],
        project_detail: ['budget', 'billing_type', 'revenue_model', 'contract_type', 'commercial_notes'],
    },
    viewer: {
        project_detail: ['budget', 'billing_type', 'revenue_model', 'contract_type', 'commercial_notes'],
    },
};

export function usePermissions() {
    const { role, subRoleConfig } = useAuth();
    const effectiveRole = role ?? 'restricted_viewer';

    function can(action, resource) {
        const perms = ROLE_PERMISSIONS[effectiveRole];
        return perms?.[resource]?.includes(action) ?? false;
    }

    function isAtLeast(minRole) {
        return (ROLE_HIERARCHY[effectiveRole] ?? -1) >= (ROLE_HIERARCHY[minRole] ?? 999);
    }

    function canAccessPage(page) {
        // page_access is a BLACKLIST — pages listed here are RESTRICTED.
        // If the array is empty, no pages are restricted → allow all.
        const restricted = subRoleConfig?.page_access ?? [];
        if (restricted.length === 0) return true;
        return !restricted.includes(page);  // blocked if found in the restricted list
    }

    function isFieldHidden(resource, field) {
        const base = BASE_FIELD_RESTRICTIONS[effectiveRole]?.[resource] ?? [];
        if (base.includes(field)) return true;
        const sub = subRoleConfig?.field_restrictions?.[resource] ?? [];
        return sub.includes(field);
    }

    return { role: effectiveRole, can, isAtLeast, canAccessPage, isFieldHidden };
}
