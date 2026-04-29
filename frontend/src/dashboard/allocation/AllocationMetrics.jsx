import React from 'react';
import { Users, UserCheck, Activity, UserMinus, TrendingUp, AlertCircle } from 'lucide-react';

const MetricCard = ({ label, value, subtext, icon: Icon, isAlert, isHighlighted, onClick }) => (
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
            <div className={`p-2 rounded-xl transition-all ${isHighlighted || isAlert ? 'bg-red-100 text-red-600' : 'bg-slate-50 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-700'}`}>
                <Icon size={20} strokeWidth={2.5} />
            </div>
        </div>
        <div className="flex flex-col">
            <div className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isHighlighted || isAlert ? 'text-red-500' : 'text-slate-500 group-hover:text-blue-600/80'}`}>
                {label}
            </div>
            {onClick && <div className="text-[9px] text-red-400 font-semibold mt-0.5">Click to view →</div>}
        </div>
        {(isAlert || isHighlighted) && <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>}
    </div>
);

const AllocationMetrics = ({ metrics, highlightTag, onOverallocatedClick }) => {
    if (!metrics) return null;

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
            <MetricCard label="Total Resources" value={metrics.totalResources.value} icon={Users} />
            <MetricCard label="Billable Count" value={metrics.billable.value} icon={UserCheck} />
            <MetricCard label="Non-Billable" value={metrics.nonBillable.value} icon={Activity} />
            <MetricCard label="Bench Strength" value={metrics.benchStrength.value} icon={UserMinus} />
            <MetricCard label="Avg Utilization" value={metrics.avgUtilization.value} icon={TrendingUp} />
            <MetricCard label="Overallocated" value={metrics.overallocated.value} icon={AlertCircle} isAlert={true} isHighlighted={highlightTag === 'overallocated'} onClick={onOverallocatedClick} />
        </div>
    );
};



export default AllocationMetrics;
