import React, { useState } from 'react';
import { Briefcase, Radio, Globe, Activity, FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AddProjectPanel from './AddProjectPanel';

const StatCard = ({ label, value, icon: Icon, colorClass, onClick, active }) => {
    return (
        <div
            onClick={onClick}
            className={`bg-white p-4 rounded-xl shadow-sm border ${active ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-100'} flex justify-between items-center min-w-[140px] flex-1 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all`}
        >
            <div className="flex flex-col">
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</span>
                <span className="text-2xl font-extrabold text-gray-800">{value}</span>
            </div>
            <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10 text-opacity-100`}>
                <Icon size={20} className={colorClass.replace('bg-', 'text-').replace('10', '500')} />
            </div>
        </div>
    );
};

const ProjectsOverview = ({ stats, activeFilter, onFilterChange }) => {
    const navigate = useNavigate();
    const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);

    if (!stats) return null;

    const handleAddProject = (newProject) => {
        console.log("New Project Added:", newProject);
        // In real app, this would call an API or update parent state
    };

    return (
        <div className="w-full flex flex-col gap-6 mb-8">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                        title="Go Back"
                    >
                        <ArrowLeft size={20} className="text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Projects Overview</h1>
                        <p className="text-gray-500">Manage and monitor all active and upcoming projects.</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsAddPanelOpen(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-blue-200"
                >
                    + Add New Project
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard
                    label="Total Projects"
                    value={stats.totalProjects}
                    icon={Briefcase}
                    colorClass="bg-blue-100 text-blue-500"
                    active={activeFilter === null}
                    onClick={() => onFilterChange(null)}
                />
                <StatCard
                    label="Internal Projects"
                    value={stats.internalProjects}
                    icon={Radio}
                    colorClass="bg-indigo-100 text-indigo-500"
                    active={activeFilter === 'Internal'}
                    onClick={() => onFilterChange(activeFilter === 'Internal' ? null : 'Internal')}
                />
                <StatCard
                    label="Client Projects"
                    value={stats.clientProjects}
                    icon={Globe}
                    colorClass="bg-sky-100 text-sky-500"
                    active={activeFilter === 'Client'}
                    onClick={() => onFilterChange(activeFilter === 'Client' ? null : 'Client')}
                />
                <StatCard
                    label="Ongoing"
                    value={stats.ongoing}
                    icon={Activity}
                    colorClass="bg-blue-100 text-blue-500"
                    active={activeFilter === 'Ongoing'}
                    onClick={() => onFilterChange(activeFilter === 'Ongoing' ? null : 'Ongoing')}
                />
                <StatCard
                    label="POCs Count"
                    value={stats.pocsCount}
                    icon={FileText}
                    colorClass="bg-blue-100 text-blue-500"
                    active={activeFilter === 'POC'}
                    onClick={() => onFilterChange(activeFilter === 'POC' ? null : 'POC')}
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
