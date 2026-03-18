import React, { useState, useEffect } from 'react';
import {
    Calendar,
    Award,
    ChevronRight,
    Clock,
    CheckCircle2,
    AlertCircle,
    ArrowUpRight,
    Search,
    Activity,
    ShieldCheck,
    History,
    TrendingUp,
    Lightbulb,
    ShieldAlert
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DashboardTables = ({ availability = [], skillsGap = [], transitions = [], certifications = [], benchAging = [], trends = [], forcedTab = null }) => {
    const [activeTab, setActiveTab] = useState('availability');
    const navigate = useNavigate();

    useEffect(() => {
        if (forcedTab) {
            setActiveTab(forcedTab);
        }
    }, [forcedTab]);

    const getGapColor = (gap) => {
        switch (gap?.toLowerCase()) {
            case 'high': return 'bg-rose-50 text-rose-600 border-rose-100';
            case 'medium': return 'bg-amber-50 text-amber-600 border-amber-100';
            default: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'TBD';
        const date = new window.Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getDaysRemaining = (dateStr) => {
        if (!dateStr) return null;
        const diff = new window.Date(dateStr) - new window.Date();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days;
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[400px]" id="dashboard-operational-insights">
            {/* Tab Header */}
            <div className="px-5 pt-4 pb-2 border-b border-gray-50 bg-slate-50/30">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-2">
                    <h3 className="text-base font-bold text-slate-800 tracking-tight">Intelligence Hub</h3>
                    <div className="flex bg-slate-100 p-0.5 rounded-xl overflow-x-auto no-scrollbar">
                        {[
                            { id: 'availability', label: 'Releases', icon: Calendar },
                            { id: 'skills', label: 'Skills Gap', icon: Award },
                            { id: 'transitions', label: 'Transitions', icon: Activity },
                            { id: 'optimization', label: 'Bench Aging', icon: Clock },
                            { id: 'trends', label: 'Growth Trends', icon: TrendingUp },
                            { id: 'riskboard', label: 'Risk Insights', icon: Lightbulb },
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
                    {activeTab === 'availability' && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Resources rolling off projects in 30 days</p>}
                    {activeTab === 'skills' && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Talent supply vs. project demand gap</p>}
                    {activeTab === 'transitions' && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Last 5 resource movements</p>}
                    {activeTab === 'optimization' && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Idle resources sorted by priority</p>}
                    {activeTab === 'trends' && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">6-Month historical billable growth</p>}
                    {activeTab === 'riskboard' && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Actionable improvements for delivery risk</p>}
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
                                                    {row.name ? row.name.split(' ').map(n => n[0]).join('') : '?'}
                                                </div>
                                                <span className="font-bold text-slate-800 text-xs uppercase tracking-tight truncate max-w-[90px]">{row.name}</span>
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

                {activeTab === 'skills' && (
                    <table className="w-full">
                        <thead className="sticky top-0 bg-white z-10">
                            <tr className="text-[9px] font-black tracking-widest text-slate-400 uppercase border-b border-gray-50">
                                <th className="text-left py-2 px-5">Skill</th>
                                <th className="text-center py-2">Demand / supply</th>
                                <th className="text-right py-2 px-5">Gap</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {skillsGap.length > 0 ? skillsGap.map((row, idx) => (
                                <tr key={idx} className="group hover:bg-slate-50 transition-colors">
                                    <td className="py-2.5 px-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-slate-50 border border-gray-100 flex items-center justify-center text-blue-500">
                                                <Award size={14} />
                                            </div>
                                            <span className="font-bold text-slate-800 text-xs uppercase tracking-tight">{row.skill}</span>
                                        </div>
                                    </td>
                                    <td className="py-2.5 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="flex items-center gap-1 text-[8px] mb-1 font-black uppercase text-slate-400">
                                                <span className="text-slate-700">{row.demand}</span> / <span className="text-blue-600">{row.certified}</span>
                                            </div>
                                            <div className="w-20 h-0.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-700 ${row.gap === 'high' ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (row.certified / Math.max(row.demand, 1)) * 100)}%` }}></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-2.5 px-5 text-right">
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${getGapColor(row.gap)}`}>{row.gap} GAP</span>
                                    </td>
                                </tr>
                            )) : <EmptyTable icon={Award} message="No skill gap data." />}
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
                                                {row.employee.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800 text-xs uppercase tracking-tight leading-none mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]">{row.employee}</span>
                                                <span className="text-[8px] text-slate-400 font-black uppercase tracking-tighter truncate max-w-[80px]">{row.role}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-2.5 text-center">
                                        <span className="font-bold text-slate-700 text-[10px] font-mono leading-none truncate max-w-[100px] inline-block">{row.project}</span>
                                    </td>
                                    <td className="py-2.5 px-5 text-right">
                                        <span className="text-slate-400 font-mono text-[9px] font-bold">{formatDate(row.date)}</span>
                                    </td>
                                </tr>
                            )) : <EmptyTable icon={History} message="No recent transitions." />}
                        </tbody>
                    </table>
                )}

                {activeTab === 'optimization' && (
                    <table className="w-full">
                        <thead className="sticky top-0 bg-white z-10">
                            <tr className="text-[9px] font-black tracking-widest text-slate-400 uppercase border-b border-gray-50">
                                <th className="text-left py-2 px-5">Resource</th>
                                <th className="text-center py-2">Idle Time</th>
                                <th className="text-right py-2 px-5">Risk</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {benchAging.length > 0 ? benchAging.map((row, idx) => (
                                <tr key={idx} className="group hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate('/info/employees/list', { state: { search: row.name, showBack: true } })}>
                                    <td className="py-2.5 px-5">
                                        <span className="font-bold text-slate-800 text-xs uppercase tracking-tight leading-none">{row.name}</span>
                                    </td>
                                    <td className="py-2.5 text-center">
                                        <span className="text-[11px] font-bold text-slate-700 font-mono leading-none">{row.days} Days</span>
                                    </td>
                                    <td className="py-2.5 px-5 text-right">
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${row.days > 30 ? 'bg-rose-50 text-rose-500 border-rose-100' : row.days > 15 ? 'bg-amber-50 text-amber-500 border-amber-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'}`}>
                                            {row.days > 30 ? 'CRITICAL' : row.days > 15 ? 'MODERATE' : 'STRICT'}
                                        </span>
                                    </td>
                                </tr>
                            )) : <EmptyTable icon={Clock} message="All resources are currently active." />}
                        </tbody>
                    </table>
                )}

                {activeTab === 'trends' && (
                    <div className="p-8">
                        <div className="flex flex-col gap-6">
                            {(trends || []).map((t, i) => (
                                <div key={i} className="flex items-center justify-between group">
                                    <div className="w-16">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.month}</span>
                                    </div>
                                    <div className="flex-1 px-4">
                                        <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden border border-gray-50">
                                            <div
                                                className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                                                style={{ width: `${(t.value / Math.max(...(trends?.map(x => x.value) || [1]), 1)) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="w-10 text-right">
                                        <span className="text-[11px] font-bold text-slate-800 font-mono">{t.value}</span>
                                    </div>
                                </div>
                            ))}
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
            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> Crit</span>
            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Mod</span>
            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Stable</span>
        </div>
        <button onClick={() => navigate('/info/allocation', { state: { showBack: true } })} className="text-[10px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 uppercase tracking-tighter group transition-all">
            Full Analytics <ArrowUpRight size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
    </div>
        </div >
    );
};

const EmptyTable = ({ icon: Icon, message }) => (
    <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3 border border-slate-100">
            <Icon size={24} className="opacity-20 text-slate-400" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest">{message}</p>
        <p className="text-[9px] font-medium mt-0.5">Check back later for updates</p>
    </div>
);

export default DashboardTables;
