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
    CheckCircle2,
    User,
    ArrowRight,
    MapPin,
    Zap,
    Timer
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
    forecast = [],
    forcedTab = null,
    contextLabel = 'Organization'
}) => {
    const navigate = useNavigate();

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

    return (
        <div className="w-full space-y-4" id="dashboard-operational-insights">
            <div className="flex items-center justify-between px-2">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        {contextLabel} Operational Highlights
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                        REAL-TIME METRICS ACROSS CORE WORKFORCE DOMAINS
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* 1. Upcoming Releases */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[480px] overflow-hidden">
                    <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Calendar size={14} /></div>
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Upcoming Releases</h4>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {availability.length > 0 ? availability.map((row, idx) => {
                            const days = getDaysRemaining(row.releaseDate);
                            return (
                                <div key={idx} className="p-2 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all cursor-pointer" onClick={() => navigate('/info/employees/list', { state: { search: row.name, showBack: true } })}>
                                    <div className="flex justify-between items-start">
                                        <span className="font-bold text-slate-800 text-[11px] truncate w-24" title={row.name}>{row.name}</span>
                                        <span className={`text-[9px] font-black ${days <= 7 ? 'text-rose-500' : 'text-blue-500'}`}>{days}d</span>
                                    </div>
                                    <p className="text-[9px] text-slate-400 truncate mt-0.5">{row.project}</p>
                                </div>
                            );
                        }) : <EmptyMiniState message="No releases" />}
                    </div>
                </div>

                {/* 2. Top Utilization */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[480px] overflow-hidden">
                    <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><Zap size={14} /></div>
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Top Utilization</h4>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                        {highUtilizationEmployee.length > 0 ? highUtilizationEmployee.slice(0, 5).map((row, idx) => (
                            <div key={idx} className="space-y-1">
                                <div className="flex justify-between items-end">
                                    <span className="font-bold text-slate-800 text-[11px] truncate w-24" title={row.name}>{row.name}</span>
                                    <span className="text-[10px] font-black text-emerald-600">{row.allocation}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${row.allocation}%` }}></div>
                                </div>
                            </div>
                        )) : <EmptyMiniState message="No utilization data" />}
                    </div>
                </div>

                {/* 3. Recent Movements */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[480px] overflow-hidden">
                    <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg"><Activity size={14} /></div>
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Recent Movements</h4>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
                        {transitions.length > 0 ? transitions.map((row, idx) => (
                            <div key={idx} className="relative pl-4 border-l border-indigo-100">
                                <div className="absolute -left-1 top-0 w-2 h-2 rounded-full bg-indigo-500"></div>
                                <h5 className="font-bold text-slate-800 text-[10px] leading-none mb-1">{row.employee}</h5>
                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500">
                                    <span className="truncate w-12">{row.fromProject || 'Bench'}</span>
                                    <ArrowRight size={10} className="text-slate-300" />
                                    <span className="text-indigo-600 truncate w-12">{row.toProject}</span>
                                </div>
                            </div>
                        )) : <EmptyMiniState message="No movements" />}
                    </div>
                </div>

                {/* 4. Bench Aging */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[480px] overflow-hidden">
                    <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
                        <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg"><Timer size={14} /></div>
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Bench Aging</h4>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                        {benchAging.length > 0 ? benchAging.map((row, idx) => (
                            <div key={idx} className="group">
                                <div className="flex justify-between items-end mb-1">
                                    <span className="font-bold text-slate-800 text-[11px] truncate w-24" title={row.name}>{row.name}</span>
                                    <span className={`text-[10px] font-black ${row.days_in_year > 30 ? 'text-rose-600' : 'text-slate-500'}`}>{row.days_in_year}d</span>
                                </div>
                                <div className="h-1 w-full bg-slate-50 rounded-full overflow-hidden">
                                    <div className={`h-full ${row.days_in_year > 30 ? 'bg-rose-500' : 'bg-slate-300'}`} style={{ width: `${Math.min(100, (row.days_in_year / 60) * 100)}%` }}></div>
                                </div>
                            </div>
                        )) : <EmptyMiniState message="No bench aging" />}
                    </div>
                </div>

                {/* 5. Certificates */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[480px] overflow-hidden">
                    <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
                        <div className="p-1.5 bg-teal-100 text-teal-600 rounded-lg"><Award size={14} /></div>
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Certificates</h4>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                        {certifications.length > 0 ? certifications.map((row, idx) => (
                            <div key={idx} className="p-2 rounded-xl bg-teal-50/30 border border-teal-100">
                                <h5 className="font-bold text-slate-800 text-[10px] truncate" title={row.name}>{row.name}</h5>
                                <p className="text-[9px] font-bold text-teal-600 mt-0.5 truncate" title={row.certificate}>{row.certificate}</p>
                                <p className="text-[8px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">Expires: {new window.Date(row.expiryDate).toLocaleDateString()}</p>
                            </div>
                        )) : <EmptyMiniState message="No certificate expiries" />}
                    </div>
                </div>
            </div>

            {/* Footer Status */}
            <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-200"></div>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">
                        Immediate Action Required
                    </span>
                </div>
            </div>
        </div>
    );
};

const EmptyMiniState = ({ message }) => (
    <div className="flex flex-col items-center justify-center h-full py-8 text-slate-300">
        <p className="text-[10px] font-bold uppercase tracking-widest">{message}</p>
    </div>
);

export default DashboardTables;
