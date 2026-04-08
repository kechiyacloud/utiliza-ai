import React from 'react';
import { Briefcase, Radio, Globe, ArrowLeft, CheckCircle, CalendarClock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const StatCard = ({ label, value, description, subLabel, icon: Icon, onClick, active, customColors }) => {
    const subtitle = description && subLabel ? `${description} (${subLabel})` : description || subLabel || '';
    const cardTint = customColors?.cardBg || '#FFFFFF';
    const cardBorder = customColors?.border || '#E2E8F0';
    const accent = customColors?.accent || customColors?.text || '#475569';
    const activeRing = customColors?.ring || '#BFDBFE';
    return (
        <div
            onClick={onClick}
            className={`p-3.5 rounded-lg border border-l-4 h-full min-h-[124px] flex flex-col justify-between cursor-pointer transition-all duration-200 ${
                active ? 'ring-2 ring-offset-0 shadow-sm' : 'hover:shadow-sm hover:-translate-y-0.5'
            }`}
            style={{
                backgroundColor: cardTint,
                borderColor: cardBorder,
                borderLeftColor: accent,
                ...(active ? { boxShadow: `0 0 0 2px ${activeRing}` } : {})
            }}
        >
            <div className="flex items-center justify-between mb-2">
                <div
                    className="p-1.5 rounded-md"
                    style={{
                        backgroundColor: customColors?.bg || '#F1F5F9',
                        color: customColors?.text || '#475569'
                    }}
                >
                    <Icon size={16} />
                </div>
            </div>

            <div className="flex flex-col items-start gap-1.5">
                <p className="text-3xl font-bold leading-none text-slate-900 tracking-tight">{value}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">{label}</p>
                {subtitle && (
                    <p className="text-[11px] text-gray-500 leading-snug">{subtitle}</p>
                )}
            </div>
        </div>
    );
};

const ProjectsOverview = ({ stats, activeFilter, onFilterChange, onProjectAdded }) => {
    const navigate = useNavigate();
    const location = useLocation();

    if (!stats) return null;

    return (
        <div className="w-full flex flex-col gap-4 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    {location.state?.showBack && (
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                            title="Go Back"
                        >
                            <ArrowLeft size={20} className="text-gray-600" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Projects Overview</h1>
                        <p className="text-gray-500 text-sm mt-1 font-medium">Manage and monitor all active and upcoming projects.</p>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/info/projects/add')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-200"
                >
                    + Add New Project
                </button>
            </div>

            {/* 5 Metric Cards Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <StatCard
                    label="Total Projects"
                    value={stats.totalProjects}
                    description="All-time tracked projects"
                    icon={Briefcase}
                    customColors={{
                        bg: '#EAF2FF',
                        text: '#2563EB',
                        cardBg: '#F8FBFF',
                        border: '#DBEAFE',
                        accent: '#2563EB',
                        ring: '#BFDBFE'
                    }}
                    active={activeFilter === null}
                    onClick={() => onFilterChange(null)}
                />
                <StatCard
                    label="External Projects"
                    value={stats.clientProjects}
                    description="Billable external work"
                    icon={Globe}
                    customColors={{
                        bg: '#F3ECFF',
                        text: '#7C3AED',
                        cardBg: '#FBF7FF',
                        border: '#E9D5FF',
                        accent: '#7C3AED',
                        ring: '#DDD6FE'
                    }}
                    active={activeFilter === 'Client'}
                    onClick={() => onFilterChange(activeFilter === 'Client' ? null : 'Client')}
                />
                <StatCard
                    label="Internal Projects / POCs"
                    value={stats.internalProjects}
                    description="Non-billable initiatives & POCs"
                    icon={Radio}
                    customColors={{
                        bg: '#F3F4F6',
                        text: '#374151',
                        cardBg: '#F9FAFB',
                        border: '#E5E7EB',
                        accent: '#6B7280',
                        ring: '#D1D5DB'
                    }}
                    active={activeFilter === 'Internal'}
                    onClick={() => onFilterChange(activeFilter === 'Internal' ? null : 'Internal')}
                />

                <StatCard
                    label="Upcoming Projects"
                    value={stats.upcoming_projects}
                    description="Not yet started"
                    icon={CalendarClock}
                    customColors={{
                        bg: '#FFF3DC',
                        text: '#F59E0B',
                        cardBg: '#FFFDF6',
                        border: '#FDE68A',
                        accent: '#F59E0B',
                        ring: '#FDE68A'
                    }}
                    active={activeFilter === 'Upcoming'}
                    onClick={() => onFilterChange(activeFilter === 'Upcoming' ? null : 'Upcoming')}
                />
                <StatCard
                    label="Completed Projects"
                    value={stats.completedProjects}
                    description="Successfully delivered"
                    subLabel="Last 3 Months"
                    icon={CheckCircle}
                    customColors={{
                        bg: '#EAFBF1',
                        text: '#10B981',
                        cardBg: '#F7FCF9',
                        border: '#BBF7D0',
                        accent: '#10B981',
                        ring: '#BBF7D0'
                    }}
                    active={activeFilter === 'Completed'}
                    onClick={() => onFilterChange(activeFilter === 'Completed' ? null : 'Completed')}
                />
            </div>

        </div>
    );
};

export default ProjectsOverview;
