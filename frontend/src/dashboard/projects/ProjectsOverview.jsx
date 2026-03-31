import React, { useState } from 'react';
import { Briefcase, Radio, Globe, Activity, FileText, ArrowLeft, CheckCircle, TrendingUp, TrendingDown, CalendarClock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import AddProjectPanel from './AddProjectPanel';

const StatCard = ({ label, value, description, icon: Icon, colorClass, trend, trendUp, onClick, active, customColors }) => {
    return (
        <div
            onClick={onClick}
            className={`bg-white p-4 rounded-xl shadow-sm border ${active ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-100'} flex flex-col justify-between min-w-[140px] flex-1 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all relative overflow-hidden group`}
        >
            {/* Background gradient effect */}
            <div 
                className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity`}
                style={{ backgroundColor: customColors?.bg || '#F1F5F9' }}
            ></div>

            <div className="flex justify-between items-start mb-3 relative z-10">
                <div 
                    className={`p-2 rounded-lg ${customColors ? '' : (colorClass + ' bg-opacity-10')}`}
                    style={{ 
                        backgroundColor: customColors?.bg || (colorClass ? undefined : '#F1F5F9'),
                        color: customColors?.text || (colorClass ? undefined : '#475569')
                    }}
                >
                    <Icon size={18} />
                </div>

                {trend && (
                    <div className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {trendUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {trend}%
                    </div>
                )}
            </div>

            <div className="flex flex-col relative z-10">
                <span className="text-3xl font-bold text-slate-900 tracking-tight mb-1">{value}</span>
                <span className="text-slate-500 text-[10px] font-bold tracking-wider uppercase mb-1">{label}</span>
                {description && (
                    <span className="text-slate-400 text-[10px] font-medium">{description}</span>
                )}
            </div>

            {/* Colored Status indicator line at the bottom */}
            <div 
                className={`absolute bottom-0 left-0 w-full h-1 opacity-50 ${customColors ? '' : colorClass.split(' ')[0]}`}
                style={{ backgroundColor: customColors?.text || (colorClass ? undefined : '#CBD5E1') }}
            ></div>
        </div>
    );
};

const ProjectsOverview = ({ stats, activeFilter, onFilterChange, onProjectAdded }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);

    if (!stats) return null;

    const handleAddProject = () => {
        if (onProjectAdded) {
            onProjectAdded();
        }
    };

    return (
        <div className="w-full flex flex-col gap-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Projects Overview</h1>
                        <p className="text-gray-500 text-sm mt-1 font-medium">Manage and monitor all active and upcoming projects.</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsAddPanelOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-200"
                >
                    + Add New Project
                </button>
            </div>

            {/* 5 Metric Cards Layout */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
                <StatCard
                    label="Total Projects"
                    value={stats.totalProjects}
                    description="All-time tracked projects"
                    icon={Briefcase}
                    customColors={{ bg: '#EFF6FF', text: '#2563EB' }}
                    trend="12"
                    trendUp={true}
                    active={activeFilter === null}
                    onClick={() => onFilterChange(null)}
                />
                <StatCard
                    label="Client Projects"
                    value={stats.clientProjects}
                    description="Billable external work"
                    icon={Globe}
                    customColors={{ bg: '#F5F3FF', text: '#7C3AED' }}
                    trend="5"
                    trendUp={true}
                    active={activeFilter === 'Client'}
                    onClick={() => onFilterChange(activeFilter === 'Client' ? null : 'Client')}
                />
                <StatCard
                    label="Internal Projects / POCs"
                    value={stats.internalProjects}
                    description="Non-billable initiatives & POCs"
                    icon={Radio}
                    customColors={{ bg: '#F3F4F6', text: '#374151' }}
                    trend="2"
                    trendUp={false}
                    active={activeFilter === 'Internal'}
                    onClick={() => onFilterChange(activeFilter === 'Internal' ? null : 'Internal')}
                />

                <StatCard
                    label="Upcoming Projects"
                    value={stats.upcoming_projects}
                    description="Not yet started"
                    icon={CalendarClock}
                    customColors={{ bg: '#FFFBEB', text: '#F59E0B' }}
                    trend="4"
                    trendUp={true}
                    active={activeFilter === 'Upcoming'}
                    onClick={() => onFilterChange(activeFilter === 'Upcoming' ? null : 'Upcoming')}
                />
                <StatCard
                    label="Completed Projects"
                    value={stats.completedProjects}
                    description="Successfully delivered"
                    icon={CheckCircle}
                    customColors={{ bg: '#ECFDF5', text: '#10B981' }}
                    trend="24"
                    trendUp={true}
                    active={activeFilter === 'Completed'}
                    onClick={() => onFilterChange(activeFilter === 'Completed' ? null : 'Completed')}
                />
            </div>

            <AddProjectPanel
                isOpen={isAddPanelOpen}
                onClose={() => setIsAddPanelOpen(false)}
                onAdd={handleAddProject}
            />
        </div>
    );
};

export default ProjectsOverview;
