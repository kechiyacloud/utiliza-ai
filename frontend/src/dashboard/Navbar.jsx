import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CD_Blue } from '../Assets';
import api from '../api/axios';
import { LayoutDashboard, Briefcase, Users, PieChart, CalendarClock, Building2, Settings, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const userEmail = localStorage.getItem('userEmail') || 'user@example.com';
    const userName = (userEmail || '').split('@')[0] || 'User';
    const userInitials = (userName || 'U').substring(0, 2).toUpperCase();

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: 'dashboard' },
        { icon: Briefcase, label: 'Projects', path: 'projects' },
        { icon: Users, label: 'Employees', path: 'employees/list' },
        { icon: PieChart, label: 'Allocations', path: 'allocation' },
        { icon: CalendarClock, label: 'Availability', path: 'availability' },
        { icon: Building2, label: 'Clients', path: 'client' },
        { icon: Settings, label: 'Settings', path: 'settings' },
    ];

    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    const confirmLogout = () => {
        // Clear any auth tokens/session data
        localStorage.removeItem('token');
        localStorage.clear();
        navigate('/login');
    };

    return (
        <div className={`h-screen pr-1 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-44'}`}>
            <div className="h-full flex flex-col py-6 bg-mainTheme text-white relative">

                {/* Toggle Button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-8 bg-white text-mainTheme p-1.5 rounded-full shadow-md z-10 hover:bg-gray-100 transition-colors flex items-center justify-center"
                >
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>

                <div
                    onClick={() => navigate('/info/dashboard')}
                    className={`px-3 mb-10 flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity ${isCollapsed ? 'justify-center' : ''}`}
                    title="Go to Dashboard"
                >
                    <CD_Blue className="w-6 h-6 flex-shrink-0" />
                    {!isCollapsed && <span className="text-sm font-bold tracking-wide whitespace-nowrap overflow-hidden">Utiliza-AI</span>}
                </div>

                <nav className="flex-1 px-2 space-y-2">
                    {menuItems.map((item, index) => {
                        const currentPath = location.pathname.replace(/\/$/, ''); // Remove trailing slash
                        const isActive = (item.path === 'dashboard' && (currentPath === '/info/dashboard' || currentPath === '/info')) || 
                                         (currentPath.endsWith('/' + item.path) || currentPath.split('/').pop() === item.path);

                        return (
                            <button
                                key={index}
                                onClick={() => navigate('/info/' + item.path)}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 group relative
                                    ${isActive ? 'bg-white/10 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5 hover:text-white'}
                                    ${isCollapsed ? 'justify-center' : ''}
                                `}
                            >
                                <item.icon className={`${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white transition-colors'} w-4 h-4 flex-shrink-0`} />
                                {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap overflow-hidden">{item.label}</span>}

                                {/* Tooltip for collapsed mode */}
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
                <div className="px-2 pt-2 border-t border-white/10 mt-2 flex flex-col gap-2">

                    {/* User Profile */}
                    <div
                        onClick={async () => {
                            try {
                                const response = await api.get(`/employee/by-email/${encodeURIComponent(userEmail)}`);
                                if (response.data && response.data.employee_id) {
                                    navigate(`/info/employee/${response.data.employee_id}`, {
                                        state: {
                                            from: {
                                                pathname: location.pathname,
                                                search: location.search,
                                                hash: location.hash,
                                                state: location.state || null
                                            }
                                        }
                                    });
                                } else {
                                    alert(`No employee profile found for ${userEmail}. Please ensure your email is linked to an active employee record.`);
                                }
                            } catch (error) {
                                console.error("Could not fetch user profile ID", error);
                                alert("Failed to load your advanced profile. Please try again later.");
                            }
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl group relative cursor-pointer hover:bg-white/10 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
                        title="View Full Profile"
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
                        {/* Tooltip for collapsed mode */}
                        {isCollapsed && (
                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                                <div className="font-bold capitalize">{userName}</div>
                                <div className="text-[10px] text-gray-400">{userEmail}</div>
                            </div>
                        )}
                    </div>

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group relative text-red-400 hover:bg-red-500/10 hover:text-red-300 ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && <span className="text-sm font-medium">Logout</span>}
                        {isCollapsed && (
                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                                Logout
                            </div>
                        )}
                    </button>
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
            </div>
        </div>
    );
};

export default Navbar;

