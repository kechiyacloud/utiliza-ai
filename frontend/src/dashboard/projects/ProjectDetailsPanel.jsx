import React from 'react';
import { X, Calendar, Users, Target, Activity } from 'lucide-react';

const ProjectDetailsPanel = ({ isOpen, onClose, project }) => {
    if (!isOpen || !project) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Panel */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden pointer-events-auto transform transition-all scale-100 max-h-[90vh]">

                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex gap-4 items-center">
                            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl flex-shrink-0">
                                {project.icon || project.name.substring(0, 1).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 leading-tight mb-1">{project.name}</h2>
                                <p className="text-sm font-medium text-gray-500">{project.client}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

                        {/* Status Row */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Current Status</span>
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${project.statusPillColor || 'bg-gray-200 text-gray-700'}`}>
                                        {project.status || 'Unknown'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Project Type</span>
                                <span className="px-3 py-1 bg-white border border-gray-200 text-gray-700 rounded-md text-xs font-bold shadow-sm">
                                    {project.type || 'Standard'}
                                </span>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Start Date */}
                            <div className="flex flex-col gap-2 p-4 border border-gray-100 rounded-xl">
                                <div className="flex items-center gap-2 text-gray-400">
                                    <Calendar size={16} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Start Date</span>
                                </div>
                                <span className="font-semibold text-gray-800">
                                    {project.startDate || 'Not Set'}
                                </span>
                            </div>

                            {/* End Date */}
                            <div className="flex flex-col gap-2 p-4 border border-gray-100 rounded-xl">
                                <div className="flex items-center gap-2 text-gray-400">
                                    <Target size={16} />
                                    <span className="text-xs font-bold uppercase tracking-wider">End Date</span>
                                </div>
                                <span className="font-semibold text-gray-800">
                                    {project.endDate || 'TBD'}
                                </span>
                            </div>

                            {/* Resources */}
                            <div className="flex flex-col gap-2 p-4 border border-gray-100 rounded-xl">
                                <div className="flex items-center gap-2 text-blue-500">
                                    <Users size={16} />
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Resources</span>
                                </div>
                                <div className="flex flex-col mt-3">
                                    <div className="flex items-end gap-1 mb-2">
                                        <span className="text-2xl font-extrabold text-gray-800 leading-none">
                                            {project.resources || 0}
                                        </span>
                                        <span className="text-sm font-medium text-gray-500 mb-0.5">Allocated</span>
                                    </div>
                                    {project.resourceNames && project.resourceNames !== 'None' && (
                                        <div className="text-xs font-medium text-blue-600 bg-blue-50/50 px-2 py-1.5 rounded-lg border border-blue-100 leading-tight">
                                            {project.resourceNames}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Health Indicator */}
                            <div className="flex flex-col gap-2 p-4 border border-gray-100 rounded-xl">
                                <div className="flex items-center gap-2 text-emerald-500">
                                    <Activity size={16} />
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Health</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="font-semibold text-emerald-700">On Track</span>
                                </div>
                            </div>
                        </div>

                        {/* Description / Notes placeholder */}
                        <div className="flex flex-col gap-2 mt-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Project Description</span>
                            <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                                This project is currently in the {project.status?.toLowerCase() || 'planning'} phase.
                                It is a {project.type?.toLowerCase() || 'standard'} engagement for {project.client}.
                                Currently utilizing {project.resources || 0} team members to meet the projected milestone dates.
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-all shadow-sm w-full"
                        >
                            Close Details
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ProjectDetailsPanel;
