import React, { useMemo, useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { ChevronDown, ChevronRight } from 'lucide-react';

const mapSkillToCategory = (skillName) => {
    const s = skillName.toLowerCase();

    if (s.includes('aws') || s.includes('ec2') || s.includes('ecs') || s.includes('eks') ||
        s.includes('lambda') || s.includes('s3') || s.includes('rds') || s.includes('dynamodb') ||
        s.includes('vpc') || s.includes('route53') || s.includes('kms') || s.includes('cloudformation')) return 'AWS';

    if (s.includes('azure') || s.includes('aks')) return 'Azure';

    if (s.includes('gcp') || s.includes('google cloud') || s.includes('bigquery') || s.includes('gke')) return 'GCP';

    if (s.includes('docker') || s.includes('kubernetes') || s.includes('terraform') ||
        s.includes('jenkins') || s.includes('github') || s.includes('gitlab') || s.includes('ci/cd') ||
        s.includes('ansible') || s.includes('argocd') || s.includes('grafana') || s.includes('prometheus')) return 'DevOps & DevOps Tools';

    if (s.includes('python') || s.includes('java') || s.includes('node') || s.includes('react') ||
        s.includes('javascript') || s.includes('go') || s.includes('bash') || s.includes('shell') || s.includes('cpp')) return 'Programming & Scripting';

    if (s.includes('sql') || s.includes('postgres') || s.includes('mongo') || s.includes('oracle') ||
        s.includes('redis') || s.includes('database')) return 'Databases';

    if (s.includes('linux') || s.includes('windows') || s.includes('ubuntu') || s.includes('centos') ||
        s.includes('network') || s.includes('security')) return 'OS & Networking';

    return 'Other Technologies';
};

const SkillsOverview = ({ employees }) => {
    const [expandedSkill, setExpandedSkill] = useState(null);

    // 1. Process all employees to find ALL skills for the Matrix
    const matrixData = useMemo(() => {
        const categoryCounts = {};

        employees.forEach(emp => {
            if (emp.skills && Array.isArray(emp.skills)) {
                // Ensure unique categories per employee so we don't double count 
                // e.g. an employee with EC2 and S3 shouldn't count twice for AWS.
                const employeeCategories = new Set();

                emp.skills.forEach(skill => {
                    const category = mapSkillToCategory(skill);
                    employeeCategories.add(category);
                });

                employeeCategories.forEach(cat => {
                    if (!categoryCounts[cat]) {
                        categoryCounts[cat] = { name: cat, count: 0, benchCount: 0, employees: [] };
                    }
                    categoryCounts[cat].count += 1;
                    categoryCounts[cat].employees.push({
                        id: emp.employee_id,
                        name: emp.employee_name,
                        role: emp.role_designation,
                        photo: emp.photo_url,
                        status: emp.employee_status,
                        isBench: emp.employee_status === 'Bench' || (emp.employee_allocations || 0) === 0
                    });

                    if (emp.employee_status === 'Bench' || (emp.employee_allocations || 0) === 0) {
                        categoryCounts[cat].benchCount += 1;
                    }
                });
            }
        });

        // Convert to array and sort by total count descending
        return Object.values(categoryCounts).sort((a, b) => b.count - a.count);
    }, [employees]);

    // 2. Process Radar Data (Top 6 Skills)
    const radarData = useMemo(() => {
        if (matrixData.length === 0) return [];
        const topSkills = matrixData.slice(0, 6);
        const maxCount = topSkills[0].count;
        return topSkills.map(item => ({
            skill: item.name,
            count: item.count,
            fullMark: Math.ceil((maxCount * 1.2) / 5) * 5
        }));
    }, [matrixData]);

    const handleRowClick = (skillName) => {
        setExpandedSkill(expandedSkill === skillName ? null : skillName);
    };

    if (matrixData.length === 0) {
        return (
            <div className="flex items-center justify-center p-12 bg-gray-50 rounded-xl border border-gray-100 min-h-[300px]">
                <p className="text-gray-500 font-medium">No skills data available for this department.</p>
            </div>
        );
    }

    const maxTotal = Math.max(...matrixData.map(s => s.count));

    return (
        <div className="flex flex-col gap-6">

            {/* Visual Radar Overview Section */}
            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 min-h-[300px] bg-white rounded-xl border border-gray-100 flex flex-col justify-center items-center shadow-sm p-4">
                    <h4 className="text-sm font-bold text-gray-800 self-start mb-2 uppercase tracking-wider">Skill Concentration</h4>
                    <ResponsiveContainer width="100%" height={280}>
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                            <PolarGrid stroke="#e5e7eb" />
                            <PolarAngleAxis dataKey="skill" tick={{ fill: '#4b5563', fontSize: 11, fontWeight: 600 }} />
                            <PolarRadiusAxis angle={30} domain={[0, radarData[0]?.fullMark || 'auto']} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} formatter={(value) => [`${value} Employees`, 'Availability']} />
                            <Radar name="Department Availability" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.4} dot={{ r: 3, fill: '#2563eb' }} activeDot={{ r: 5, fill: '#1d4ed8' }} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Matrix Table Section */}
            <div className="overflow-x-auto overflow-y-auto custom-scrollbar max-h-[400px] border border-gray-100 rounded-xl shadow-sm">
                <table className="w-full relative">
                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm border-b border-gray-200">
                        <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            <th className="py-3 px-2 w-8"></th>
                            <th className="py-3 px-2 text-left">Skill / Technology</th>
                            <th className="py-3 px-2 text-right">Total Availability</th>
                            <th className="py-3 px-2 text-right">Available (Bench)</th>
                            <th className="py-3 px-2 text-left w-1/3">Availability Distribution</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {matrixData.map((skill, index) => {
                            const widthPct = Math.max(5, (skill.count / maxTotal) * 100);
                            const isHighBench = skill.benchCount > 0 && (skill.benchCount / skill.count) > 0.5;
                            const isExpanded = expandedSkill === skill.name;

                            return (
                                <React.Fragment key={index}>
                                    <tr
                                        onClick={() => handleRowClick(skill.name)}
                                        className={`transition-colors cursor-pointer group ${isExpanded ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                                    >
                                        <td className="py-3 px-2 text-gray-400">
                                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </td>
                                        <td className="py-3 px-2">
                                            <span className={`font-semibold ${isExpanded ? 'text-blue-700' : 'text-gray-800'}`}>{skill.name}</span>
                                        </td>
                                        <td className="py-3 px-2 text-right">
                                            <span className="font-bold text-gray-700">{skill.count}</span>
                                        </td>
                                        <td className="py-3 px-2 text-right">
                                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${skill.benchCount > 0
                                                ? isHighBench ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-orange-50 text-orange-600 border border-orange-100'
                                                : 'text-gray-400'
                                                }`}>
                                                {skill.benchCount}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2">
                                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                                    style={{ width: `${widthPct}%` }}
                                                />
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Expanded Employees List */}
                                    {isExpanded && (
                                        <tr className="bg-blue-50/30">
                                            <td colSpan="5" className="p-0">
                                                <div className="px-10 py-4 border-l-4 border-blue-500 animate-fade-in shadow-inner">
                                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                                        Employees with {skill.name} ({skill.employees.length})
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                        {skill.employees.map((emp, idx) => (
                                                            <div key={idx} className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm flex items-center gap-3">
                                                                {emp.photo ? (
                                                                    <img src={emp.photo} alt="" className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                                                                ) : (
                                                                    <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 font-bold flex items-center justify-center text-sm border border-gray-200">
                                                                        {(emp.name || 'U').split(' ').map(n => n[0]).slice(0, 2).join('')}
                                                                    </div>
                                                                )}
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-gray-800 text-sm truncate">{emp.name}</span>
                                                                    <span className="text-[10px] text-gray-500 font-medium truncate">{emp.role}</span>
                                                                    {emp.isBench && (
                                                                        <span className="text-[10px] text-orange-600 font-bold mt-0.5">On Bench</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
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
