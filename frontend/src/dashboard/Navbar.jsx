import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CD_Blue } from '../Assets';
import api from '../api/axios';
import { LayoutDashboard, FolderKanban, Users, PieChart, CalendarClock, Briefcase, Settings, ChevronLeft, ChevronRight, Network, LogOut } from 'lucide-react';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const userEmail = localStorage.getItem('userEmail') || 'user@example.com';
    const userName = (userEmail || '').split('@')[0] || 'User';
    const userInitials = (userName || 'U').substring(0, 2).toUpperCase();

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: 'dashboard' },
        { icon: FolderKanban, label: 'Projects', path: 'projects' },
        { icon: Users, label: 'Employee', path: 'employee' },
        { icon: PieChart, label: 'Allocation', path: 'allocation' },
        { icon: CalendarClock, label: 'Availability', path: 'availability' },
        { icon: Briefcase, label: 'Client', path: 'client' },
        { icon: Network, label: 'Organization', path: 'organization' },
        { icon: Settings, label: 'Settings', path: 'settings' },
    ];

    const handleLogout = () => {
        // Clear any auth tokens/session data
        localStorage.removeItem('token');
        sessionStorage.clear();
        navigate('/login');
    };

    return (
        <div className={`h-screen pr-1 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-44'}`}>
            <div className="h-full flex flex-col py-6 bg-mainTheme text-white relative">

                {/* Toggle Button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-8 bg-white text-mainTheme p-1 rounded-full shadow-md z-10 hover:bg-gray-100 transition-colors"
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
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
                        const isActive = (item.path === 'dashboard' && (location.pathname === '/info/dashboard' || location.pathname === '/info')) || location.pathname.includes(item.path);

                        return (
                            <button
                                key={index}
                                onClick={() => navigate(item.path)}
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
                                const response = await api.get(`/employee/by-email/${userEmail}`);
                                if (response.data && response.data.employee_id) {
                                    navigate(`/info/employees/${response.data.employee_id}`);
                                }
                            } catch (error) {
                                console.error("Could not fetch user profile ID", error);
                                alert("Failed to load your advanced profile. Are you synced as an employee?");
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
            </div>
        </div>
    );
};

export default Navbar;

