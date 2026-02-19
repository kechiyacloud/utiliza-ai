import React, { useState } from 'react';
import { Briefcase, Radio, Globe, Activity, FileText } from 'lucide-react';
import AddProjectPanel from './AddProjectPanel';

const StatCard = ({ label, value, icon: Icon, colorClass }) => {
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center min-w-[140px] flex-1">
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

const ProjectsOverview = ({ stats }) => {
    const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);

    if (!stats) return null;

    const handleAddProject = (newProject) => {
        console.log("New Project Added:", newProject);
        // In real app, this would call an API or update parent state
    };

    return (
        <div className="w-full flex flex-col gap-6 mb-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Projects Overview</h1>
                    <p className="text-gray-500">Manage and monitor all active and upcoming projects.</p>
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
                />
                <StatCard
                    label="Internal Projects"
                    value={stats.internalProjects}
                    icon={Radio}
                    colorClass="bg-indigo-100 text-indigo-500"
                />
                <StatCard
                    label="Client Projects"
                    value={stats.clientProjects}
                    icon={Globe}
                    colorClass="bg-sky-100 text-sky-500"
                />
                <StatCard
                    label="Ongoing"
                    value={stats.ongoing}
                    icon={Activity}
                    colorClass="bg-blue-100 text-blue-500"
                />
                <StatCard
                    label="POCs Count"
                    value={stats.pocsCount}
                    icon={FileText}
                    colorClass="bg-blue-100 text-blue-500"
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
