import React, { useState, useEffect } from 'react';
import {
    Calendar,
    Award,
    ArrowRightLeft,
    Clock,
    ArrowUpRight,
    Activity,
    TrendingUp,
    BarChart2,
    History,
    ShieldAlert,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const DashboardTables = ({
    availability = [],
    skillsGap = [],
    transitions = [],
    certifications = [],
    benchAging = [],
    trends = [],
    highUtilizationEmployee = [],
    highUtilizationProject = [],
    forcedTab = null,
    contextLabel = 'Organization'
}) => {
    const [activeTab, setActiveTab] = useState('availability');
    const [utilizationSubTab, setUtilizationSubTab] = useState('employee');
    const [selectedTrendIndex, setSelectedTrendIndex] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const recentTrends = (trends || []).slice(-3);

    useEffect(() => {
        if (forcedTab) {
            setActiveTab(forcedTab);
        }
    }, [forcedTab]);

    useEffect(() => {
        setSelectedTrendIndex(recentTrends.length > 0 ? recentTrends.length - 1 : null);
    }, [trends]);

    const getSkillGapMeta = (allocatedCount, availableCount) => {
        if (allocatedCount > availableCount) {
            return {
                label: 'Shortage',
                tone: 'bg-rose-50 text-rose-600 border-rose-100',
                bar: 'bg-rose-500'
            };
        }

        if (allocatedCount === availableCount) {
            return {
                label: 'Balanced',
                tone: 'bg-amber-50 text-amber-600 border-amber-100',
                bar: 'bg-amber-500'
            };
        }

        return {
            label: 'Surplus',
            tone: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            bar: 'bg-emerald-500'
        };
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'TBD';
        if (typeof dateStr === 'string' && window.Date.parse(dateStr) !== window.Date.parse(dateStr)) {
            return dateStr;
        }
        const date = new window.Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const formatTransitionDate = (dateStr) => {
        if (!dateStr) return 'TBD';
        const date = new window.Date(dateStr);
        if (Number.isNaN(date.getTime())) return 'TBD';
        return date.toLocaleDateString('en-GB');
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name
            .split(' ')
            .filter(Boolean)
            .map((part) => part[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    const getDaysRemaining = (dateStr) => {
        if (!dateStr) return null;
        const diff = new window.Date(dateStr) - new window.Date();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days;
    };

    const trendPeak = recentTrends.length > 0 ? Math.max(...recentTrends.map((item) => item.value || 0)) : 0;
    const trendAverage = recentTrends.length > 0
        ? Math.round(recentTrends.reduce((sum, item) => sum + (item.value || 0), 0) / recentTrends.length)
        : 0;
    const trendLatest = recentTrends.length > 0 ? recentTrends[recentTrends.length - 1]?.value || 0 : 0;
    const selectedTrend = selectedTrendIndex !== null ? recentTrends[selectedTrendIndex] : null;
    const previousTrend = selectedTrendIndex !== null && selectedTrendIndex > 0 ? recentTrends[selectedTrendIndex - 1] : null;
    const trendDelta = selectedTrend && previousTrend ? (selectedTrend.value || 0) - (previousTrend.value || 0) : null;

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[400px]" id="dashboard-operational-insights">
            {/* Tab Header */}
            <div className="px-5 pt-4 pb-2 border-b border-gray-50 bg-slate-50/30">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-2">
                    <h3 className="text-base font-bold text-slate-800 tracking-tight">{contextLabel} Highlights</h3>
                    <div className="flex bg-slate-100 p-0.5 rounded-xl overflow-x-auto no-scrollbar">
                        {[
                            { id: 'availability', label: 'Releases', icon: Calendar },
                            { id: 'utilization', label: 'Utilization', icon: TrendingUp },
                            { id: 'transitions', label: 'Transitions', icon: Activity },
                            { id: 'optimization', label: 'Bench Aging', icon: Clock },
                            { id: 'certifications', label: 'Certificates', icon: Award },
                            { id: 'growth', label: 'Growth Trends', icon: BarChart2 },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <tab.icon size={11} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-5">
                    {activeTab === 'availability' && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">People finishing projects in the next 30 days</p>}
                    {activeTab === 'utilization' && (
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setUtilizationSubTab('employee')}
                                className={`text-[9px] font-black uppercase tracking-widest transition-colors ${utilizationSubTab === 'employee' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-500'}`}
                            >
                                Hardest Working People
                            </button>
                            <div className="w-px h-2 bg-slate-200"></div>
                            <button
                                onClick={() => setUtilizationSubTab('project')}
                                className={`text-[9px] font-black uppercase tracking-widest transition-colors ${utilizationSubTab === 'project' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-500'}`}
                            >
                                Most Active Projects
                            </button>
                        </div>
                    )}
                    {activeTab === 'transitions' && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Recent project changes: where people moved from and where they went</p>}
                    {activeTab === 'optimization' && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Available people sorted by how long they've been waiting for a project</p>}
                    {activeTab === 'certifications' && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">People whose certificates are expiring soon</p>}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-1">

                {/* ---- RELEASES TAB ---- */}
                {activeTab === 'availability' && (
                    <table className="w-full">
                        <thead className="sticky top-0 bg-white z-10">
                            <tr className="text-[9px] font-black tracking-widest text-slate-400 uppercase border-b border-gray-50">
                                <th className="text-left py-2 px-5">Employee</th>
                                <th className="text-center py-2">Project</th>
                                <th className="text-center py-2">Release Date</th>
                                <th className="text-right py-2 px-5">Alloc %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {availability.length > 0 ? availability.map((row, idx) => {
                                const days = getDaysRemaining(row.releaseDate);
                                const urgency = days !== null && days <= 7
                                    ? 'bg-rose-50 text-rose-600 border-rose-100'
                                    : days <= 14
                                        ? 'bg-amber-50 text-amber-600 border-amber-100'
                                        : 'bg-blue-50 text-blue-600 border-blue-100';
                                return (
                                    <tr key={idx} className="group hover:bg-slate-50 transition-colors cursor-pointer"
                                        onClick={() => navigate('/info/employees/list', { state: { search: row.name, showBack: true } })}>
                                        <td className="py-2.5 px-5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-[8px] font-black text-blue-600 border border-blue-100">
                                                    {getInitials(row.name)}
                                                </div>
                                                <span className="font-bold text-slate-800 text-xs tracking-tight">{row.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-2.5 text-center">
                                            <span className="font-bold text-slate-600 text-[10px] truncate max-w-[100px] inline-block">{row.project}</span>
                                        </td>
                                        <td className="py-2.5 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black border ${urgency}`}>
                                                {formatDate(row.releaseDate)}{days !== null ? ` (${days}d)` : ''}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-5 text-right">
                                            <span className="text-slate-700 font-mono font-bold text-xs">{row.availability}%</span>
                                        </td>
                                    </tr>
                                );
                            }) : <EmptyTable icon={Calendar} message="No upcoming releases in 30 days." />}
                        </tbody>
                    </table>
                )}

                {activeTab === 'utilization' && utilizationSubTab === 'employee' && (
                    <table className="w-full">
                        <thead className="sticky top-0 bg-white z-10">
                            <tr className="text-[9px] font-black tracking-widest text-slate-400 uppercase border-b border-gray-50">
                                <th className="text-left py-2 px-5">Employee</th>
                                <th className="text-center py-2">Role</th>
                                <th className="text-right py-2 px-5">Alloc %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {highUtilizationEmployee.length > 0 ? highUtilizationEmployee.map((row, idx) => (
                                <tr key={idx} className="group hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate(`/info/employee/${row.id}`, { state: { from: { pathname: location.pathname, search: location.search, hash: location.hash, state: location.state || null } } })}>
                                    <td className="py-2.5 px-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-500 border border-slate-200 uppercase">
                                                {row.avatar}
                                            </div>
                                            <span className="font-bold text-slate-800 text-xs uppercase tracking-tight">{row.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-2.5 text-center">
                                        <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-500 text-[9px] font-black border border-slate-100 uppercase">
                                            {row.role}
                                        </span>
                                    </td>
                                    <td className="py-2.5 px-5 text-right">
                                        <span className="text-blue-600 font-black text-[11px]">{row.allocation}%</span>
                                    </td>
                                </tr>
                            )) : <EmptyTable icon={TrendingUp} message="No highly allocated employees found." colSpan={3} />}
                        </tbody>
                    </table>
                )}

                {activeTab === 'utilization' && utilizationSubTab === 'project' && (
                    <table className="w-full">
                        <thead className="sticky top-0 bg-white z-10">
                            <tr className="text-[9px] font-black tracking-widest text-slate-400 uppercase border-b border-gray-50">
                                <th className="text-left py-2 px-5">Project</th>
                                <th className="text-center py-2">Resources</th>
                                <th className="text-right py-2 px-5">Overall Util</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {highUtilizationProject.length > 0 ? highUtilizationProject.map((row, idx) => (
                                <tr key={idx} className="group hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate('/info/projects')}>
                                    <td className="py-2.5 px-5">
                                        <span className="font-bold text-slate-800 text-xs uppercase tracking-tight">{row.name}</span>
                                    </td>
                                    <td className="py-2.5 text-center">
                                        <span className="text-slate-600 font-bold text-xs">{row.resources} Members</span>
                                    </td>
                                    <td className="py-2.5 px-5 text-right">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${row.utilization >= 90 ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500'}`}>
                                            {row.utilization}%
                                        </span>
                                    </td>
                                </tr>
                            )) : <EmptyTable icon={BarChart2} message="No high allocation projects found." colSpan={3} />}
                        </tbody>
                    </table>
                )}

                {activeTab === 'transitions' && (
                    <table className="w-full">
                        <thead className="sticky top-0 bg-white z-10">
                            <tr className="text-[9px] font-black tracking-widest text-slate-400 uppercase border-b border-gray-50">
                                <th className="text-left py-2 px-5">Employee</th>
                                <th className="text-center py-2">Movement</th>
                                <th className="text-right py-2 px-5">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {transitions.length > 0 ? transitions.map((row, idx) => (
                                <tr key={idx} className="group hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate('/info/employees/list', { state: { search: row.employee, showBack: true } })}>
                                    <td className="py-2.5 px-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-[8px] font-black text-blue-600 border border-blue-100">
                                                {getInitials(row.employee)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800 text-xs tracking-tight leading-none mb-0.5">{row.employee}</span>
                                                <span className="text-[8px] text-slate-400 font-black uppercase tracking-tighter">{row.role}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-2.5 text-center">
                                        <div className="inline-flex max-w-[180px] items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-2 py-1 text-[9px] font-black text-slate-700">
                                            <span className="truncate max-w-[62px]" title={row.fromProject || 'Bench'}>{row.fromProject || 'Bench'}</span>
                                            <ArrowRightLeft size={11} className="text-blue-500 flex-shrink-0" />
                                            <span className="truncate max-w-[62px]" title={row.toProject || 'Unknown'}>{row.toProject || 'Unknown'}</span>
                                        </div>
                                    </td>
                                    <td className="py-2.5 px-5 text-right">
                                        <span className="text-slate-400 font-mono text-[9px] font-bold">{formatTransitionDate(row.date)}</span>
                                    </td>
                                </tr>
                            )) : <EmptyTable icon={History} message="No recent transitions." colSpan={3} />}
                        </tbody>
                    </table>
                )}

                {activeTab === 'optimization' && (
                    <table className="w-full">
                        <thead className="sticky top-0 bg-white z-10">
                            <tr className="text-[9px] font-black tracking-widest text-slate-400 uppercase border-b border-gray-50">
                                <th className="text-left py-2 px-5">Resource (2026 Sentiment)</th>
                                <th className="text-center py-2">Bench Sentinel</th>
                                <th className="text-right py-2 px-5">Pulse Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {benchAging.length > 0 ? benchAging.map((row, idx) => (
                                <tr key={idx} className="group hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate('/info/employees/list', { state: { search: row.name, showBack: true } })}>
                                    <td className="py-2.5 px-5">
                                        <span className="font-bold text-slate-800 text-[11px] uppercase tracking-tight leading-none">{row.name}</span>
                                    </td>
                                    <td className="py-2.5 text-center px-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-tight">
                                                <span className={row.days_in_year > 30 ? 'text-rose-600' : 'text-blue-600'}>
                                                    {row.days_in_year} Days in 2026
                                                </span>
                                                <span className="text-slate-400">{row.year_percentage}%</span>
                                            </div>
                                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-500 ${row.days_in_year > 30 ? 'bg-rose-500' : 'bg-blue-500'}`}
                                                    style={{ width: `${row.year_percentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-2.5 px-5 text-right">
                                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase shadow-sm border ${row.days_in_year > 30 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                            {row.days_in_year > 30 ? 'Deployment Critical' : 'Recent Bench'}
                                        </span>
                                    </td>
                                </tr>
                            )) : <EmptyTable icon={Clock} message="All resources are currently active." colSpan={3} />}
                        </tbody>
                    </table>
                )}

                {activeTab === 'certifications' && (
                    <table className="w-full">
                        <thead className="sticky top-0 bg-white z-10">
                            <tr className="text-[9px] font-black tracking-widest text-slate-400 uppercase border-b border-gray-50">
                                <th className="text-left py-2 px-5">Name</th>
                                <th className="text-right py-2 px-5">Expiry</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {certifications.length > 0 ? certifications.map((row, idx) => (
                                <tr key={idx} className="group hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate('/info/employees/list', { state: { search: row.employee || row.name, showBack: true } })}>
                                    <td className="py-2.5 px-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center text-[8px] font-black text-amber-600 border border-amber-100">
                                                {getInitials(row.employee || row.name)}
                                            </div>
                                            <span className="font-bold text-slate-800 text-xs tracking-tight">{row.employee || row.name || 'Unknown'}</span>
                                        </div>
                                    </td>
                                    <td className="py-2.5 px-5 text-right">
                                        <span className="text-slate-400 font-mono text-[9px] font-bold">{formatDate(row.expiryDate || row.expiry_date)}</span>
                                    </td>
                                </tr>
                            )) : <EmptyTable icon={Award} message="No certification expiry records." colSpan={2} />}
                        </tbody>
                    </table>
                )}

                {activeTab === 'growth' && (
                    <div className="p-5 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mb-1">Utilization Speed</span>
                                <h4 className="text-xl font-black text-slate-800 tracking-tighter">
                                    {trendLatest}% <span className={`text-xs ml-1 ${trendDelta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {trendDelta >= 0 ? '+' : ''}{trendDelta}%
                                    </span>
                                </h4>
                            </div>
                            <div className="flex gap-2">
                                <div className="px-3 py-1 bg-slate-50 rounded-lg border border-slate-100 flex flex-col items-center">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Peak</span>
                                    <span className="text-xs font-bold text-slate-700">{trendPeak}%</span>
                                </div>
                                <div className="px-3 py-1 bg-slate-50 rounded-lg border border-slate-100 flex flex-col items-center">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Avg</span>
                                    <span className="text-xs font-bold text-slate-700">{trendAverage}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col gap-3">
                            {recentTrends.length > 0 ? recentTrends.map((trend, idx) => (
                                <div 
                                    key={idx}
                                    onClick={() => setSelectedTrendIndex(idx)}
                                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${selectedTrendIndex === idx ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${selectedTrendIndex === idx ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-slate-100 text-slate-400'}`}>
                                                <TrendingUp size={14} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{trend.month} Status</span>
                                                <span className="text-xs font-bold text-slate-800">Growth Progress</span>
                                            </div>
                                        </div>
                                        <span className={`text-sm font-black ${selectedTrendIndex === idx ? 'text-blue-600' : 'text-slate-700'}`}>
                                            {trend.value}%
                                        </span>
                                    </div>
                                </div>
                            )) : <EmptyTable icon={BarChart2} message="Insufficient trend data available." colSpan={1} />}
                        </div>
                    </div>
                )}

                {activeTab === 'riskboard' && (() => {
                    const suggestions = [
                        { priority: 'High', color: 'rose', icon: ShieldAlert, title: 'Assign min. 3 resources to active projects', detail: 'Projects under 3 members are Medium/High risk. Redeploy bench resources to under-staffed projects immediately.' },
                        { priority: 'High', color: 'rose', icon: AlertCircle, title: 'Set delivery deadlines on all running projects', detail: 'No end_date means no proximity risk detection. Ensure end_date is populated for every active project.' },
                        { priority: 'Medium', color: 'amber', icon: Clock, title: 'Auto-alert when health drops below 60%', detail: 'Create email or Slack notifications when a health score crosses 60% to enable proactive intervention before it escalates.' },
                        { priority: 'Medium', color: 'amber', icon: TrendingUp, title: 'Track risk trend weekly (snapshot)', detail: 'Store weekly health snapshots to show trend lines: improving vs. deteriorating projects over a rolling 8-week window.' },
                        { priority: 'Low', color: 'emerald', icon: CheckCircle2, title: 'Link risk score to budget utilization', detail: 'Blend resource count + budget consumption % into a composite delivery risk score per project for richer insight.' },
                        { priority: 'Low', color: 'emerald', icon: Award, title: 'Allow manual risk overrides with comments', detail: 'Let PMs flag a project as Accepted Risk so acknowledged risks stay off the High-risk board.' },
                    ];
                    const bgMap = { rose: 'bg-rose-50 border-rose-100', amber: 'bg-amber-50 border-amber-100', emerald: 'bg-emerald-50 border-emerald-100' };
                    const textMap = { rose: 'text-rose-600', amber: 'text-amber-600', emerald: 'text-emerald-600' };
                    const badgeMap = { rose: 'bg-rose-100 text-rose-700', amber: 'bg-amber-100 text-amber-700', emerald: 'bg-emerald-100 text-emerald-700' };
                    return (
                        <div className="p-3 flex flex-col gap-2.5">
                            {suggestions.map((s, i) => {
                                const Icon = s.icon;
                                return (
                                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${bgMap[s.color]}`}>
                                        <div className={`mt-0.5 flex-shrink-0 ${textMap[s.color]}`}><Icon size={15} /></div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className="text-[11px] font-bold text-slate-800 leading-snug">{s.title}</p>
                                                <span className={`flex-shrink-0 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${badgeMap[s.color]}`}>{s.priority}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 leading-relaxed">{s.detail}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}
            </div >

            <div className="px-5 py-3 bg-slate-50/50 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> Immediate Action Required</span>
                </div>
                <div className="text-[10px] font-black text-blue-600 flex items-center gap-1 uppercase tracking-tighter cursor-pointer hover:underline" onClick={() => navigate('/info/employees/list')}>
                    Full Analytics <ArrowUpRight size={12} />
                </div>
            </div>
        </div >
    );
};

const EmptyTable = ({ icon: Icon, message, colSpan = 4 }) => (
    <tr>
        <td colSpan={colSpan}>
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3 border border-slate-100">
                    <Icon size={24} className="opacity-20 text-slate-400" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest">{message}</p>
                <p className="text-[9px] font-medium mt-0.5">Check back later for updates</p>
            </div>
        </td>
    </tr>
);

export default DashboardTables;
