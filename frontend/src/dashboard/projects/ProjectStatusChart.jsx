import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const ProjectStatusChart = ({ projects }) => {
    const navigate = useNavigate();
    const today = new Date();
    const threeMonthsLater = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate());

    const calculateProgress = (project) => {
        const start = new Date(project.startDate || project.start_date);
        const end = new Date(project.endDate || project.end_date);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
        if (today <= start) return 0;
        if (today >= end) return 100;
        const totalDuration = end - start;
        const elapsed = today - start;
        return Math.round((elapsed / totalDuration) * 100);
    };

    const getColor = (progress) => {
        if (progress < 30) return 'bg-red-500';
        if (progress < 70) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const filteredProjects = useMemo(() => {
        if (!projects || projects.length === 0) return [];
        return projects.filter(project => {
            const start = new Date(project.startDate || project.start_date);
            const end = new Date(project.endDate || project.end_date || project.startDate || project.start_date);
            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
            return end >= today && start <= threeMonthsLater;
        });
    }, [projects, threeMonthsLater, today]);

    return (
        <div className="w-full h-full flex flex-col bg-white rounded-2xl p-5 border border-gray-100">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Project Progress (Next 3 Months)</h3>
                    <p className="text-sm text-gray-500 font-medium">3 Months (Current)</p>
                </div>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1">
                {filteredProjects.length > 0 ? filteredProjects.map((p) => {
                    const progress = calculateProgress(p);
                    const colorClass = getColor(progress);
                    return (
                        <div key={p.id || p.name} className="bg-gray-50 border border-gray-100 rounded-xl p-4 shadow-sm hover:border-blue-200 transition">
                            <div className="flex justify-between items-start text-sm font-semibold text-gray-800">
                                <span className="truncate pr-3">{p.name}</span>
                                <span className="text-gray-600">{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                <div
                                    className={`${colorClass} h-2 rounded-full transition-all`}
                                    style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
                                />
                            </div>
                            <div className="text-xs text-gray-500 mt-2 flex justify-between">
                                <span>Start: {p.startDate || p.start_date || 'N/A'}</span>
                                <span>End: {p.endDate || p.end_date || 'N/A'}</span>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="text-center text-gray-400 py-10 text-sm font-medium">
                        No projects in the next 3 months.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectStatusChart;
