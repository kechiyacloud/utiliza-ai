import { createContext, useContext, useMemo, useState, useEffect } from 'react';

const AuthContext = createContext({ role: null, userEmail: null, subRoleConfig: null });

function decodeJwt(token) {
    try {
        const base64Payload = token.split('.')[1];
        if (!base64Payload) return null;
        const padded = base64Payload.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(padded));
    } catch {
        return null;
    }
}

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const [subRoleConfig, setSubRoleConfig] = useState(null);

    useEffect(() => {
        const onAuthChange = () => setToken(localStorage.getItem('token'));
        window.addEventListener('auth-token-changed', onAuthChange);
        window.addEventListener('storage', onAuthChange);
        return () => {
            window.removeEventListener('auth-token-changed', onAuthChange);
            window.removeEventListener('storage', onAuthChange);
        };
    }, []);

    useEffect(() => {
        if (!token) { setSubRoleConfig(null); return; }
        const payload = decodeJwt(token);
        if (!payload || (payload.exp && Date.now() >= payload.exp * 1000)) {
            setSubRoleConfig(null); return;
        }
        let cancelled = false;
        fetch('/api/sub-roles/my-config', {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (!cancelled) setSubRoleConfig(data); })
        .catch(() => { if (!cancelled) setSubRoleConfig(null); });
        return () => { cancelled = true; };
    }, [token]);

    const payload = token ? decodeJwt(token) : null;

    const value = useMemo(() => ({
        role: payload?.role ?? null,
        userEmail: payload?.email ?? localStorage.getItem('userEmail') ?? null,
        subRoleConfig,
    }), [payload?.role, payload?.email, subRoleConfig]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}
