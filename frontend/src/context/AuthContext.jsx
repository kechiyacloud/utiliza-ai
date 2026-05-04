import { createContext, useContext, useMemo, useState, useEffect } from 'react';

const AuthContext = createContext({ role: null, userEmail: null });

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

    useEffect(() => {
        const onAuthChange = () => setToken(localStorage.getItem('token'));
        window.addEventListener('auth-token-changed', onAuthChange);
        window.addEventListener('storage', onAuthChange);
        return () => {
            window.removeEventListener('auth-token-changed', onAuthChange);
            window.removeEventListener('storage', onAuthChange);
        };
    }, []);

    const payload = token ? decodeJwt(token) : null;

    const value = useMemo(() => ({
        role: payload?.role ?? null,
        userEmail: payload?.email ?? localStorage.getItem('userEmail') ?? null,
    }), [payload?.role, payload?.email]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}
