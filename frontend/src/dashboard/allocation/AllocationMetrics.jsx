import React from 'react';
import { Users, UserCheck, Activity, UserMinus, TrendingUp, AlertCircle } from 'lucide-react';

const MetricCard = ({ label, value, subtext, icon: Icon, isAlert, isHighlighted, onClick, colorClass = "bg-slate-50 text-slate-500", tooltip }) => (
    <div
        className={`rounded-2xl p-4 border transition-all duration-300 flex flex-col justify-between min-h-[100px] shadow-sm hover:shadow-md relative group ${
            onClick ? 'cursor-pointer hover:border-blue-300 hover:bg-blue-50/30' : 'cursor-default'
        } ${isHighlighted
            ? 'ring-4 ring-red-400 border-red-500 scale-105 shadow-xl z-10 bg-white'
            : isAlert
            ? 'border-red-100 bg-red-50/30'
            : 'bg-white border-slate-200'
        }`}
        onClick={onClick}
    >
        <div className="flex items-center justify-between w-full mb-3">
            <div className={`text-2xl font-extrabold transition-colors ${isHighlighted || isAlert ? 'text-red-600' : 'text-slate-900 group-hover:text-blue-700'}`}>
                {value}
            </div>
            <div className={`p-2 rounded-xl transition-all ${isHighlighted || isAlert ? 'bg-red-100 text-red-600' : `${colorClass} group-hover:bg-blue-100 group-hover:text-blue-700`}`}>
                <Icon size={20} strokeWidth={2.5} />
            </div>
        </div>
        <div className="flex flex-col">
            <div className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isHighlighted || isAlert ? 'text-red-500' : 'text-slate-500 group-hover:text-blue-600/80'}`}>
                {label}
            </div>
        </div>
        {(isAlert || isHighlighted) && <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>}
        {tooltip && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-900 text-white text-xs rounded-xl px-3 py-2.5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 shadow-xl">
                {tooltip}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
            </div>
        )}
    </div>
);

const AllocationMetrics = ({ metrics, highlightTag, onMetricClick }) => {
    if (!metrics) return null;

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
            <MetricCard label="Total Resources" value={metrics.totalResources.value} icon={Users} colorClass="bg-slate-50 text-slate-500" />
            <MetricCard label="Billable Count" value={metrics.billable.value} icon={UserCheck} colorClass="bg-blue-50 text-blue-500" />
            <MetricCard label="Non-Billable" value={metrics.nonBillable.value} icon={Activity} colorClass="bg-emerald-50 text-emerald-500" />
            <MetricCard label="Bench Strength" value={metrics.benchStrength.value} icon={UserMinus} colorClass="bg-rose-50 text-rose-500" />
            <MetricCard
                label="Avg Utilization"
                value={metrics.avgUtilization.value}
                icon={TrendingUp}
                colorClass="bg-emerald-50 text-emerald-500"
                tooltip={
                    <div className="space-y-1.5">
                        <div className="font-semibold text-emerald-300 text-[11px] uppercase tracking-wide">Formula</div>
                        <div className="font-mono text-[11px] leading-relaxed">
                            (Allocated ÷ Total) × 100
                        </div>
                        <div className="border-t border-slate-700 pt-1.5 text-slate-300 text-[10px] leading-relaxed">
                            <span className="text-white font-medium">Allocated</span> = employees with active billable or non-billable allocation (excl. notice period)
                        </div>
                    </div>
                }
            />
            <MetricCard label="Overallocated" value={metrics.overallocated.value} icon={AlertCircle} isAlert={true} isHighlighted={highlightTag === 'overallocated'} onClick={() => onMetricClick?.('overallocated')} />
        </div>
    );
};

export default AllocationMetrics;
