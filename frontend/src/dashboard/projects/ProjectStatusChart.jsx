import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown } from 'lucide-react';

const ProjectStatusChart = ({ projects }) => {
    const navigate = useNavigate();
    const today = new Date();
    const threeMonthsLater = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate());

    const calculateProgress = (project) => {
        const start = new Date(project.startDate || project.start_date);
        const end = new Date(project.endDate || project.end_date);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { pct: 0, daysLeft: 0 };
        const msDay = 1000 * 60 * 60 * 24;
        const totalDuration = Math.max((end - start) / msDay, 1);
        const elapsed = Math.max((today - start) / msDay, 0);
        let pct = Math.round((elapsed / totalDuration) * 100);
        if (today < start) pct = 0;
        if (today > end) pct = 100;
        pct = Math.min(Math.max(pct, 0), 100);
        const daysLeft = Math.max(Math.ceil((end - today) / msDay), 0);
        return { pct, daysLeft };
    };

    const getColor = (progress, hasStarted) => {
        if (!hasStarted) return { bar: 'bg-gray-300', text: 'text-gray-500' };
        if (progress <= 30) return { bar: 'bg-yellow-400', text: 'text-yellow-700' };
        if (progress <= 60) return { bar: 'bg-orange-400', text: 'text-orange-700' };
        if (progress <= 90) return { bar: 'bg-blue-500', text: 'text-blue-50' };
        return { bar: 'bg-emerald-500', text: 'text-emerald-50' };
    };

    const getBadgeStyle = (progress) => {
        if (progress <= 30) {
            return "bg-yellow-100 text-yellow-800 shadow-sm";
        }
        if (progress <= 60) {
            return "bg-orange-500 text-white shadow-sm";
        }
        return "bg-emerald-500 text-white shadow-sm";
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

    const [hoveredId, setHoveredId] = useState(null);
    const [sortOrder, setSortOrder] = useState('asc'); // default finishing soon first

    const sortedProjects = useMemo(() => {
        const safeDate = (val) => {
            const d = new Date(val);
            return Number.isNaN(d.getTime()) ? null : d;
        };
        return [...filteredProjects].sort((a, b) => {
            const aEnd = safeDate(a.endDate || a.end_date);
            const bEnd = safeDate(b.endDate || b.end_date);
            if (!aEnd && !bEnd) return 0;
            if (!aEnd) return 1;
            if (!bEnd) return -1;
            return sortOrder === 'asc' ? aEnd - bEnd : bEnd - aEnd;
        });
    }, [filteredProjects, sortOrder]);

    const toggleSort = () => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));

    return (
        <div className="w-full h-full flex flex-col bg-white rounded-2xl p-5 border border-gray-100">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Project Progress — Upcoming 3 Months</h3>
                    <p className="text-sm text-gray-500 font-medium">Current Timeline (3 Months View)</p>
                </div>
                <button
                    type="button"
                    onClick={toggleSort}
                    title="Sort by end date"
                    className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-white hover:border-blue-200 hover:text-blue-600 transition"
                >
                    <ArrowUpDown size={14} />
                    {sortOrder === 'asc' ? 'Sort: Finishing Soon \u2191' : 'Sort: Finishing Last \u2193'}
                </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1">
                {sortedProjects.length > 0 ? sortedProjects.map((p) => {
                    const { pct, daysLeft } = calculateProgress(p);
                    const notStarted = pct === 0 && (new Date(p.startDate || p.start_date) > today);
                    const colors = getColor(pct, !notStarted);
                    return (
                        <div
                            key={p.id || p.name}
                            className="bg-gray-50 border border-gray-100 rounded-xl p-4 shadow-sm hover:border-blue-200 transition"
                        >
                            <div className="flex justify-between items-start text-sm font-semibold text-gray-800">
                                <span className="truncate pr-3">{p.name}</span>
                                <span className={`text-xs font-bold ${colors.text}`}>{pct}%</span>
                            </div>

                            <div className="mt-2 inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-full transition-colors duration-200 flex-wrap"
                                style={{ maxWidth: "100%" }}
                                aria-label="Progress summary">
                                <span className={`${getBadgeStyle(pct)} inline-flex items-center gap-1 px-3 py-1 rounded-full`}>
                                    <span className="text-[11px] font-semibold">{daysLeft} days left</span>
                                    <span className="text-[12px] font-extrabold">• {pct}% completed</span>
                                </span>
                            </div>

                            <div className="w-full bg-gray-200 rounded-full h-3 mt-3 relative group transition-all">
                                {/* Arrow marker */}
                                <div
                                    className="absolute -left-1 top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-6 border-t-transparent border-b-transparent border-r-gray-400 opacity-80"
                                ></div>

                                {/* Tooltip */}
                                {(hoveredId === (p.id || p.name)) && (
                                    <div className="absolute left-0 -top-10 z-10 px-3 py-2 rounded-lg shadow-md bg-white border border-gray-100 text-[11px] font-semibold text-gray-700 whitespace-nowrap">
                                        {daysLeft} days left · {pct}% completed
                                    </div>
                                )}

                                <div
                                    className={`${colors.bar} h-3 rounded-full transition-all duration-300 ease-out group-hover:brightness-110`}
                                    style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
                                    onMouseEnter={() => setHoveredId(p.id || p.name)}
                                    onMouseLeave={() => setHoveredId(null)}
                                />
                            </div>
                            <div className="text-xs text-gray-500 mt-3 flex justify-between gap-2">
                                <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold">
                                    Start: {p.startDate || p.start_date || 'N/A'}
                                </span>
                                <span className="px-2 py-1 rounded-lg bg-amber-50 text-orange-700 font-semibold">
                                    End: {p.endDate || p.end_date || 'N/A'}
                                </span>
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

