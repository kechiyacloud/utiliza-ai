import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDataRefresh } from '../context';
import { CD_Blue } from '../Assets';
import {
    LayoutDashboard, Briefcase, Users, PieChart,
    CalendarClock, Building2, Settings, ChevronLeft,
    ChevronRight, LogOut, ShieldCheck, BarChart2,
    UserCircle, AlertTriangle
} from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { encodeId } from '../utils/idEncoder';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const profileMenuRef = useRef(null);
    const { isAtLeast, canAccessPage } = usePermissions();
    const { isDirty, setIsDirty } = useDataRefresh();
    const [showNavBlocker, setShowNavBlocker] = useState(false);
    const [pendingPath, setPendingPath] = useState(null);

    const userEmail = localStorage.getItem('userEmail') || '';
    const userName = (userEmail || '').split('@')[0] || 'User';
    const userInitials = (userName || 'U').substring(0, 2).toUpperCase();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setShowProfileMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const allMenuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: 'dashboard', minRole: 'restricted_viewer' },
        { icon: Briefcase, label: 'Projects', path: 'projects', minRole: 'restricted_viewer' },
        { icon: Users, label: 'Employees', path: 'employees/list', minRole: 'restricted_viewer' },
        { icon: PieChart, label: 'Allocations', path: 'allocation', minRole: 'restricted_viewer' },
        { icon: CalendarClock, label: 'Availability', path: 'availability', minRole: 'restricted_viewer' },
        { icon: Building2, label: 'Clients', path: 'client', minRole: 'restricted_viewer' },
        { icon: BarChart2, label: 'Reports', path: 'reports', minRole: 'viewer' },
    ];

    const menuItems = allMenuItems.filter(item => isAtLeast(item.minRole) && canAccessPage(item.path.split('?')[0]));

    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    const confirmLogout = () => {
        localStorage.removeItem('token');
        localStorage.clear();
        window.dispatchEvent(new Event('auth-token-changed'));
        navigate('/login', { replace: true });
    };

    const handleSafeNavigate = (path) => {
        if (isDirty) {
            setPendingPath(path);
            setShowNavBlocker(true);
        } else {
            navigate(path);
        }
    };

    return (
        <div
            className={`h-screen pr-1 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-44'}`}
            onMouseEnter={() => setIsCollapsed(false)}
            onMouseLeave={() => {
                setIsCollapsed(true);
                setShowProfileMenu(false);
            }}
        >
            <div className="h-full flex flex-col py-6 bg-mainTheme text-white relative">

                <div
                    onClick={() => handleSafeNavigate('/info/dashboard')}
                    className={`px-3 mb-10 flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity ${isCollapsed ? 'justify-center' : ''}`}
                    title="Go to Dashboard"
                >
                    <CD_Blue className="w-6 h-6 flex-shrink-0" />
                    {!isCollapsed && <span className="text-sm font-bold tracking-wide whitespace-nowrap overflow-hidden">Utiliza-AI</span>}
                </div>

                <nav className="flex-1 px-2 space-y-2">
                    {menuItems.map((item, index) => {
                        const currentPath = location.pathname.replace(/\/$/, '');
                        const itemPathBase = item.path.split('?')[0];
                        const isActive = (itemPathBase === 'dashboard' && (currentPath === '/info/dashboard' || currentPath === '/info')) ||
                            (currentPath.endsWith('/' + itemPathBase) || currentPath.split('/').pop() === itemPathBase);

                        return (
                            <button
                                key={index}
                                onClick={() => handleSafeNavigate('/info/' + item.path)}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 group relative
                                    ${isActive ? 'bg-white/10 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5 hover:text-white'}
                                    ${isCollapsed ? 'justify-center' : ''}
                                `}
                            >
                                <item.icon className={`${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white transition-colors'} w-4 h-4 flex-shrink-0`} />
                                {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap overflow-hidden">{item.label}</span>}

                                {isCollapsed && (
                                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-gray-800 text-white text-xs px-2 py-0 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                                        {item.label}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Bottom Section */}
                <div className="px-2 pt-2 border-t border-white/10 mt-2">
                    {/* User Profile Dropdown */}
                    <div className="relative" ref={profileMenuRef}>
                        <div
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl group relative cursor-pointer hover:bg-white/10 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
                            title="Profile Options"
                        >
                            <div className="w-8 h-8 rounded-full bg-blue-600 border border-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {userInitials}
                            </div>
                            {!isCollapsed && (
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-sm font-medium truncate capitalize">{userName}</span>
                                    <span className="text-[10px] text-gray-400 truncate">{userEmail}</span>
                                </div>
                            )}
                        </div>

                        {showProfileMenu && (
                            <div className={`absolute bottom-full mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[100] transition-all animate-in slide-in-from-bottom-2 duration-200 ${isCollapsed ? 'left-full ml-2' : 'left-0 right-0'}`}>
                                <div className="p-2 flex flex-col gap-1">
                                    <button
                                        onClick={() => {
                                            navigate('/info/settings');
                                            setShowProfileMenu(false);
                                        }}
                                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <Settings size={16} className="text-gray-400" />
                                        Settings
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleLogout();
                                            setShowProfileMenu(false);
                                        }}
                                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <LogOut size={16} className="text-red-400" />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Logout Confirmation Modal */}
                {showLogoutConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 animate-in zoom-in duration-300 border border-gray-100 relative overflow-hidden">
                            <div className="flex flex-col items-center text-center relative z-10">
                                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 text-red-500 border border-red-100 shadow-sm">
                                    <LogOut size={36} strokeWidth={2} />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Confirm Logout</h3>
                                <p className="text-sm text-gray-500 mb-10 leading-relaxed px-4">
                                    Are you sure you want to log out? Any unsaved changes may be lost.
                                </p>

                                <div className="flex flex-col w-full gap-3">
                                    <button
                                        onClick={confirmLogout}
                                        className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-200 transition-all active:scale-[0.98]"
                                    >
                                        Log Out
                                    </button>
                                    <button
                                        onClick={() => setShowLogoutConfirm(false)}
                                        className="w-full py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Global Unsaved Changes Blocker */}
                {showNavBlocker && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                        <AlertTriangle className="text-orange-500" size={24} />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-lg font-bold text-slate-800">Unsaved Changes</h3>
                                        <p className="text-sm text-slate-500 font-medium">You have unsaved changes in your form. Do you want to discard them and leave?</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button
                                        onClick={() => setShowNavBlocker(false)}
                                        className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                                    >
                                        Stay & Save
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsDirty(false);
                                            setShowNavBlocker(false);
                                            if (pendingPath) navigate(pendingPath);
                                        }}
                                        className="px-5 py-2 text-sm font-bold bg-orange-600 text-white rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-200 transition-all"
                                    >
                                        Discard Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Navbar;

