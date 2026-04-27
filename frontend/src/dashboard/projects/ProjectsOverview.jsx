import React from 'react';
import { Briefcase, Radio, Globe, ArrowLeft, CheckCircle, CalendarClock, ChevronDown, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ label, value, icon: IconComponent, onClick, active, indicators = [] }) => {
    return (
        <div
            onClick={onClick}
            className={`rounded-2xl p-4 border transition-all duration-300 flex flex-col justify-between min-h-[100px] shadow-sm relative group ${
                onClick ? 'cursor-pointer hover:border-blue-300 hover:shadow-md hover:bg-blue-50/30' : 'cursor-default'
            } ${active
                    ? 'bg-blue-50/80 border-blue-400 shadow-sm ring-2 ring-blue-100'
                    : 'bg-white border-slate-200'
                }`}
        >
            <div className="flex items-center justify-between w-full mb-3">
                <p className={`text-2xl font-bold transition-colors ${active ? 'text-blue-700' : 'text-slate-900 group-hover:text-blue-700'}`}>
                    {value}
                </p>
                <div className={`p-2 rounded-xl transition-all ${active ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-700'}`}>
                    <IconComponent size={20} strokeWidth={2.5} />
                </div>
            </div>

            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <p className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${active ? 'text-blue-600/80' : 'text-slate-500 group-hover:text-blue-600/80'}`}>
                        {label}
                    </p>
                    {indicators.length > 0 && (
                        <div className="flex items-center gap-1.5">
                            {indicators.map((ind, i) => (
                                <button
                                    key={i}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        ind.onClick();
                                    }}
                                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-tighter transition-all hover:scale-105 ${ind.className}`}
                                    title={ind.title}
                                >
                                    {ind.icon && <ind.icon size={8} />}
                                    {ind.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ProjectsOverview = ({
    stats,
    activeFilter,
    onFilterChange,
    selectedDepartment = '',
    onDepartmentChange = () => { },
    departments = []
}) => {
    const navigate = useNavigate();

    if (!stats) return null;

    return (
        <div className="w-full flex flex-col gap-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header with Title and Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-slate-200 bg-white shadow-sm rounded-full transition-colors flex-shrink-0"
                        title="Go Back"
                    >
                        <ArrowLeft size={20} className="text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Projects Overview</h1>
                        <p className="text-sm font-medium text-gray-500">
                            {(() => {
                                if (!selectedDepartment || selectedDepartment === 'All Departments' || selectedDepartment === '') {
                                    return 'Complete Organizational Project Insights';
                                }
                                const deptObj = departments.find(d => String(d.id) === String(selectedDepartment) || d.name === selectedDepartment);
                                return `${deptObj ? deptObj.name : selectedDepartment} Department`;
                            })()}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Department Filter Dropdown */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                            <Layers size={13} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <select
                            value={selectedDepartment}
                            onChange={(e) => onDepartmentChange(e.target.value)}
                            className="pl-8 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-sm font-normal text-gray-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 hover:border-gray-300 transition-all cursor-pointer appearance-none min-w-[160px] shadow-sm"
                        >
                            <option value="">All Department</option>
                            {departments.map((dept) => (
                                <option key={dept.id || dept} value={dept.id || dept}>{dept.name || dept}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                            <ChevronDown size={14} className="text-gray-400 group-hover:text-slate-600 transition-colors" />
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/info/projects/add')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-blue-100 hover:-translate-y-0.5"
                    >
                        <span>+</span> Add New Project
                    </button>
                </div>
            </div>

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
                <StatCard
                    label="Total Projects"
                    value={stats.totalProjects}
                    icon={Briefcase}
                    active={activeFilter === null}
                    onClick={() => onFilterChange(null)}
                />
                <StatCard
                    label="External Projects"
                    value={stats.externalProjects}
                    icon={Globe}
                    active={activeFilter === 'External'}
                    onClick={() => onFilterChange(activeFilter === 'External' ? null : 'External')}
                />
                <StatCard
                    label="Internal / POCs"
                    value={stats.internalProjects}
                    icon={Radio}
                    active={activeFilter === 'Internal'}
                    onClick={() => onFilterChange(activeFilter === 'Internal' ? null : 'Internal')}
                />
                <StatCard
                    label="Upcoming Projects"
                    value={stats.upcomingProjects}
                    icon={CalendarClock}
                    active={activeFilter === 'Upcoming'}
                    onClick={() => onFilterChange(activeFilter === 'Upcoming' ? null : 'Upcoming')}
                />
                <StatCard
                    label="Completed Projects"
                    value={stats.completedProjects}
                    icon={CheckCircle}
                    active={activeFilter === 'Completed'}
                    onClick={() => onFilterChange(activeFilter === 'Completed' ? null : 'Completed')}
                />
            </div>
        </div>
    );
};

export default ProjectsOverview;
