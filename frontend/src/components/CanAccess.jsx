import { usePermissions } from '../hooks/usePermissions';

export function CanAccess({ action, resource, minRole, fallback = null, children }) {
    const { can, isAtLeast } = usePermissions();
    const hasAccess = minRole ? isAtLeast(minRole) : can(action, resource);
    return hasAccess ? children : fallback;
}
