import React, { useMemo, useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getSkillTopic, normalizeSkillName } from '../../../utils/skillTopics';

const SkillsOverview = ({ employees = [] }) => {
    const [expandedSubskills, setExpandedSubskills] = useState(new Set());
    const [expandedTopic, setExpandedTopic] = useState(null);

    const toggleSubskill = (topicName, subskillName) => {
        const key = `${topicName}-${subskillName}`;
        setExpandedSubskills(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const topicMatrix = useMemo(() => {
        const topicsMap = new Map();

        employees.forEach((employee) => {
            const uniqueEmployeeSkills = [...new Set((employee.skills || []).map(normalizeSkillName).filter(Boolean))];

            uniqueEmployeeSkills.forEach((skillName) => {
                const topicName = getSkillTopic(skillName);
                const topicKey = topicName.toLowerCase();
                const skillKey = skillName.toLowerCase();
                const isBench = (employee.employee_status || '').toLowerCase() === 'bench' || (employee.employee_allocations || 0) === 0;

                if (!topicsMap.has(topicKey)) {
                    topicsMap.set(topicKey, {
                        name: topicName,
                        count: 0,
                        benchCount: 0,
                        subskills: new Map()
                    });
                }

                const topicEntry = topicsMap.get(topicKey);
                topicEntry.count += 1;
                if (isBench) {
                    topicEntry.benchCount += 1;
                }

                if (!topicEntry.subskills.has(skillKey)) {
                    topicEntry.subskills.set(skillKey, {
                        name: skillName,
                        count: 0,
                        benchCount: 0,
                        employees: []
                    });
                }

                const subskillEntry = topicEntry.subskills.get(skillKey);
                subskillEntry.count += 1;
                if (isBench) {
                    subskillEntry.benchCount += 1;
                }
                subskillEntry.employees.push({
                    id: employee.employee_id,
                    name: employee.employee_name,
                    role: employee.role_designation,
                    isBench: isBench
                });
            });
        });

        return [...topicsMap.values()].map((topic) => ({
            ...topic,
            subskills: [...topic.subskills.values()].sort((left, right) => {
                if (right.count !== left.count) return right.count - left.count;
                return left.name.localeCompare(right.name);
            })
        })).sort((left, right) => {
            if (left.name === 'Other') return 1;
            if (right.name === 'Other') return -1;
            if (right.count !== left.count) return right.count - left.count;
            return left.name.localeCompare(right.name);
        });
    }, [employees]);

    const radarData = useMemo(() => {
        if (topicMatrix.length === 0) return [];

        const topTopics = topicMatrix.slice(0, 6);
        const maxCount = topTopics[0]?.count || 1;

        return topTopics.map((item) => ({
            skill: item.name,
            count: item.count,
            fullMark: Math.ceil((maxCount * 1.2) / 5) * 5
        }));
    }, [topicMatrix]);

    if (topicMatrix.length === 0) {
        return (
            <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-gray-100 bg-gray-50 p-12">
                <p className="font-medium text-gray-500">No skills data available for the selected department or filters.</p>
            </div>
        );
    }

    const maxTotal = Math.max(...topicMatrix.map((topic) => topic.count), 1);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex min-h-[300px] flex-1 flex-col items-center justify-center rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <h4 className="mb-2 self-start text-lg font-bold text-gray-800 tracking-tight">Skill Concentration by Topic</h4>
                <ResponsiveContainer width="99%" height={280} minWidth={1} minHeight={1}>
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="skill" tick={{ fill: '#4b5563', fontSize: 11, fontWeight: 600 }} />
                        <PolarRadiusAxis angle={30} domain={[0, radarData[0]?.fullMark || 'auto']} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} />
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            formatter={(value) => [`${value} Employees`, 'Coverage']}
                        />
                        <Radar
                            name="Department Coverage"
                            dataKey="count"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            fill="#3b82f6"
                            fillOpacity={0.35}
                            dot={{ r: 3, fill: '#2563eb' }}
                            activeDot={{ r: 5, fill: '#1d4ed8' }}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>

            <div className="max-h-[420px] overflow-x-auto overflow-y-auto rounded-xl border border-gray-100 shadow-sm custom-scrollbar">
                <table className="relative w-full">
                    <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 shadow-sm">
                        <tr className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            <th className="w-8 px-2 py-3"></th>
                            <th className="px-2 py-3 text-left">Topic</th>
                            <th className="px-2 py-3 text-right">Total Skills</th>
                            <th className="px-2 py-3 text-right">Bench Skills</th>
                            <th className="w-1/3 px-2 py-3 text-left">Coverage</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {topicMatrix.map((topic) => {
                            const isExpanded = expandedTopic === topic.name;
                            const widthPercentage = Math.max(5, (topic.count / maxTotal) * 100);
                            const benchHeavy = topic.benchCount > 0 && (topic.benchCount / topic.count) > 0.5;

                            return (
                                <React.Fragment key={topic.name}>
                                    <tr
                                        onClick={() => setExpandedTopic((current) => current === topic.name ? null : topic.name)}
                                        className={`cursor-pointer transition-colors group ${isExpanded ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                                    >
                                        <td className="px-2 py-3 text-gray-400">
                                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </td>
                                        <td className="px-2 py-3">
                                            <div className="flex flex-col">
                                                <span className={`font-semibold ${isExpanded ? 'text-blue-700' : 'text-gray-800'}`}>{topic.name}</span>
                                                <span className="text-sm font-medium text-gray-500">{topic.subskills.length} subskills</span>
                                            </div>
                                        </td>
                                        <td className="px-2 py-3 text-right">
                                            <span className="font-bold text-gray-700">{topic.count}</span>
                                        </td>
                                        <td className="px-2 py-3 text-right">
                                            <span className={`rounded-md px-2 py-1 text-xs font-bold ${topic.benchCount > 0
                                                ? benchHeavy
                                                    ? 'border border-red-100 bg-red-50 text-red-600'
                                                    : 'border border-amber-100 bg-amber-50 text-amber-600'
                                                : 'text-gray-400'
                                                }`}>
                                                {topic.benchCount}
                                            </span>
                                        </td>
                                        <td className="px-2 py-3">
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                                <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${widthPercentage}%` }} />
                                            </div>
                                        </td>
                                    </tr>

                                    {isExpanded && (
                                        <tr className="bg-blue-50/30">
                                            <td colSpan="5" className="p-0">
                                                <div className="animate-fade-in border-l-4 border-blue-500 px-10 py-4 shadow-inner">
                                                    <h4 className="mb-3 text-base font-bold text-gray-700">
                                                        {topic.name} Subskills
                                                    </h4>
                                                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                                        {topic.subskills.map((subskill) => {
                                                            const isSubskillExpanded = expandedSubskills.has(`${topic.name}-${subskill.name}`);
                                                            const displayEmployees = isSubskillExpanded ? subskill.employees : subskill.employees.slice(0, 6);

                                                            return (
                                                                <div key={`${topic.name}-${subskill.name}`} className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <div>
                                                                            <p className="text-sm font-bold text-gray-800">{subskill.name}</p>
                                                                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{subskill.count} employees</p>
                                                                        </div>
                                                                        <span className={`rounded-lg px-2 py-1 text-[10px] font-black ${subskill.benchCount > 0 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                                                            {subskill.benchCount} bench
                                                                        </span>
                                                                    </div>
                                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                                        {displayEmployees.map((employee) => (
                                                                            <span 
                                                                                key={`${subskill.name}-${employee.id}`} 
                                                                                className={`rounded-full px-2 py-1 text-[10px] font-bold border ${employee.isBench 
                                                                                    ? 'bg-amber-50 text-amber-600 border-amber-100' 
                                                                                    : 'bg-slate-50 text-slate-600 border-slate-100'}`}
                                                                            >
                                                                                {employee.name}
                                                                            </span>
                                                                        ))}
                                                                        {subskill.employees.length > 6 && (
                                                                            <button 
                                                                                onClick={() => toggleSubskill(topic.name, subskill.name)}
                                                                                className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-100 transition-colors"
                                                                            >
                                                                                {isSubskillExpanded ? 'Show less' : `+${subskill.employees.length - 6} more`}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SkillsOverview;
