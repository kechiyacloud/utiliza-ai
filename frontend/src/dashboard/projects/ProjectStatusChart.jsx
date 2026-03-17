import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useNavigate } from 'react-router-dom';

const ProjectStatusChart = ({ projects }) => {
    const navigate = useNavigate();
    // Calculate distribution from the projects array based on status
    const data = useMemo(() => {
        if (!projects || projects.length === 0) return [];

        let live = 0, completed = 0, upcoming = 0, partner = 0;

        projects.forEach(p => {
            const statusL = (p.status || '').toLowerCase();
            const typeL = (p.type || '').toLowerCase();
            const nameL = (p.name || '').toLowerCase();

            const isPartner = typeL === 'partner';
            const isCompleted = ['completed', 'done', 'ended', 'end', 'finished'].includes(statusL);
            const isOngoing = ['live', 'in progress', 'running', 'active', 'ongoing'].includes(statusL);

            const isFutureDate = p.startDate && p.startDate !== 'Not Set' && new Date(p.startDate) > new Date();
            const isUpcoming = ['planned', 'upcoming'].includes(statusL) || isFutureDate;

            // Prioritize Partner -> Completed -> Upcoming -> Ongoing
            if (isPartner) {
                partner++;
            } else if (isCompleted) {
                completed++;
            } else if (isUpcoming) {
                upcoming++;
            } else if (isOngoing) {
                live++;
            } else {
                // If no exact match, treat as live by default so it's not lost
                live++;
            }
        });

        const rawData = [
            { name: 'Live', value: live, color: '#22C55E' },      // green-500
            { name: 'Completed', value: completed, color: '#3B82F6' }, // blue-500
            { name: 'Upcoming', value: upcoming, color: '#EAB308' },  // yellow-500
            { name: 'Partner Projects', value: partner, color: '#A855F7' }     // purple-500
        ].filter(item => item.value > 0);

        const total = rawData.reduce((sum, item) => sum + item.value, 0);

        // Precalculate percent safely
        return rawData.map(item => ({
            ...item,
            percent: total > 0 ? Math.round((item.value / total) * 100) : 0
        }));

    }, [projects]);

    const insights = useMemo(() => {
        if (!projects || projects.length === 0) return [];

        return projects
            .map(p => {
                let diffDays = 0;
                if (p.endDate && p.endDate !== 'TBD' && p.endDate !== 'Not Set') {
                    const end = new Date(p.endDate);
                    const today = new Date();
                    const diffTime = end - today;
                    diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                } else {
                    // Give it a default big number if there's no deadline so it sorts to the bottom
                    diffDays = 9999;
                }

                return {
                    ...p,
                    daysRemaining: diffDays
                };
            })
            .sort((a, b) => a.daysRemaining - b.daysRemaining); // Closest to completion first
    }, [projects]);

    const totalProjects = data.reduce((sum, item) => sum + item.value, 0);

    // Custom Tooltip showing percent
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const percent = payload[0].payload?.percent || 0;
            return (
                <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 font-semibold text-sm">
                    <p className="text-gray-600 mb-2">{payload[0].name}</p>
                    <div className="flex items-center justify-between gap-6">
                        <p className="text-gray-900 text-lg flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: payload[0].payload.color }}></span>
                            {payload[0].value} <span className="text-gray-400 text-xs font-medium">Projects</span>
                        </p>
                        <p className="text-gray-600 text-sm font-bold bg-gray-50 px-2 py-1 rounded-md">{percent}%</p>
                    </div>
                </div>
            );
        }
        return null;
    };

    // Custom Legend Formatter showing percent
    const renderLegendText = (value, entry) => {
        // Find safe payload percent if available
        const percent = entry?.payload?.percent !== undefined ? entry.payload.percent : 0;
        return (
            <span className="text-gray-700 font-semibold text-sm ml-1">
                {value} <span className="text-gray-400 ml-1 font-normal">({percent}%)</span>
            </span>
        );
    };

    return (
        <div className="w-full h-full flex flex-col lg:flex-row gap-6 relative overflow-hidden">
            {/* Left: Chart (40%) */}
            <div className="w-full lg:w-[40%] relative flex flex-col h-full bg-white rounded-xl py-6 px-2 justify-center">
                <div className="w-full text-center">
                    <h3 className="text-md font-bold text-gray-800">Status Distribution</h3>
                    <p className="text-xs text-gray-500 font-medium">Breakdown of {totalProjects} projects</p>
                </div>

                <div className="w-full h-[220px] relative mt-2">
                    {data.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={55}
                                    outerRadius={85}
                                    paddingAngle={3}
                                    dataKey="value"
                                    stroke="none"
                                    cornerRadius={4}
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="bottom"
                                    height={24}
                                    iconType="circle"
                                    formatter={renderLegendText}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-medium text-sm">
                            No project data available
                        </div>
                    )}

                    {/* Inner Donut Text */}
                    {data.length > 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-20px]">
                            <span className="text-3xl font-extrabold text-gray-800 leading-none">{totalProjects}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Insights (60%) */}
            <div className="w-full lg:w-[60%] flex flex-col bg-gray-50/50 rounded-2xl p-5 border border-gray-100 h-full overflow-hidden max-h-[450px]">
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Completion Insights</h3>
                    <p className="text-sm text-gray-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis">Active projects closest to deadline</p>
                </div>

                <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                    {insights.length > 0 ? insights.map(p => {
                        let badgeColor = 'bg-green-50 text-green-600 border-green-100';
                        let indicator = '🟢';
                        let progress = 0;
                        if (p.startDate && p.endDate && p.startDate !== 'Not Set' && p.endDate !== 'Not Set') {
                            const start = new Date(p.startDate);
                            const end = new Date(p.endDate);
                            const today = new Date();
                            const total = end - start;
                            const elapsed = today - start;
                            progress = total > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / total) * 100))) : 0;
                        } else {
                            progress = p.daysRemaining < 30 ? 75 : 25; // fallback
                        }

                        if (p.daysRemaining < 7) {
                            badgeColor = 'bg-red-50 text-red-600 border-red-100';
                            indicator = '🔴';
                        } else if (p.daysRemaining <= 30) {
                            badgeColor = 'bg-amber-50 text-amber-600 border-amber-100';
                            indicator = '🟡';
                        }

                        // Parse members from resourceNames string
                        const membersStr = p.resourceNames && p.resourceNames !== "None" ? p.resourceNames : "";
                        const members = membersStr.split(',').map(m => m.trim()).filter(Boolean);
                        const displayMembers = members.slice(0, 3);
                        const extraMembersCount = members.length > 3 ? members.length - 3 : 0;

                        return (
                            <div
                                key={p.id || p.name}
                                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3 group hover:shadow-md hover:border-blue-200 transition-all cursor-default"
                            >
                                <div className="flex justify-between items-start cursor-pointer pt-1" onClick={() => navigate(`/info/projects/${p.id}`, { state: { project: p } })}>
                                    <div className="overflow-hidden pr-3">
                                        <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                                            {p.name}
                                        </h4>
                                        <p className="text-xs text-gray-500 mt-0.5">{p.resources || 0} Resources Allocated</p>
                                    </div>
                                    <div className="shrink-0 flex items-center justify-center p-1.5 text-gray-400 group-hover:text-blue-500 transition-colors rounded-full group-hover:bg-blue-50">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full">
                                    <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                                        <span>Progress</span>
                                        <span className="text-gray-900">{progress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                        <div className={`h-full rounded-full ${p.daysRemaining < 7 ? 'bg-red-500' : p.daysRemaining <= 30 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${progress}%` }}></div>
                                    </div>
                                </div>

                                {/* Bottom Avatars and Days Remaining */}
                                <div className="flex justify-between items-end mt-1">
                                    {/* Avatars */}
                                    <div className="flex -space-x-2 overflow-hidden items-center">
                                        {displayMembers.map((member, idx) => (
                                            <div
                                                key={idx}
                                                className="inline-block relative rounded-full border-2 border-white ring-1 ring-gray-100 cursor-pointer hover:z-10 hover:-translate-y-0.5 transition-transform"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/info/employee/${encodeURIComponent(member)}`);
                                                }}
                                                title={member}
                                            >
                                                <img
                                                    className="w-7 h-7 rounded-full object-cover"
                                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member)}&background=random&color=fff&size=64`}
                                                    alt={member}
                                                />
                                            </div>
                                        ))}
                                        {extraMembersCount > 0 && (
                                            <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600 z-10 cursor-help" title={`+${extraMembersCount} more members`}>
                                                +{extraMembersCount}
                                            </div>
                                        )}
                                        {members.length === 0 && (
                                            <div className="text-xs text-gray-400 italic">No assigned members</div>
                                        )}
                                    </div>

                                    {/* Days Remaining Indicator */}
                                    <div className={`shrink-0 flex items-center gap-1.5 mt-2`}>
                                        <span className="text-sm">{indicator}</span>
                                        <span className={`text-xs font-bold ${p.daysRemaining < 7 ? 'text-red-600' : p.daysRemaining <= 30 ? 'text-amber-600' : 'text-gray-600'}`}>
                                            {p.daysRemaining === 9999 ? 'No Deadline' : `${p.daysRemaining} Days Left`}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="text-center text-gray-400 py-8 text-sm font-medium flex flex-col items-center justify-center h-full">
                            No active projects with upcoming deadlines.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectStatusChart;
