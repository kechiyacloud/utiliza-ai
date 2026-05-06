import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../api/axios';
import { usePermissions } from '../hooks/usePermissions';
import { ShieldCheck, UserX, RefreshCcw, Loader2, ChevronDown } from 'lucide-react';

const ROLE_LABELS = {
    master_admin: 'Master Admin',
    editor: 'Editor',
    viewer: 'Viewer',
    restricted_viewer: 'Restricted Viewer',
};

const ROLE_COLORS = {
    master_admin: 'bg-purple-100 text-purple-800',
    editor: 'bg-blue-100 text-blue-800',
    viewer: 'bg-green-100 text-green-800',
    restricted_viewer: 'bg-gray-100 text-gray-600',
};

export default function UserManagement() {
    const { isAtLeast } = usePermissions();
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updating, setUpdating] = useState({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [usersRes, rolesRes] = await Promise.all([
                api.get('/users'),
                api.get('/users/roles'),
            ]);
            setUsers(usersRes.data);
            setRoles(rolesRes.data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (!isAtLeast('master_admin')) return <Navigate to="/info/dashboard" replace />;

    const handleRoleChange = async (userId, roleName) => {
        setUpdating(prev => ({ ...prev, [userId]: 'role' }));
        try {
            await api.put(`/users/${userId}/role`, { role_name: roleName });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role_name: roleName } : u));
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to update role');
        } finally {
            setUpdating(prev => ({ ...prev, [userId]: null }));
        }
    };

    const handleDeactivate = async (userId, email) => {
        if (!window.confirm(`Deactivate user "${email}"? They will no longer be able to log in.`)) return;
        setUpdating(prev => ({ ...prev, [userId]: 'deactivate' }));
        try {
            await api.delete(`/users/${userId}`);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: false } : u));
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to deactivate user');
        } finally {
            setUpdating(prev => ({ ...prev, [userId]: null }));
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center text-red-600 font-medium">{error}</div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-xl">
                        <ShieldCheck size={20} className="text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">User Management</h1>
                        <p className="text-xs text-gray-500">{users.length} accounts</p>
                    </div>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                    <RefreshCcw size={14} />
                    Refresh
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/50">
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Email</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Last Login</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {users.map(user => (
                            <tr key={user.id} className={`hover:bg-gray-50/50 transition-colors ${!user.is_active ? 'opacity-50' : ''}`}>
                                <td className="px-4 py-3 font-medium text-gray-800 truncate max-w-[220px]">
                                    {user.email}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="relative inline-block">
                                        <select
                                            value={user.role_name || ''}
                                            onChange={e => handleRoleChange(user.id, e.target.value)}
                                            disabled={!user.is_active || updating[user.id] === 'role'}
                                            className={`appearance-none pl-2 pr-7 py-1 rounded-lg text-xs font-semibold cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed ${ROLE_COLORS[user.role_name] || 'bg-gray-100 text-gray-600'}`}
                                        >
                                            {roles.map(r => (
                                                <option key={r.role_name} value={r.role_name}>{r.role_label}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                        {user.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-gray-400 text-xs">
                                    {user.last_login_at
                                        ? new Date(user.last_login_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                        : '—'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {user.is_active && (
                                        <button
                                            onClick={() => handleDeactivate(user.id, user.email)}
                                            disabled={updating[user.id] === 'deactivate'}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {updating[user.id] === 'deactivate'
                                                ? <Loader2 size={12} className="animate-spin" />
                                                : <UserX size={12} />}
                                            Deactivate
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
