import React from 'react';
import { Briefcase, Radio, Globe, ArrowLeft, CheckCircle, CalendarClock, ChevronDown, Layers } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const StatCard = ({ label, value, icon: Icon, onClick, active }) => {
    return (
        <div
            onClick={onClick}
            className={`rounded-xl p-3.5 border transition-all duration-500 cursor-pointer flex flex-col justify-between h-24 shadow-sm relative group ${
                active 
                ? 'bg-blue-50/30 border-blue-500 ring-2 ring-blue-100 ring-offset-0' 
                : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md'
            }`}
        >
            <div className="flex justify-between items-start flex-row-reverse w-full">
                <div className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${active ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                    <Icon size={16} />
                </div>
                {active && (
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse absolute top-4 left-4"></div>
                )}
            </div>

            <div className="flex flex-col mt-auto">
                <p className={`text-xl font-semibold transition-colors ${active ? 'text-blue-700' : 'text-gray-800'}`}>
                    {value}
                </p>
                <p className="text-sm font-medium text-slate-500">
                    {label}
                </p>
            </div>
        </div>
    );
};

const ProjectsOverview = ({ 
    stats, 
    activeFilter, 
    onFilterChange, 
    onProjectAdded, 
    selectedDepartment, 
    onDepartmentChange, 
    departments 
}) => {
    const navigate = useNavigate();
    const location = useLocation();

    if (!stats) return null;

    return (
        <div className="w-full flex flex-col gap-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    {location.state?.showBack && (
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2.5 hover:bg-white hover:shadow-md rounded-xl transition-all flex-shrink-0 text-slate-500 hover:text-blue-600 border border-transparent hover:border-blue-100"
                            title="Go Back"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-800 tracking-tight">Projects Overview</h1>
                        <p className="text-slate-500 text-sm mt-1 font-normal">
                            {selectedDepartment === '' || selectedDepartment === 'All Departments' ? 'All Organization Projects' : `${selectedDepartment} Department`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
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
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                            <ChevronDown size={14} className="text-gray-400 group-hover:text-slate-600 transition-colors" />
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/info/projects/add')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-blue-100 hover:-translate-y-0.5 ml-1"
                    >
                        <span>+</span> Add New Project
                    </button>
                </div>
            </div>

            {/* Metric Cards Grid - Responsive wrapping, no scroll */}
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
                    value={stats.externalProjects || stats.clientProjects}
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
                    value={stats.upcoming_projects}
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
